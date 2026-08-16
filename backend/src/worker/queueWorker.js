const { supabase } = require('../supabase');
const { processNoticeOfAssignment } = require('./noticeOfAssignment');

/**
 * Claims eligible queue items for processing using atomic state transition to PROCESSING.
 * Stale PROCESSING locks (locked_until < NOW()) are also reclaimed cleanly.
 *
 * @param {Object} [params]
 * @param {number} [params.limit=10] - Maximum items to claim
 * @param {string} [params.workerId='worker-1'] - Worker instance identifier
 * @returns {Promise<Array<Object>>} Array of claimed queue item records
 */
async function claimQueueItems({ limit = 10, workerId = 'worker-1' } = {}) {
  const nowIso = new Date().toISOString();
  const lockUntilIso = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes lock duration

  // Query eligible queue items: DISCOVERED, FAILED (retry_count < 5), or stale PROCESSING locks
  const { data: eligibleItems, error: selectErr } = await supabase
    .from('notice_assignment_queue')
    .select('*')
    .or(`status.eq.DISCOVERED,and(status.eq.FAILED,retry_count.lt.5),and(status.eq.PROCESSING,locked_until.lt.${nowIso})`)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (selectErr) {
    console.error('[QueueWorker] Error fetching eligible queue items:', selectErr.message);
    throw new Error(`Queue select error: ${selectErr.message}`);
  }

  if (!eligibleItems || eligibleItems.length === 0) {
    return [];
  }

  const claimedItems = [];

  // Claim items individually with optimistic concurrency / lock update
  for (const item of eligibleItems) {
    const { data: updatedData, error: updateErr } = await supabase
      .from('notice_assignment_queue')
      .update({
        status: 'PROCESSING',
        locked_by: workerId,
        locked_until: lockUntilIso,
        updated_at: nowIso
      })
      .eq('event_id', item.event_id)
      .select('*');

    if (!updateErr && updatedData && updatedData.length > 0) {
      claimedItems.push(updatedData[0]);
    }
  }

  return claimedItems;
}

/**
 * Processes a single claimed queue item, executing Notice of Assignment simulation,
 * handling retries, updating terminal states (PROCESSED or FAILED_PERMANENT), and releasing locks.
 *
 * @param {Object} item - Queue item record
 * @returns {Promise<Object>} Execution result object
 */
async function processQueueItem(item) {
  if (!item || !item.event_id) {
    throw new Error('Invalid queue item provided to processQueueItem');
  }

  // Idempotency check: Skip if already terminal
  if (item.status === 'PROCESSED') {
    return { status: 'SKIPPED', message: 'Item already PROCESSED', event_id: item.event_id };
  }

  if (item.status === 'FAILED_PERMANENT') {
    return { status: 'SKIPPED', message: 'Item is FAILED_PERMANENT', event_id: item.event_id };
  }

  const nowIso = new Date().toISOString();

  try {
    // Execute simulated Notice of Assignment processing
    const noaResult = await processNoticeOfAssignment(item);

    // On Success: Mark PROCESSED, set processed_at, release locks
    const { error: updateErr } = await supabase
      .from('notice_assignment_queue')
      .update({
        status: 'PROCESSED',
        processed_at: nowIso,
        locked_by: null,
        locked_until: null,
        last_error: null,
        updated_at: nowIso
      })
      .eq('event_id', item.event_id);

    if (updateErr) {
      throw new Error(`Failed to update status to PROCESSED: ${updateErr.message}`);
    }

    return {
      status: 'PROCESSED',
      event_id: item.event_id,
      invoice_id: item.invoice_id,
      noa: noaResult
    };

  } catch (err) {
    const currentRetryCount = typeof item.retry_count === 'number' ? item.retry_count : 0;
    const newRetryCount = currentRetryCount + 1;
    const isTerminalFailure = newRetryCount >= 5;
    const newStatus = isTerminalFailure ? 'FAILED_PERMANENT' : 'FAILED';

    console.warn(`[QueueWorker] Failure processing event ${item.event_id} (Attempt ${newRetryCount}/5): ${err.message}`);

    // Update status to FAILED or FAILED_PERMANENT, increment retry_count, store error, release lock
    const { error: updateErr } = await supabase
      .from('notice_assignment_queue')
      .update({
        status: newStatus,
        retry_count: newRetryCount,
        last_error: err.message,
        locked_by: null,
        locked_until: null,
        updated_at: nowIso
      })
      .eq('event_id', item.event_id);

    if (updateErr) {
      console.error(`[QueueWorker] Error updating failure state for ${item.event_id}:`, updateErr.message);
    }

    return {
      status: newStatus,
      event_id: item.event_id,
      invoice_id: item.invoice_id,
      retry_count: newRetryCount,
      error: err.message
    };
  }
}

/**
 * Runs a single iteration of the queue worker: claims eligible items and processes them.
 *
 * @param {Object} [params]
 * @param {number} [params.limit=10]
 * @param {string} [params.workerId='worker-1']
 * @returns {Promise<Object>} Summary statistics of the worker run
 */
async function processQueueOnce({ limit = 10, workerId = 'worker-1' } = {}) {
  const claimedItems = await claimQueueItems({ limit, workerId });

  const results = [];
  let processedCount = 0;
  let failedCount = 0;
  let permanentFailedCount = 0;

  for (const item of claimedItems) {
    const res = await processQueueItem(item);
    results.push(res);

    if (res.status === 'PROCESSED') {
      processedCount++;
    } else if (res.status === 'FAILED') {
      failedCount++;
    } else if (res.status === 'FAILED_PERMANENT') {
      permanentFailedCount++;
    }
  }

  return {
    claimedCount: claimedItems.length,
    processedCount,
    failedCount,
    permanentFailedCount,
    results
  };
}

module.exports = {
  claimQueueItems,
  processQueueItem,
  processQueueOnce
};
