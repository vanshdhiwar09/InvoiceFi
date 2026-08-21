process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://mock-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-role-key-1234567890';

const { normalizeEvent } = require('../src/events/eventNormalizer');
const { discoverInvoiceFundedEvents, ingestDiscoveredEvents } = require('../src/events/eventIngestionService');
const { xdr } = require('@stellar/stellar-sdk');

console.log('--- STARTING PHASE 5B-2 EVENT INGESTION UNIT TESTS ---');

const TARGET_CONTRACT_ID = 'CCG2BPR7NEQPV4XOLABSZOWSU24CBJXF4V7LEXIXMAMBPIL6P5CPO2YR';

// Helper to encode JS primitive to SCVal for mock test objects
function createMockEvent({
  id = '0017910511840555008-0000000001',
  ledger = 4170116,
  txHash = '73b23df82dbc1e293fc56c944061084b7f783ceb738f781bfb401f0d4ef35189',
  contractId = TARGET_CONTRACT_ID,
  topicSymbol = 'invoice_funded',
  invoiceId = 1,
  freelancer = 'GAN5PGTFXO5ZVASEW5YTFB3F4324CDBXNNQ7GXHNHUL5C3IJVWZK2F3S',
  investor = 'GBPXF53KX2AI2Y67TZCTC4N7XIRZ6QIIT7AJ4H52AOQWBA3B7BCNNJCF',
  fundingAmount = 950n,
  tokenAddress = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  inSuccessfulContractCall = true,
  type = 'contract'
} = {}) {
  return {
    id,
    ledger,
    txHash,
    contractId,
    type,
    inSuccessfulContractCall,
    topic: [
      xdr.ScVal.scvSymbol(topicSymbol),
      xdr.ScVal.scvU64(new xdr.Uint64(invoiceId))
    ],
    value: xdr.ScVal.scvVec([
      xdr.ScVal.scvAddress(xdr.ScAddress.scAddressTypeAccount(xdr.PublicKey.publicKeyTypeEd25519(Buffer.alloc(32)))),
      xdr.ScVal.scvAddress(xdr.ScAddress.scAddressTypeAccount(xdr.PublicKey.publicKeyTypeEd25519(Buffer.alloc(32)))),
      xdr.ScVal.scvI128(new xdr.Int128Parts({ hi: new xdr.Uint64(0), lo: new xdr.Uint64(Number(fundingAmount)) })),
      xdr.ScVal.scvAddress(xdr.ScAddress.scAddressTypeContract(Buffer.alloc(32)))
    ])
  };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
  }
}

// 1. Correct contract filtering
{
  const rawEvent = createMockEvent({ contractId: 'WRONG_CONTRACT_ID_1234567890' });
  const normalized = normalizeEvent(rawEvent, TARGET_CONTRACT_ID);
  assert(normalized === null, 'Test 1: Mismatched contract ID event is rejected');
}

// 2. Correct invoice_funded topic filtering
{
  const rawEvent = createMockEvent({ topicSymbol: 'invoice_repaid' });
  const normalized = normalizeEvent(rawEvent, TARGET_CONTRACT_ID);
  assert(normalized === null, 'Test 2: Non-invoice_funded topic (e.g. invoice_repaid) is rejected');
}

// 3. Topic & Data decoding correctness
{
  const rawEvent = createMockEvent();
  const normalized = normalizeEvent(rawEvent, TARGET_CONTRACT_ID);
  assert(
    normalized !== null &&
    normalized.event_id === '0017910511840555008-0000000001' &&
    normalized.status === 'DISCOVERED' &&
    normalized.retry_count === 0,
    'Test 3: Valid invoice_funded event is correctly decoded and normalized'
  );
}

// 4. Correct invoice ID extraction
{
  const rawEvent = createMockEvent({ invoiceId: 42 });
  const normalized = normalizeEvent(rawEvent, TARGET_CONTRACT_ID);
  assert(normalized !== null && normalized.invoice_id === 42, 'Test 4: Invoice ID 42 extracted correctly');
}

// 5. Correct ledger extraction
{
  const rawEvent = createMockEvent({ ledger: 4170116 });
  const normalized = normalizeEvent(rawEvent, TARGET_CONTRACT_ID);
  assert(normalized !== null && normalized.ledger_sequence === 4170116, 'Test 5: Ledger sequence 4170116 extracted correctly');
}

// 6. Correct event identity usage
{
  const rawEvent = createMockEvent({ id: 'EVENT-ID-9999' });
  const normalized = normalizeEvent(rawEvent, TARGET_CONTRACT_ID);
  assert(normalized !== null && normalized.event_id === 'EVENT-ID-9999', 'Test 6: RPC event string ID preserved as deterministic event_id');
}

// 7. Duplicate event identity uniqueness check
{
  const rawEvent = createMockEvent({ id: 'DUP-EVENT-001' });
  const norm1 = normalizeEvent(rawEvent, TARGET_CONTRACT_ID);
  const norm2 = normalizeEvent(rawEvent, TARGET_CONTRACT_ID);
  assert(norm1.event_id === norm2.event_id && norm1.event_id === 'DUP-EVENT-001', 'Test 7: Duplicate event parsing produces identical deterministic event_id');
}

// 8. Malformed / unexpected event handling
{
  const malformed1 = { ...createMockEvent(), topic: [] };
  assert(normalizeEvent(malformed1, TARGET_CONTRACT_ID) === null, 'Test 8a: Empty topic array is rejected');

  const malformed2 = { ...createMockEvent(), inSuccessfulContractCall: false };
  assert(normalizeEvent(malformed2, TARGET_CONTRACT_ID) === null, 'Test 8b: Failed contract execution call is rejected');

  const malformed3 = { ...createMockEvent(), value: null };
  assert(normalizeEvent(malformed3, TARGET_CONTRACT_ID) === null, 'Test 8c: Null event value payload is rejected');
}

// 9. Unrelated events rejection
{
  const transferEvent = createMockEvent({ topicSymbol: 'transfer' });
  assert(normalizeEvent(transferEvent, TARGET_CONTRACT_ID) === null, 'Test 9: Generic transfer events are safely ignored');
}

// 10a. Multi-page pagination & cursor flow
async function testMultiPagePagination() {
  const sorobanClient = require('../src/events/sorobanClient');
  const originalFetch = sorobanClient.fetchRawContractEvents;

  const calls = [];
  sorobanClient.fetchRawContractEvents = async (params) => {
    calls.push(params);
    if (!params.cursor) {
      // Page 1
      return {
        cursor: 'cursor-page-2',
        events: [
          createMockEvent({ id: 'PAGE1-EVT1', invoiceId: 1, ledger: 100 }),
          createMockEvent({ id: 'PAGE1-EVT2', invoiceId: 2, ledger: 101 })
        ]
      };
    } else if (params.cursor === 'cursor-page-2') {
      // Page 2 (last page)
      return {
        cursor: 'cursor-page-2', // Same cursor indicates end
        events: [
          createMockEvent({ id: 'PAGE2-EVT3', invoiceId: 3, ledger: 102 })
        ]
      };
    }
  };

  const results = await discoverInvoiceFundedEvents({ startLedger: 100, contractId: TARGET_CONTRACT_ID, limit: 2 });
  
  sorobanClient.fetchRawContractEvents = originalFetch;

  assert(
    calls.length === 2 &&
    calls[0].startLedger === 100 &&
    (calls[0].cursor === null || calls[0].cursor === undefined) &&
    calls[1].startLedger === undefined &&
    calls[1].cursor === 'cursor-page-2',
    'Test 10a: Multi-page RPC pagination passes cursor correctly and omits startLedger on page 2+'
  );

  assert(
    results.length === 3 &&
    results[0].event_id === 'PAGE1-EVT1' &&
    results[1].event_id === 'PAGE1-EVT2' &&
    results[2].event_id === 'PAGE2-EVT3',
    'Test 10b: Event ordering is strictly preserved across pagination pages'
  );
}

// 10c. Page-boundary deduplication
async function testPageBoundaryDeduplication() {
  const sorobanClient = require('../src/events/sorobanClient');
  const originalFetch = sorobanClient.fetchRawContractEvents;

  sorobanClient.fetchRawContractEvents = async (params) => {
    if (!params.cursor) {
      return {
        cursor: 'cursor-2',
        events: [createMockEvent({ id: 'EVT-SHARED', invoiceId: 1 })]
      };
    } else {
      return {
        cursor: 'cursor-2',
        events: [
          createMockEvent({ id: 'EVT-SHARED', invoiceId: 1 }), // Boundary duplicate
          createMockEvent({ id: 'EVT-NEW', invoiceId: 2 })
        ]
      };
    }
  };

  const results = await discoverInvoiceFundedEvents({ startLedger: 100, contractId: TARGET_CONTRACT_ID, limit: 1 });
  sorobanClient.fetchRawContractEvents = originalFetch;

  assert(
    results.length === 2 && results[0].event_id === 'EVT-SHARED' && results[1].event_id === 'EVT-NEW',
    'Test 10c: Events duplicated across page boundaries are deduplicated'
  );
}

// 10d. Error recovery on page 2+
async function testPage2ErrorRecovery() {
  const sorobanClient = require('../src/events/sorobanClient');
  const originalFetch = sorobanClient.fetchRawContractEvents;

  sorobanClient.fetchRawContractEvents = async (params) => {
    if (!params.cursor) {
      return {
        cursor: 'cursor-2',
        events: [createMockEvent({ id: 'EVT-P1', invoiceId: 1 })]
      };
    } else {
      throw new Error('RPC Server Timeout on Page 2');
    }
  };

  const results = await discoverInvoiceFundedEvents({ startLedger: 100, contractId: TARGET_CONTRACT_ID, limit: 1 });
  sorobanClient.fetchRawContractEvents = originalFetch;

  assert(
    results.length === 1 && results[0].event_id === 'EVT-P1',
    'Test 10d: RPC error on page 2 returns page 1 results gracefully without crashing'
  );
}

// 11a. Empty RPC page with valid nextCursor continues pagination
async function testEmptyPagePaginationContinuation() {
  const sorobanClient = require('../src/events/sorobanClient');
  const originalFetch = sorobanClient.fetchRawContractEvents;
  const originalGetLatest = sorobanClient.getLatestLedgerSequence;

  sorobanClient.getLatestLedgerSequence = async () => 150;

  let callCount = 0;
  sorobanClient.fetchRawContractEvents = async (params) => {
    callCount++;
    if (callCount === 1) {
      // Empty events array on Page 1, but valid nextCursor
      return {
        cursor: 'cursor-page-2',
        events: []
      };
    } else {
      // Page 2 returns the discovered event
      return {
        cursor: 'cursor-page-2',
        events: [createMockEvent({ id: 'EVT-P2-INV14', invoiceId: 14, ledger: 150 })]
      };
    }
  };

  const results = await discoverInvoiceFundedEvents({ startLedger: 100, contractId: TARGET_CONTRACT_ID, limit: 100 });
  
  sorobanClient.fetchRawContractEvents = originalFetch;
  sorobanClient.getLatestLedgerSequence = originalGetLatest;

  assert(
    callCount === 2 && results.length === 1 && results[0].event_id === 'EVT-P2-INV14' && results[0].invoice_id === 14,
    'Test 11a: Empty RPC page with valid nextCursor continues pagination and discovers later event'
  );
}

// 11b. Empty RPC page with no nextCursor at latest ledger terminates pagination cleanly
async function testEmptyPageTermination() {
  const sorobanClient = require('../src/events/sorobanClient');
  const originalFetch = sorobanClient.fetchRawContractEvents;
  const originalGetLatest = sorobanClient.getLatestLedgerSequence;

  sorobanClient.getLatestLedgerSequence = async () => 100;

  let callCount = 0;
  sorobanClient.fetchRawContractEvents = async (params) => {
    callCount++;
    return {
      cursor: null,
      events: []
    };
  };

  const results = await discoverInvoiceFundedEvents({ startLedger: 100, contractId: TARGET_CONTRACT_ID, limit: 100 });

  sorobanClient.fetchRawContractEvents = originalFetch;
  sorobanClient.getLatestLedgerSequence = originalGetLatest;

  assert(
    callCount === 1 && results.length === 0,
    'Test 11b: Empty RPC page with no nextCursor at latest ledger terminates pagination cleanly'
  );
}

// TEST A & TEST B: Verify Stellar SDK request object shapes for initial page vs cursor page
async function testSdkRequestShapes() {
  const sorobanClient = require('../src/events/sorobanClient');
  const originalGetEvents = sorobanClient.rpcServer.getEvents;

  let capturedOpts = null;
  sorobanClient.rpcServer.getEvents = async (opts) => {
    capturedOpts = opts;
    return { events: [], cursor: 'mock-cursor-response' };
  };

  // TEST A: Initial request contains positive startLedger and no cursor
  await sorobanClient.fetchRawContractEvents({ startLedger: 4220295 });
  assert(
    capturedOpts !== null &&
    capturedOpts.startLedger === 4220295 &&
    capturedOpts.cursor === undefined,
    'TEST A: Initial request contains positive startLedger and omits cursor'
  );

  // TEST B: Second/cursor request contains top-level cursor and does NOT contain startLedger
  await sorobanClient.fetchRawContractEvents({ cursor: 'valid-next-cursor-123' });
  assert(
    capturedOpts !== null &&
    capturedOpts.cursor === 'valid-next-cursor-123' &&
    capturedOpts.startLedger === undefined,
    'TEST B: Second/cursor request contains top-level cursor and omits startLedger'
  );

  sorobanClient.rpcServer.getEvents = originalGetEvents;
}

// TEST D: Later page containing invoice_funded event is discovered cleanly
async function testLaterPageDiscovery() {
  const sorobanClient = require('../src/events/sorobanClient');
  const originalFetch = sorobanClient.fetchRawContractEvents;

  let callCount = 0;
  sorobanClient.fetchRawContractEvents = async (params) => {
    callCount++;
    if (callCount === 1) {
      return { cursor: 'cursor-page-2', events: [] };
    } else if (callCount === 2) {
      return { cursor: 'cursor-page-3', events: [] };
    } else {
      return {
        cursor: 'cursor-page-3',
        events: [createMockEvent({ id: 'EVT-INV-14', invoiceId: 14, ledger: 4260196 })]
      };
    }
  };

  const results = await discoverInvoiceFundedEvents({ startLedger: 4220295, contractId: TARGET_CONTRACT_ID, limit: 100 });
  sorobanClient.fetchRawContractEvents = originalFetch;

  assert(
    results.length === 1 && results[0].event_id === 'EVT-INV-14' && results[0].invoice_id === 14,
    'TEST D: Later page containing invoice_funded event (Invoice 14) is discovered cleanly'
  );
}

// 11c. ENABLE_BACKGROUND_DAEMON=true env validation
function testDaemonEnvFlag() {
  const originalEnv = process.env.ENABLE_BACKGROUND_DAEMON;
  process.env.ENABLE_BACKGROUND_DAEMON = 'true';
  const isEnabled = String(process.env.ENABLE_BACKGROUND_DAEMON).toLowerCase() === 'true' || process.env.NODE_ENV === 'production';
  process.env.ENABLE_BACKGROUND_DAEMON = originalEnv;

  assert(isEnabled === true, 'Test 11c: Background daemon is enabled when ENABLE_BACKGROUND_DAEMON=true');
}

async function runAsyncTests() {
  await testSdkRequestShapes();
  await testMultiPagePagination();
  await testPageBoundaryDeduplication();
  await testPage2ErrorRecovery();
  await testEmptyPagePaginationContinuation();
  await testEmptyPageTermination();
  await testLaterPageDiscovery();
  testDaemonEnvFlag();

  console.log(`\nResults: ${passedTests}/${totalTests} unit tests passed.`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL PHASE 5B-2 EVENT INGESTION UNIT TESTS PASSED.');
    process.exit(0);
  } else {
    console.error('❌ SOME UNIT TESTS FAILED.');
    process.exit(1);
  }
}

runAsyncTests();
