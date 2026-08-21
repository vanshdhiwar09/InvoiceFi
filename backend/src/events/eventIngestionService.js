const sorobanClient = require('./sorobanClient');
const { normalizeEvent } = require('./eventNormalizer');
const { supabase } = require('../supabase');
const config = require('../config');

/**
 * Discovers and normalizes invoice_funded contract events from Soroban RPC.
 * Does NOT write to database.
 *
 * @param {Object} params
 * @param {number} params.startLedger - Starting ledger sequence
 * @param {string} [params.contractId] - Optional target contract ID
 * @param {number} [params.limit=100] - Page size limit
 * @returns {Promise<Array<Object>>} Array of normalized invoice_funded events
 */
async function discoverInvoiceFundedEvents({ startLedger, contractId, limit = 100 }) {
  const targetContractId = contractId || config.invoiceContractId;
  const normalizedEvents = [];
  const seenEventIds = new Set();

  let currentStartLedger = startLedger;
  let currentCursor = null;
  let pageCount = 0;
  const maxPages = 50;

  let latestLedger = 0;
  try {
    latestLedger = await sorobanClient.getLatestLedgerSequence();
  } catch (err) {
    // Fallback if RPC getLatestLedger fails
  }

  while (pageCount < maxPages) {
    let rawResponse;
    try {
      rawResponse = await sorobanClient.fetchRawContractEvents({
        startLedger: currentCursor ? undefined : currentStartLedger,
        contractId: targetContractId,
        cursor: currentCursor,
        limit
      });
    } catch (err) {
      console.warn(`RPC event fetch warning on page ${pageCount + 1}: ${err.message}`);
      break;
    }

    if (!rawResponse) {
      break;
    }

    const events = Array.isArray(rawResponse.events) ? rawResponse.events : [];
    let maxLedgerInBatch = currentStartLedger;

    for (const rawEvent of events) {
      const normalized = normalizeEvent(rawEvent, targetContractId);
      if (normalized && !seenEventIds.has(normalized.event_id)) {
        seenEventIds.add(normalized.event_id);
        normalizedEvents.push(normalized);
      }
      if (rawEvent.ledger && Number(rawEvent.ledger) > maxLedgerInBatch) {
        maxLedgerInBatch = Number(rawEvent.ledger);
      }
    }

    pageCount++;

    const nextCursor = rawResponse.cursor;

    // DO NOT terminate pagination merely because events.length < limit.
    // Continue following nextCursor if nextCursor exists and has changed.
    if (nextCursor && nextCursor !== currentCursor) {
      currentCursor = nextCursor;
      continue;
    }

    // Cursor pagination completed cleanly
    break;
  }

  return normalizedEvents;
}

/**
 * Inserts normalized discovered events into the notice_assignment_queue table.
 * Uses onConflict ignoreDuplicates strategy on event_id primary key for deterministic deduplication.
 *
 * @param {Array<Object>} normalizedEvents - Array of normalized event payloads
 * @returns {Promise<Object>} Summary object with insertedCount and status
 */
async function ingestDiscoveredEvents(normalizedEvents) {
  if (!Array.isArray(normalizedEvents) || normalizedEvents.length === 0) {
    return { insertedCount: 0, status: 'NO_EVENTS' };
  }

  // Idempotent insertion using upsert with ignoreDuplicates on event_id primary key
  const { data, error } = await supabase
    .from('notice_assignment_queue')
    .upsert(normalizedEvents, {
      onConflict: 'event_id',
      ignoreDuplicates: true
    })
    .select('event_id');

  if (error) {
    console.error('Failed to insert discovered events into notice_assignment_queue:', error.message);
    throw new Error(`Event Ingestion DB Error: ${error.message}`);
  }

  const insertedCount = data ? data.length : 0;
  return {
    insertedCount,
    status: 'SUCCESS'
  };
}

module.exports = {
  discoverInvoiceFundedEvents,
  ingestDiscoveredEvents
};
