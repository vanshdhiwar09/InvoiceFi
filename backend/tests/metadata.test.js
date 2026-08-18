process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://mock-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-role-key-1234567890';

const { supabase } = require('../src/supabase');
const app = require('../src/app');
const http = require('http');

console.log('--- STARTING PHASE 6F METADATA & NOA BACKEND UNIT TESTS ---');

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
  }
}

// Mock Supabase Store
class MockSupabaseDB {
  constructor() {
    this.invoices = [];
    this.storageFiles = [];
    this.noticeQueue = [];
  }

  reset() {
    this.invoices = [];
    this.storageFiles = [];
    this.noticeQueue = [];
  }
}

const mockDb = new MockSupabaseDB();

function patchSupabaseMock() {
  const originalFrom = supabase.from;

  supabase.from = (tableName) => {
    if (tableName === 'invoices') {
      return {
        insert: (payload) => {
          const items = Array.isArray(payload) ? payload : [payload];
          const inserted = items.map(item => ({ ...item, id: 'inv-uuid-' + Date.now() }));
          mockDb.invoices.push(...inserted);
          return {
            select: async () => ({ data: inserted, error: null })
          };
        },
        update: (updateFields) => ({
          eq: (col, val) => ({
            select: async () => {
              const matches = mockDb.invoices.filter(i => String(i[col]) === String(val));
              matches.forEach(i => Object.assign(i, updateFields));
              return { data: matches, error: null };
            }
          })
        }),
        select: (cols) => ({
          order: (col, opts) => ({
            then: (onFulfilled) => Promise.resolve({ data: mockDb.invoices, error: null }).then(onFulfilled)
          })
        })
      };
    }

    if (tableName === 'notice_assignment_queue') {
      return {
        select: (cols) => ({
          eq: (col, val) => ({
            order: (orderCol, opts) => ({
              limit: (lim) => Promise.resolve({
                data: mockDb.noticeQueue.filter(q => String(q[col]) === String(val)),
                error: null
              })
            })
          }),
          order: (orderCol, opts) => ({
            limit: (lim) => Promise.resolve({
              data: mockDb.noticeQueue,
              error: null
            })
          })
        })
      };
    }

    return originalFrom.call(supabase, tableName);
  };

  supabase.storage = {
    from: (bucket) => ({
      upload: async (path, buffer, opts) => {
        mockDb.storageFiles.push({ bucket, path, size: buffer.length });
        return { data: { path }, error: null };
      }
    })
  };
}

patchSupabaseMock();

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body || {});
    const req = http.request({
      hostname: 'localhost',
      port: 4001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runAllTests() {
  const server = app.listen(4001, async () => {
    try {
      // Test 1: POST /api/invoices/metadata - Valid metadata request
      {
        mockDb.reset();
        const res = await makeRequest('POST', '/api/invoices/metadata', {
          client_name: 'Acme Textiles',
          client_email: 'finance@acme.com',
          freelancer_address: 'GAN5PGTFXO5ZVASEW5YTFB3F4324CDBXNNQ7GXHNHUL5C3IJVWZK2F3S',
          face_value: 10000,
          funding_amount: 8500,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

        assert(res.status === 201 && res.body.success === true && res.body.client_ref.startsWith('clt_ref_'),
          'Test 1: Valid metadata request generates opaque non-PII client_ref and returns 201 Created');
      }

      // Test 2: PII privacy verification - client_ref contains no PII
      {
        mockDb.reset();
        const res = await makeRequest('POST', '/api/invoices/metadata', {
          client_name: 'Secret Client Corp',
          client_email: 'sensitive@secret.com',
          freelancer_address: 'GAN5PGTFXO5ZVASEW5YTFB3F4324CDBXNNQ7GXHNHUL5C3IJVWZK2F3S',
          face_value: 5000,
          funding_amount: 4250,
          due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
        });

        const ref = res.body.client_ref;
        assert(!ref.includes('Secret') && !ref.includes('sensitive') && !ref.includes('secret.com'),
          'Test 2: Generated client_ref is completely opaque and contains no client PII');
      }

      // Test 3: Validation - Missing client_name returns 400
      {
        mockDb.reset();
        const res = await makeRequest('POST', '/api/invoices/metadata', {
          client_email: 'finance@acme.com',
          freelancer_address: 'GAN5PGTFXO5ZVASEW5YTFB3F4324CDBXNNQ7GXHNHUL5C3IJVWZK2F3S',
          face_value: 10000,
          funding_amount: 8500,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

        assert(res.status === 400 && res.body.message.includes('client_name'),
          'Test 3: Missing client_name returns 400 Bad Request');
      }

      // Test 4: Validation - Invalid funding_amount >= face_value returns 400
      {
        mockDb.reset();
        const res = await makeRequest('POST', '/api/invoices/metadata', {
          client_name: 'Acme Corp',
          client_email: 'finance@acme.com',
          freelancer_address: 'GAN5PGTFXO5ZVASEW5YTFB3F4324CDBXNNQ7GXHNHUL5C3IJVWZK2F3S',
          face_value: 10000,
          funding_amount: 10000,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

        assert(res.status === 400 && res.body.message.includes('funding_amount must be strictly less than face_value'),
          'Test 4: funding_amount >= face_value returns 400 Bad Request');
      }

      // Test 5: Optional Document Upload
      {
        mockDb.reset();
        const pdfBase64 = Buffer.from('PDF_SAMPLE_DATA').toString('base64');
        const res = await makeRequest('POST', '/api/invoices/metadata', {
          client_name: 'Acme Corp',
          client_email: 'finance@acme.com',
          freelancer_address: 'GAN5PGTFXO5ZVASEW5YTFB3F4324CDBXNNQ7GXHNHUL5C3IJVWZK2F3S',
          face_value: 10000,
          funding_amount: 8500,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          document: {
            name: 'invoice_march.pdf',
            type: 'application/pdf',
            dataBase64: pdfBase64
          }
        });

        assert(res.status === 201 && mockDb.storageFiles.length === 1 && mockDb.storageFiles[0].bucket === 'invoice-documents',
          'Test 5: Private document upload processes safely to invoice-documents storage bucket');
      }

      // Test 6: Invalid Document Type Returns 400
      {
        mockDb.reset();
        const exeBase64 = Buffer.from('EXE_DATA').toString('base64');
        const res = await makeRequest('POST', '/api/invoices/metadata', {
          client_name: 'Acme Corp',
          client_email: 'finance@acme.com',
          freelancer_address: 'GAN5PGTFXO5ZVASEW5YTFB3F4324CDBXNNQ7GXHNHUL5C3IJVWZK2F3S',
          face_value: 10000,
          funding_amount: 8500,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          document: {
            name: 'malicious.exe',
            type: 'application/x-msdownload',
            dataBase64: exeBase64
          }
        });

        assert(res.status === 400 && res.body.message.includes('PDF, JPG, or PNG'),
          'Test 6: Unsupported document format (.exe) returns 400 Bad Request');
      }

      // Test 7: PATCH /api/invoices/:client_ref/on-chain maps confirmed on_chain_id
      {
        mockDb.reset();
        mockDb.invoices.push({
          client_ref: 'clt_ref_test_100',
          status: 'CREATED'
        });

        const res = await makeRequest('PATCH', '/api/invoices/clt_ref_test_100/on-chain', {
          on_chain_id: 42
        });

        const inv = mockDb.invoices.find(i => i.client_ref === 'clt_ref_test_100');
        assert(res.status === 200 && res.body.on_chain_id === 42 && inv.on_chain_id === 42,
          'Test 7: PATCH on-chain maps confirmed Soroban invoice_id (42) to client_ref record');
      }

      // Test 8: GET /api/invoices/:id/noa resolves queue status by numeric on_chain_id
      {
        mockDb.reset();
        mockDb.noticeQueue.push({
          event_id: 'evt_101',
          invoice_id: 42,
          client_ref: 'clt_ref_test_100',
          status: 'PROCESSED',
          processed_at: new Date().toISOString()
        });

        const res = await makeRequest('GET', '/api/invoices/42/noa');
        assert(res.status === 200 && res.body.success === true && res.body.status === 'PROCESSED' && res.body.noa.reference === 'INV-42',
          'Test 8: GET /api/invoices/42/noa resolves PROCESSED NoA status for numeric Soroban invoice_id');
      }

      // Test 9: GET /api/invoices/:id/noa returns FAILED_PERMANENT status
      {
        mockDb.reset();
        mockDb.noticeQueue.push({
          event_id: 'evt_102',
          invoice_id: 99,
          client_ref: 'clt_ref_test_99',
          status: 'FAILED_PERMANENT',
          retry_count: 5
        });

        const res = await makeRequest('GET', '/api/invoices/99/noa');
        assert(res.status === 200 && res.body.status === 'FAILED_PERMANENT' && res.body.retry_count === 5,
          'Test 9: GET /api/invoices/99/noa returns FAILED_PERMANENT status after retry exhaustion');
      }

      console.log(`\nResults: ${passedTests}/${totalTests} metadata backend unit tests passed.`);
      server.close(() => {
        if (passedTests === totalTests) {
          console.log('🎉 ALL METADATA & NOA BACKEND UNIT TESTS PASSED.');
          process.exit(0);
        } else {
          console.error('❌ SOME UNIT TESTS FAILED.');
          process.exit(1);
        }
      });
    } catch (err) {
      console.error('Test execution error:', err);
      server.close(() => process.exit(1));
    }
  });
}

runAllTests();
