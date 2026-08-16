const { getCurrentCheckpoint, advanceCheckpoint } = require('./worker/checkpointService');
const { getLatestLedgerSequence } = require('./events/sorobanClient');
const { discoverInvoiceFundedEvents, ingestDiscoveredEvents } = require('./events/eventIngestionService');
const { processQueueOnce } = require('./worker/queueWorker');
const config = require('./config');

let isRunning = false;
let daemonIntervalHandle = null;

/**
 * Executes one iteration of the daemon loop:
 * 1. Read last processed ledger sequence checkpoint
 * 2. Discover & ingest new invoice_funded RPC events
 * 3. Process claimed queue items & simulate NoA notifications
 * 4. Safely advance checkpoint if all items up to ledger L reach terminal status
 */
async function runDaemonIteration() {
  if (isRunning) return;
  isRunning = true;

  try {
    // 1. Determine starting ledger sequence for discovery
    let startLedger = await getCurrentCheckpoint();
    if (startLedger === 0) {
      // Fallback if sync_state is empty: start from (latestLedger - 1000)
      const latestLedger = await getLatestLedgerSequence();
      startLedger = Math.max(1, latestLedger - 1000);
    }

    // 2. Discover & Ingest Soroban RPC events
    const discoveredEvents = await discoverInvoiceFundedEvents({
      startLedger,
      contractId: config.invoiceContractId,
      limit: 100
    });

    if (discoveredEvents.length > 0) {
      await ingestDiscoveredEvents(discoveredEvents);
    }

    // 3. Process claimed queue items & NoA simulation
    await processQueueOnce({ limit: 10, workerId: `render-worker-${process.pid}` });

    // 4. Safely advance checkpoint in sync_state table
    await advanceCheckpoint();

  } catch (err) {
    console.error(`[Daemon Loop Warning] ${err.message}`);
  } finally {
    isRunning = false;
  }
}

/**
 * Starts the continuous background daemon polling loop.
 * @param {number} [intervalMs=10000] - Polling interval in milliseconds
 */
function startDaemon(intervalMs = 10000) {
  if (daemonIntervalHandle) return;

  console.log(`[${new Date().toISOString()}] Starting Background Daemon Loop (Interval: ${intervalMs}ms)...`);
  
  // Run first iteration immediately
  runDaemonIteration();

  // Schedule recurring interval loop
  daemonIntervalHandle = setInterval(runDaemonIteration, intervalMs);
}

/**
 * Stops the continuous background daemon polling loop cleanly.
 */
function stopDaemon() {
  if (daemonIntervalHandle) {
    clearInterval(daemonIntervalHandle);
    daemonIntervalHandle = null;
    console.log(`[${new Date().toISOString()}] Background Daemon Loop Stopped.`);
  }
}

module.exports = {
  startDaemon,
  stopDaemon,
  runDaemonIteration
};
