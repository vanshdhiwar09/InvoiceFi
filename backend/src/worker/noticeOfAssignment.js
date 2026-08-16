const { supabase } = require('../supabase');

/**
 * Simulates processing of Notice of Assignment (NoA) for an invoice funding event.
 * Looks up private metadata from Supabase invoices table, logs simulated settlement details,
 * and updates off-chain invoice status to FUNDED.
 *
 * @param {Object} queueItem - Queue item record from notice_assignment_queue
 * @returns {Promise<Object>} Simulated NoA payload result
 */
async function processNoticeOfAssignment(queueItem) {
  if (!queueItem || !queueItem.invoice_id) {
    throw new Error('Invalid queue item: missing invoice_id');
  }

  // 1. Resolve private client metadata from off-chain invoices table
  let query = supabase.from('invoices').select('*');
  if (queueItem.client_ref) {
    query = query.eq('client_ref', queueItem.client_ref);
  } else {
    query = query.eq('on_chain_id', queueItem.invoice_id);
  }

  const { data: invoices, error } = await query;

  if (error) {
    throw new Error(`Database error querying invoice metadata: ${error.message}`);
  }

  if (!invoices || invoices.length === 0) {
    throw new Error(`Missing invoice mapping for invoice_id ${queueItem.invoice_id} (client_ref: ${queueItem.client_ref || 'N/A'})`);
  }

  const invoice = invoices[0];

  // 2. Build simulated Notice of Assignment payload
  const memo = `INV-${queueItem.invoice_id}`;
  const noaPayload = {
    memo,
    invoice_id: queueItem.invoice_id,
    client_ref: invoice.client_ref,
    client_name: invoice.client_name,
    client_email: invoice.client_email,
    client_organization: invoice.client_organization || null,
    funding_amount: queueItem.funding_amount.toString(),
    token_address: queueItem.token_address,
    freelancer_address: queueItem.freelancer_address,
    investor_address: queueItem.investor_address,
    tx_hash: queueItem.tx_hash,
    ledger_sequence: queueItem.ledger_sequence,
    processed_at: new Date().toISOString(),
    status: 'SIMULATED_LOGGED'
  };

  // Server-side audit log for simulated notification
  console.log(`[NoA Worker] Logged simulated Notice of Assignment for Invoice #${queueItem.invoice_id} (Memo: ${memo}):`, {
    invoice_id: noaPayload.invoice_id,
    client_ref: noaPayload.client_ref,
    memo: noaPayload.memo,
    funding_amount: noaPayload.funding_amount,
    status: noaPayload.status
  });

  // 3. Update off-chain invoice status to FUNDED
  const { error: updateErr } = await supabase
    .from('invoices')
    .update({
      status: 'FUNDED',
      on_chain_id: queueItem.invoice_id,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoice.id);

  if (updateErr) {
    console.warn(`[NoA Worker] Warning updating invoice status for ${invoice.id}:`, updateErr.message);
  }

  return noaPayload;
}

module.exports = {
  processNoticeOfAssignment
};
