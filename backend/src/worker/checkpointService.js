const { supabase } = require('../supabase');

const CHECKPOINT_KEY = 'soroban_rpc_last_ledger';

/**
 * Reads the current durable checkpoint from sync_state table.
 * @returns {Promise<number>} Current checkpoint ledger sequence
 */
async function getCurrentCheckpoint() {
  const { data, error } = await supabase
    .from('sync_state')
    .select('value')
    .eq('key', CHECKPOINT_KEY)
    .single();

  if (error || !data) {
    return 0;
  }

  return Number(data.value || 0);
}

/**
 * Calculates the safe checkpoint ledger sequence based on terminal vs non-terminal queue items.
 *
 * Checkpoint Safety Invariants:
 * 1. If any non-terminal items (DISCOVERED, PROCESSING, FAILED) exist, the safe checkpoint CANNOT
 *    advance past (MIN(nonTerminal.ledger_sequence) - 1).
 * 2. If ALL queued events up to ledger L are in terminal states (PROCESSED or FAILED_PERMANENT),
 *    the checkpoint can safely advance to L.
 *
 * @returns {Promise<number>} Highest safe checkpoint ledger sequence
 */
async function calculateSafeCheckpoint() {
  const currentCheckpoint = await getCurrentCheckpoint();

  // 1. Query non-terminal queue items (DISCOVERED, PROCESSING, FAILED)
  const { data: nonTerminalItems, error: nonTermErr } = await supabase
    .from('notice_assignment_queue')
    .select('ledger_sequence')
    .in('status', ['DISCOVERED', 'PROCESSING', 'FAILED'])
    .order('ledger_sequence', { ascending: true })
    .limit(1);

  if (nonTermErr) {
    console.error('[CheckpointService] Error querying non-terminal queue items:', nonTermErr.message);
    return currentCheckpoint;
  }

  if (nonTerminalItems && nonTerminalItems.length > 0) {
    const minNonTerminalLedger = Number(nonTerminalItems[0].ledger_sequence);
    // Safe checkpoint upper bound is (minNonTerminalLedger - 1)
    const safeBound = minNonTerminalLedger - 1;
    return Math.max(currentCheckpoint, safeBound);
  }

  // 2. If NO non-terminal items exist, query MAX(ledger_sequence) among terminal items (PROCESSED, FAILED_PERMANENT)
  const { data: terminalItems, error: termErr } = await supabase
    .from('notice_assignment_queue')
    .select('ledger_sequence')
    .in('status', ['PROCESSED', 'FAILED_PERMANENT'])
    .order('ledger_sequence', { ascending: false })
    .limit(1);

  if (termErr) {
    console.error('[CheckpointService] Error querying terminal queue items:', termErr.message);
    return currentCheckpoint;
  }

  if (terminalItems && terminalItems.length > 0) {
    const maxTerminalLedger = Number(terminalItems[0].ledger_sequence);
    return Math.max(currentCheckpoint, maxTerminalLedger);
  }

  return currentCheckpoint;
}

/**
 * Advances the sync_state.last_processed_ledger checkpoint if safe to do so.
 *
 * @returns {Promise<Object>} Summary object showing whether checkpoint advanced
 */
async function advanceCheckpoint() {
  const currentCheckpoint = await getCurrentCheckpoint();
  const safeCheckpoint = await calculateSafeCheckpoint();

  if (safeCheckpoint <= currentCheckpoint) {
    return {
      advanced: false,
      currentCheckpoint,
      safeCheckpoint
    };
  }

  const { error } = await supabase
    .from('sync_state')
    .upsert({
      key: CHECKPOINT_KEY,
      value: safeCheckpoint,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('[CheckpointService] Error updating sync_state checkpoint:', error.message);
    throw new Error(`Checkpoint update error: ${error.message}`);
  }

  console.log(`[CheckpointService] Checkpoint safely advanced: ${currentCheckpoint} -> ${safeCheckpoint}`);

  return {
    advanced: true,
    previousCheckpoint: currentCheckpoint,
    newCheckpoint: safeCheckpoint
  };
}

module.exports = {
  getCurrentCheckpoint,
  calculateSafeCheckpoint,
  advanceCheckpoint
};
