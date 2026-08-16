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

  let currentCursor = null;
  let pageCount = 0;
  // Safety guard against infinite loops in RPC pagination
  const maxPages = 50;

  while (pageCount < maxPages) {
    let rawResponse;
    try {
      rawResponse = await sorobanClient.fetchRawContractEvents({
        startLedger: currentCursor ? undefined : startLedger,
        contractId: targetContractId,
        cursor: currentCursor,
        limit
      });
    } catch (err) {
      console.warn(`RPC event fetch warning on page ${pageCount + 1}: ${err.message}`);
      // If error occurs on page 2+, return events collected from earlier pages cleanly
      break;
    }

    if (!rawResponse || !Array.isArray(rawResponse.events) || rawResponse.events.length === 0) {
      break;
    }

    let newlyAddedOnPage = 0;
    for (const rawEvent of rawResponse.events) {
      const normalized = normalizeEvent(rawEvent, targetContractId);
      if (normalized && !seenEventIds.has(normalized.event_id)) {
        seenEventIds.add(normalized.event_id);
        normalizedEvents.push(normalized);
        newlyAddedOnPage++;
      }
    }

    pageCount++;

    // Pagination continuation check:
    // If response provides no cursor, or if cursor hasn't changed, or if fewer events than limit were returned
    const nextCursor = rawResponse.cursor;
    if (!nextCursor || nextCursor === currentCursor || rawResponse.events.length < limit) {
      break;
    }

    currentCursor = nextCursor;
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
