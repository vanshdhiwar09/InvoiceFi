const express = require('express');
const crypto = require('crypto');
const { supabase } = require('./supabase');
const config = require('./config');

const app = express();

// Enable JSON body parser with 10MB limit for private invoice metadata and document payloads
app.use(express.json({ limit: '10mb' }));

// CORS middleware for frontend communication
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// GET /health - Server liveness check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// GET /health/db - Database connectivity check (Read-only)
app.get('/health/db', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('sync_state')
      .select('key, value')
      .limit(1);

    if (error) {
      throw error;
    }

    res.status(200).json({
      status: 'UP',
      database: 'CONNECTED',
      timestamp: new Date().toISOString(),
      checkpoint_present: data && data.length > 0
    });
  } catch (err) {
    console.error('Database connection check failed:', err.message);
    const dbError = new Error('Database connection failed');
    dbError.status = 503;
    dbError.details = config.isProduction ? 'Unable to reach backend database' : err.message;
    next(dbError);
  }
});

/**
 * POST /api/invoices/metadata
 * Receives private invoice metadata and optional document, validates financial invariants,
 * uploads document to private Supabase Storage, generates an opaque non-PII client_ref,
 * and persists record in Supabase invoices table.
 */
app.post('/api/invoices/metadata', async (req, res, next) => {
  try {
    const {
      client_name,
      client_email,
      freelancer_address,
      face_value,
      funding_amount,
      due_date,
      client_organization,
      description,
      document
    } = req.body;

    // 1. Validate required fields
    if (!client_name || typeof client_name !== 'string' || !client_name.trim()) {
      return res.status(400).json({ error: 'Bad Request', message: 'client_name is required' });
    }
    if (!client_email || typeof client_email !== 'string' || !client_email.includes('@')) {
      return res.status(400).json({ error: 'Bad Request', message: 'Valid client_email is required' });
    }
    if (!freelancer_address || typeof freelancer_address !== 'string' || !freelancer_address.startsWith('G') || freelancer_address.length !== 56) {
      return res.status(400).json({ error: 'Bad Request', message: 'Valid Stellar freelancer_address (56-char public key) is required' });
    }

    // 2. Validate financial invariants
    const faceVal = Number(face_value);
    const fundAmt = Number(funding_amount);

    if (isNaN(faceVal) || faceVal <= 0) {
      return res.status(400).json({ error: 'Bad Request', message: 'face_value must be a positive number' });
    }
    if (isNaN(fundAmt) || fundAmt <= 0) {
      return res.status(400).json({ error: 'Bad Request', message: 'funding_amount must be a positive number' });
    }
    if (fundAmt >= faceVal) {
      return res.status(400).json({ error: 'Bad Request', message: 'funding_amount must be strictly less than face_value' });
    }

    // 3. Validate due date
    const due = new Date(due_date);
    const now = new Date();
    const oneYearOut = new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000);

    if (isNaN(due.getTime()) || due <= now) {
      return res.status(400).json({ error: 'Bad Request', message: 'due_date must be a valid future date' });
    }
    if (due > oneYearOut) {
      return res.status(400).json({ error: 'Bad Request', message: 'due_date cannot be more than 1 year in the future' });
    }

    // 4. Generate opaque non-PII client_ref
    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(4).toString('hex');
    const clientRef = `clt_ref_${timestamp}_${randomHex}`;

    // 5. Handle optional private document upload
    let documentUrl = null;
    if (document && document.dataBase64) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      const allowedExts = ['pdf', 'jpeg', 'jpg', 'png'];

      const mimeType = (document.type || '').toLowerCase();
      const ext = (document.name || '').split('.').pop().toLowerCase();

      if (!allowedTypes.includes(mimeType) || !allowedExts.includes(ext)) {
        return res.status(400).json({ error: 'Bad Request', message: 'Invoice documents must be PDF, JPG, or PNG format.' });
      }

      const buffer = Buffer.from(document.dataBase64, 'base64');
      const maxBytes = 10 * 1024 * 1024; // 10MB limit
      if (buffer.length > maxBytes) {
        return res.status(400).json({ error: 'Bad Request', message: 'Invoice document must be 10 MB or smaller.' });
      }

      const randomFileId = crypto.randomBytes(6).toString('hex');
      const storagePath = `invoices/${clientRef}/${randomFileId}.${ext}`;

      try {
        const { error: storageErr } = await supabase.storage
          .from('invoice-documents')
          .upload(storagePath, buffer, {
            contentType: mimeType,
            upsert: true
          });

        if (storageErr) {
          console.warn('[Backend Metadata API] Storage warning (proceeding with path reference):', storageErr.message);
        }
        documentUrl = storagePath;
      } catch (stgEx) {
        console.warn('[Backend Metadata API] Storage exception (proceeding with path reference):', stgEx.message);
        documentUrl = storagePath;
      }
    }

    // 6. Insert private invoice metadata into Supabase invoices table
    const invoicePayload = {
      client_ref: clientRef,
      freelancer_address: freelancer_address.trim(),
      client_name: client_name.trim(),
      client_email: client_email.trim(),
      client_organization: client_organization ? client_organization.trim() : null,
      description: description ? description.trim() : null,
      face_value: faceVal.toString(),
      funding_amount: fundAmt.toString(),
      repayment_amount: faceVal.toString(),
      currency: 'XLM',
      due_date: due.toISOString(),
      document_url: documentUrl,
      status: 'CREATED'
    };

    const { data: inserted, error: dbErr } = await supabase
      .from('invoices')
      .insert([invoicePayload])
      .select();

    if (dbErr) {
      console.error('[Backend Metadata API] Database insert error:', dbErr.message);
      return res.status(500).json({ error: 'Internal Server Error', message: `Database error: ${dbErr.message}` });
    }

    // 7. Return clean client_ref and non-sensitive invoice info to frontend
    res.status(201).json({
      success: true,
      client_ref: clientRef,
      invoice: {
        client_ref: clientRef,
        face_value: faceVal,
        funding_amount: fundAmt,
        repayment_amount: faceVal,
        due_date: due.toISOString(),
        document_url: documentUrl,
        status: 'CREATED'
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/invoices/:client_ref/on-chain
 * Maps confirmed Soroban on_chain_id to the off-chain client_ref record.
 */
app.patch('/api/invoices/:client_ref/on-chain', async (req, res, next) => {
  try {
    const { client_ref } = req.params;
    const { on_chain_id } = req.body;

    if (!on_chain_id || isNaN(Number(on_chain_id))) {
      return res.status(400).json({ error: 'Bad Request', message: 'Valid numeric on_chain_id is required' });
    }

    const { data, error } = await supabase
      .from('invoices')
      .update({
        on_chain_id: Number(on_chain_id),
        status: 'CREATED',
        updated_at: new Date().toISOString()
      })
      .eq('client_ref', client_ref)
      .select();

    if (error) {
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: `No invoice record found for client_ref: ${client_ref}` });
    }

    res.status(200).json({
      success: true,
      client_ref,
      on_chain_id: Number(on_chain_id),
      status: 'CREATED'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/invoices/:client_ref/tokenize
 * Updates status to TOKENIZED upon confirmed tokenize_invoice() transaction.
 */
app.patch('/api/invoices/:client_ref/tokenize', async (req, res, next) => {
  try {
    const { client_ref } = req.params;

    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'TOKENIZED',
        updated_at: new Date().toISOString()
      })
      .eq('client_ref', client_ref)
      .select();

    if (error) {
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: `No invoice record found for client_ref: ${client_ref}` });
    }

    res.status(200).json({
      success: true,
      client_ref,
      status: 'TOKENIZED'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/invoices/:id/funded
 * Updates status to FUNDED upon confirmed invest() transaction.
 */
app.patch('/api/invoices/:id/funded', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { investor_address, funding_amount } = req.body || {};

    const cleanId = String(id).replace('INV-', '');
    const numericId = Number(cleanId);
    const isValidNumericId = !isNaN(numericId) && numericId > 0;

    const updatePayload = {
      status: 'FUNDED',
      updated_at: new Date().toISOString()
    };
    if (funding_amount) updatePayload.funding_amount = Number(funding_amount);

    let query = supabase.from('invoices').update(updatePayload);

    if (isValidNumericId) {
      query = query.eq('on_chain_id', numericId);
    } else if (typeof id === 'string' && id.startsWith('clt_ref_')) {
      query = query.eq('client_ref', id);
    } else {
      return res.status(400).json({ error: 'Bad Request', message: 'Valid on_chain_id or client_ref is required' });
    }

    const { data, error } = await query.select();

    if (error) {
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }

    res.status(200).json({
      success: true,
      status: 'FUNDED',
      invoice: data && data.length > 0 ? data[0] : null
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/invoices/:id/repaid
 * Off-chain mirror endpoint to update status to REPAID upon confirmed Soroban repay() transaction.
 */
app.patch('/api/invoices/:id/repaid', async (req, res, next) => {
  try {
    const { id } = req.params;
    const cleanId = String(id).replace('INV-', '');
    const numericId = Number(cleanId);
    const isValidNumericId = !isNaN(numericId) && numericId > 0;

    const updatePayload = {
      status: 'REPAID',
      updated_at: new Date().toISOString()
    };

    let query = supabase.from('invoices').update(updatePayload);

    if (isValidNumericId) {
      query = query.eq('on_chain_id', numericId);
    } else if (typeof id === 'string' && id.startsWith('clt_ref_')) {
      query = query.eq('client_ref', id);
    } else {
      return res.status(400).json({ error: 'Bad Request', message: 'Valid on_chain_id or client_ref is required' });
    }

    const { data, error } = await query.select();

    if (error) {
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }

    res.status(200).json({
      success: true,
      status: 'REPAID',
      invoice: data && data.length > 0 ? data[0] : null
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/invoices/:id/closed
 * Off-chain mirror endpoint to update status to CLOSED upon confirmed Soroban claim_returns() transaction.
 */
app.patch('/api/invoices/:id/closed', async (req, res, next) => {
  try {
    const { id } = req.params;
    const cleanId = String(id).replace('INV-', '');
    const numericId = Number(cleanId);
    const isValidNumericId = !isNaN(numericId) && numericId > 0;

    const updatePayload = {
      status: 'CLOSED',
      updated_at: new Date().toISOString()
    };

    let query = supabase.from('invoices').update(updatePayload);

    if (isValidNumericId) {
      query = query.eq('on_chain_id', numericId);
    } else if (typeof id === 'string' && id.startsWith('clt_ref_')) {
      query = query.eq('client_ref', id);
    } else {
      return res.status(400).json({ error: 'Bad Request', message: 'Valid on_chain_id or client_ref is required' });
    }

    const { data, error } = await query.select();

    if (error) {
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }

    res.status(200).json({
      success: true,
      status: 'CLOSED',
      invoice: data && data.length > 0 ? data[0] : null
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/invoices
 * Returns all off-chain invoice records for workspace integration.
 */
app.get('/api/invoices', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }

    res.status(200).json({
      success: true,
      invoices: data || []
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/invoices/:id/noa
 * Returns Notice of Assignment (NoA) queue status and details for an invoice.
 * Parameter :id represents the numeric Soroban on_chain_id (or client_ref via query parameter ?client_ref=...).
 */
app.get('/api/invoices/:id/noa', async (req, res, next) => {
  try {
    const { id } = req.params;
    const clientRefQuery = req.query.client_ref;

    const cleanId = String(id).replace('INV-', '');
    const numericId = Number(cleanId);
    const isValidNumericId = !isNaN(numericId) && numericId > 0;

    let query = supabase.from('notice_assignment_queue').select('*');

    if (isValidNumericId) {
      query = query.eq('invoice_id', numericId);
    } else if (clientRefQuery && typeof clientRefQuery === 'string') {
      query = query.eq('client_ref', clientRefQuery);
    } else if (typeof id === 'string' && id.startsWith('clt_ref_')) {
      query = query.eq('client_ref', id);
    } else {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'A valid numeric on_chain_id parameter or client_ref query is required.'
      });
    }

    const { data: queueItems, error } = await query.order('created_at', { ascending: false }).limit(1);

    if (error) {
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }

    if (!queueItems || queueItems.length === 0) {
      return res.status(200).json({
        success: true,
        status: 'NONE',
        noa: null
      });
    }

    const item = queueItems[0];
    const status = item.status; // DISCOVERED | PROCESSING | PROCESSED | FAILED | FAILED_PERMANENT

    let noaPayload = null;
    if (status === 'PROCESSED') {
      noaPayload = {
        reference: `INV-${item.invoice_id}`,
        processedAt: item.processed_at || item.updated_at,
        memo: `INV-${item.invoice_id}`
      };
    }

    return res.status(200).json({
      success: true,
      status,
      noa: noaPayload,
      retry_count: item.retry_count || 0
    });
  } catch (err) {
    next(err);
  }
});

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  const response = {
    error: err.status === 503 ? 'Service Unavailable' : 'Internal Server Error',
    message
  };

  if (!config.isProduction && err.details) {
    response.details = err.details;
  }

  res.status(status).json(response);
});

module.exports = app;
