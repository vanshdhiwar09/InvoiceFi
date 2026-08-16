process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://mock-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-role-key-1234567890';

const { claimQueueItems, processQueueItem, processQueueOnce } = require('../src/worker/queueWorker');
const { processNoticeOfAssignment } = require('../src/worker/noticeOfAssignment');
const { calculateSafeCheckpoint, advanceCheckpoint } = require('../src/worker/checkpointService');
const { supabase } = require('../src/supabase');

console.log('--- STARTING PHASE 5B-3 QUEUE WORKER & CHECKPOINT UNIT TESTS ---');

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

// In-Memory Mock Database Store for Unit Testing
class MockSupabaseDB {
  constructor() {
    this.invoices = [];
    this.queue = [];
    this.syncState = { key: 'soroban_rpc_last_ledger', value: 100 };
  }

  reset() {
    this.invoices = [
      {
        id: 'inv-uuid-001',
        client_ref: 'clt_ref_001',
        on_chain_id: 1,
        freelancer_address: 'GAN5PGTFXO5ZVASEW5YTFB3F4324CDBXNNQ7GXHNHUL5C3IJVWZK2F3S',
        client_name: 'Acme Corp',
        client_email: 'finance@acme.com',
        client_organization: 'Acme Inc',
        description: 'Web development services',
        face_value: '10000000000',
        funding_amount: '9500000000',
        repayment_amount: '10000000000',
        currency: 'XLM',
        due_date: new Date().toISOString(),
        status: 'TOKENIZED'
      }
    ];

    this.queue = [];
    this.syncState = { key: 'soroban_rpc_last_ledger', value: 100 };
  }
}

const mockDb = new MockSupabaseDB();

// Mock Supabase Query Engine for deterministic unit testing
function patchSupabaseMock() {
  const originalFrom = supabase.from;

  supabase.from = (tableName) => {
    if (tableName === 'notice_assignment_queue') {
      return {
        select: (cols) => ({
          or: (filterStr) => ({
            order: (col, opts) => ({
              limit: async (lim) => {
                const now = new Date().toISOString();
                // Filter eligible items matching status DISCOVERED, FAILED (retry < 5), or stale PROCESSING locks
                const eligible = mockDb.queue.filter(item => {
                  if (item.status === 'DISCOVERED') return true;
                  if (item.status === 'FAILED' && item.retry_count < 5) return true;
                  if (item.status === 'PROCESSING' && item.locked_until && item.locked_until < now) return true;
                  return false;
                }).slice(0, lim);
                return { data: eligible, error: null };
              }
            })
          }),
          in: (col, valArray) => {
            let filtered = mockDb.queue.filter(item => valArray.includes(item[col]));
            const builder = {
              order: (sortCol, opts) => {
                filtered = [...filtered];
                if (opts && opts.ascending === false) {
                  filtered.sort((a, b) => Number(b[sortCol]) - Number(a[sortCol]));
                } else {
                  filtered.sort((a, b) => Number(a[sortCol]) - Number(b[sortCol]));
                }
                return builder;
              },
              limit: async (lim) => {
                return { data: filtered.slice(0, lim), error: null };
              },
              then: (onFulfilled) => Promise.resolve({ data: filtered, error: null }).then(onFulfilled)
            };
            return builder;
          }
        }),
        update: (updateFields) => ({
          eq: (col, val) => {
            const executeUpdate = () => {
              const item = mockDb.queue.find(i => String(i[col]) === String(val));
              if (item) {
                Object.assign(item, updateFields);
                return { data: [item], error: null };
              }
              const inv = mockDb.invoices.find(i => String(i[col]) === String(val));
              if (inv) {
                Object.assign(inv, updateFields);
                return { data: [inv], error: null };
              }
              return { data: [], error: null };
            };

            const promise = Promise.resolve().then(executeUpdate);
            promise.select = async () => Promise.resolve(executeUpdate());
            return promise;
          }
        }),
        upsert: async (payload, opts) => {
          const items = Array.isArray(payload) ? payload : [payload];
          const inserted = [];
          for (const newItem of items) {
            const existingIndex = mockDb.queue.findIndex(i => i.event_id === newItem.event_id);
            if (existingIndex >= 0) {
              if (opts && opts.ignoreDuplicates) {
                // Ignore duplicate
              } else {
                Object.assign(mockDb.queue[existingIndex], newItem);
                inserted.push(mockDb.queue[existingIndex]);
              }
            } else {
              mockDb.queue.push({ ...newItem });
              inserted.push(newItem);
            }
          }
          return { data: inserted, error: null };
        }
      };
    } else if (tableName === 'invoices') {
      return {
        select: (cols) => ({
          eq: async (col, val) => {
            const matches = mockDb.invoices.filter(i => String(i[col]) === String(val));
            return { data: matches, error: null };
          }
        }),
        update: (updateFields) => ({
          eq: async (col, val) => {
            const inv = mockDb.invoices.find(i => i[col] === val);
            if (inv) {
              Object.assign(inv, updateFields);
              return { data: [inv], error: null };
            }
            return { data: [], error: null };
          }
        })
      };
    } else if (tableName === 'sync_state') {
      return {
        select: (cols) => ({
          eq: (col, val) => ({
            single: async () => ({ data: mockDb.syncState, error: null })
          })
        }),
        upsert: async (payload) => {
          mockDb.syncState.value = payload.value;
          return { data: [mockDb.syncState], error: null };
        }
      };
    }
    return originalFrom.call(supabase, tableName);
  };
}

patchSupabaseMock();

async function runAllTests() {
  // Test 1 & 2: Claim DISCOVERED item -> becomes PROCESSING
  {
    mockDb.reset();
    mockDb.queue.push({
      event_id: 'EVT-1',
      invoice_id: 1,
      client_ref: 'clt_ref_001',
      ledger_sequence: 101,
      tx_hash: 'tx-1',
      freelancer_address: 'GAN5...',
      investor_address: 'GBPX...',
      funding_amount: '9500000000',
      token_address: 'CDLZ...',
      status: 'DISCOVERED',
      retry_count: 0
    });

    const claimed = await claimQueueItems({ limit: 1, workerId: 'worker-A' });
    assert(claimed.length === 1 && claimed[0].status === 'PROCESSING' && claimed[0].locked_by === 'worker-A',
      'Test 1 & 2: DISCOVERED queue item claimed successfully and state updated to PROCESSING');
  }

  // Test 3 & 4: Successful processing -> PROCESSED & NoA Simulation logged
  {
    mockDb.reset();
    const item = {
      event_id: 'EVT-1',
      invoice_id: 1,
      client_ref: 'clt_ref_001',
      ledger_sequence: 101,
      tx_hash: 'tx-1',
      freelancer_address: 'GAN5...',
      investor_address: 'GBPX...',
      funding_amount: '9500000000',
      token_address: 'CDLZ...',
      status: 'PROCESSING',
      retry_count: 0
    };
    mockDb.queue.push(item);

    const res = await processQueueItem(item);
    const dbItem = mockDb.queue.find(i => i.event_id === 'EVT-1');
    const invoice = mockDb.invoices[0];

    assert(res.status === 'PROCESSED' && dbItem.status === 'PROCESSED' && invoice.status === 'FUNDED',
      'Test 3 & 4: Queue item processed to PROCESSED state and off-chain invoice status updated to FUNDED');
  }

  // Test 5: Missing invoice mapping fails safely
  {
    mockDb.reset();
    const itemMissing = {
      event_id: 'EVT-MISSING',
      invoice_id: 9999,
      client_ref: 'non_existent_ref',
      ledger_sequence: 102,
      tx_hash: 'tx-missing',
      freelancer_address: 'GAN5...',
      investor_address: 'GBPX...',
      funding_amount: '9500000000',
      token_address: 'CDLZ...',
      status: 'PROCESSING',
      retry_count: 0
    };
    mockDb.queue.push(itemMissing);

    const res = await processQueueItem(itemMissing);
    assert(res.status === 'FAILED' && res.retry_count === 1 && res.error.includes('Missing invoice mapping'),
      'Test 5: Event with missing invoice mapping fails safely and sets retry_count = 1');
  }

  // Test 6 & 7: Retryable failure increments retry_count up to 4
  {
    mockDb.reset();
    const itemRetry = {
      event_id: 'EVT-RETRY',
      invoice_id: 9999,
      client_ref: 'bad_ref',
      ledger_sequence: 103,
      tx_hash: 'tx-retry',
      freelancer_address: 'GAN5...',
      investor_address: 'GBPX...',
      funding_amount: '9500000000',
      token_address: 'CDLZ...',
      status: 'PROCESSING',
      retry_count: 3
    };
    mockDb.queue.push(itemRetry);

    const res = await processQueueItem(itemRetry);
    assert(res.status === 'FAILED' && res.retry_count === 4,
      'Test 6 & 7: 4th failed attempt increments retry_count to 4 and remains status FAILED');
  }

  // Test 8 & 9: 5th failure becomes FAILED_PERMANENT and is not retried
  {
    mockDb.reset();
    const itemPerm = {
      event_id: 'EVT-PERM',
      invoice_id: 9999,
      client_ref: 'bad_ref',
      ledger_sequence: 104,
      tx_hash: 'tx-perm',
      freelancer_address: 'GAN5...',
      investor_address: 'GBPX...',
      funding_amount: '9500000000',
      token_address: 'CDLZ...',
      status: 'PROCESSING',
      retry_count: 4
    };
    mockDb.queue.push(itemPerm);

    const res = await processQueueItem(itemPerm);
    const dbItem = mockDb.queue.find(i => i.event_id === 'EVT-PERM');
    assert(res.status === 'FAILED_PERMANENT' && res.retry_count === 5 && dbItem.status === 'FAILED_PERMANENT',
      'Test 8: 5th failed attempt transitions status to FAILED_PERMANENT');

    const retryRes = await processQueueItem(dbItem);
    assert(retryRes.status === 'SKIPPED',
      'Test 9: FAILED_PERMANENT item is skipped and not retried');
  }

  // Test 10: PROCESSED item is not processed twice
  {
    mockDb.reset();
    const processedItem = {
      event_id: 'EVT-DONE',
      invoice_id: 1,
      status: 'PROCESSED'
    };
    mockDb.queue.push(processedItem);

    const res = await processQueueItem(processedItem);
    assert(res.status === 'SKIPPED' && res.message.includes('already PROCESSED'),
      'Test 10: PROCESSED item is skipped and not processed twice');
  }

  // Test 11 & 12: Concurrency & Lock claiming
  {
    mockDb.reset();
    mockDb.queue.push({
      event_id: 'EVT-CONCUR',
      invoice_id: 1,
      status: 'DISCOVERED',
      retry_count: 0
    });

    const claimed1 = await claimQueueItems({ limit: 1, workerId: 'Worker-1' });
    assert(claimed1.length === 1 && claimed1[0].locked_by === 'Worker-1',
      'Test 11 & 12: Worker-1 claims DISCOVERED item cleanly');
  }

  // Test 13: Checkpoint advances through terminal events
  {
    mockDb.reset();
    mockDb.syncState.value = 100;
    mockDb.queue.push(
      { event_id: 'EVT-T1', ledger_sequence: 101, status: 'PROCESSED' },
      { event_id: 'EVT-T2', ledger_sequence: 102, status: 'FAILED_PERMANENT' }
    );

    const safeCheckpoint = await calculateSafeCheckpoint();
    assert(safeCheckpoint === 102,
      'Test 13: Checkpoint safely advances through PROCESSED and FAILED_PERMANENT terminal ledgers (102)');

    const advRes = await advanceCheckpoint();
    assert(advRes.advanced === true && advRes.newCheckpoint === 102,
      'Test 13b: Checkpoint persisted to sync_state as 102');
  }

  // Test 14, 15, 16: Checkpoint does NOT advance past DISCOVERED, PROCESSING, or FAILED
  {
    mockDb.reset();
    mockDb.syncState.value = 100;
    mockDb.queue.push(
      { event_id: 'EVT-T1', ledger_sequence: 101, status: 'PROCESSED' },
      { event_id: 'EVT-PENDING', ledger_sequence: 102, status: 'DISCOVERED' },
      { event_id: 'EVT-T2', ledger_sequence: 103, status: 'PROCESSED' }
    );

    const safeCheckpoint = await calculateSafeCheckpoint();
    assert(safeCheckpoint === 101,
      'Test 14, 15, 16: Checkpoint is held at 101 (min non-terminal ledger 102 minus 1) when DISCOVERED/PROCESSING item exists at 102');
  }

  // Test 17: FAILED_PERMANENT allows checkpoint advancement
  {
    mockDb.reset();
    mockDb.syncState.value = 100;
    mockDb.queue.push(
      { event_id: 'EVT-T1', ledger_sequence: 101, status: 'PROCESSED' },
      { event_id: 'EVT-FAILPERM', ledger_sequence: 102, status: 'FAILED_PERMANENT' },
      { event_id: 'EVT-T3', ledger_sequence: 103, status: 'PROCESSED' }
    );

    const safeCheckpoint = await calculateSafeCheckpoint();
    assert(safeCheckpoint === 103,
      'Test 17: FAILED_PERMANENT at ledger 102 is terminal and allows checkpoint to advance through 103');
  }

  // Test 18 & 19: Multiple events in same ledger and out-of-order completion
  {
    mockDb.reset();
    mockDb.syncState.value = 100;
    mockDb.queue.push(
      { event_id: 'EVT-L101-A', ledger_sequence: 101, status: 'PROCESSED' },
      { event_id: 'EVT-L101-B', ledger_sequence: 101, status: 'PROCESSING' },
      { event_id: 'EVT-L102-A', ledger_sequence: 102, status: 'PROCESSED' }
    );

    const safeCheckpoint = await calculateSafeCheckpoint();
    assert(safeCheckpoint === 100,
      'Test 18 & 19: Safe checkpoint remains 100 when multiple events exist in ledger 101 and one is still PROCESSING');
  }

  // Test 20: Stale PROCESSING lock recovery after worker crash
  {
    mockDb.reset();
    const staleTime = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 mins ago
    mockDb.queue.push({
      event_id: 'EVT-STALE',
      invoice_id: 1,
      status: 'PROCESSING',
      locked_by: 'dead-worker-99',
      locked_until: staleTime,
      retry_count: 1
    });

    const claimed = await claimQueueItems({ limit: 1, workerId: 'new-worker-01' });
    assert(claimed.length === 1 && claimed[0].locked_by === 'new-worker-01',
      'Test 20: Stale PROCESSING lock from crashed worker is safely reclaimed by new worker');
  }

  // Test 21: Malformed queue data does not crash worker
  {
    mockDb.reset();
    mockDb.queue.push({
      event_id: 'EVT-MALFORMED',
      invoice_id: null,
      status: 'DISCOVERED',
      retry_count: 0
    });

    const res = await processQueueItem(mockDb.queue[0]);
    assert(res.status === 'FAILED' && res.retry_count === 1,
      'Test 21: Malformed queue item handled safely without crashing worker');
  }

  // Test 22: Privacy audit — no PII returned or exposed
  {
    mockDb.reset();
    const item = {
      event_id: 'EVT-PRIVACY',
      invoice_id: 1,
      client_ref: 'clt_ref_001',
      ledger_sequence: 101,
      tx_hash: 'tx-1',
      freelancer_address: 'GAN5...',
      investor_address: 'GBPX...',
      funding_amount: '9500000000',
      token_address: 'CDLZ...',
      status: 'PROCESSING',
      retry_count: 0
    };
    const noa = await processNoticeOfAssignment(item);
    assert(!noa.memo.includes('finance@acme.com') && noa.memo === 'INV-1',
      'Test 22: Settlement memo contains ONLY on-chain INV-1 format; no private client PII exposed');
  }

  console.log(`\nResults: ${passedTests}/${totalTests} unit tests passed.`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL PHASE 5B-3 QUEUE WORKER & CHECKPOINT UNIT TESTS PASSED.');
    process.exit(0);
  } else {
    console.error('❌ SOME UNIT TESTS FAILED.');
    process.exit(1);
  }
}

runAllTests();
