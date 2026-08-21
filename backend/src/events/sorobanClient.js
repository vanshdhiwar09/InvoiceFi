const { rpc } = require('@stellar/stellar-sdk');
const config = require('../config');

// Initialize Soroban RPC Server Client
const rpcServer = new rpc.Server(config.stellarRpcUrl);

/**
 * Fetches current latest ledger sequence from Soroban RPC.
 * @returns {Promise<number>} Latest ledger sequence number
 */
async function getLatestLedgerSequence() {
  const latestLedgerInfo = await rpcServer.getLatestLedger();
  return latestLedgerInfo.sequence;
}

/**
 * Fetches raw events from Soroban RPC for a contract.
 * @param {Object} params
 * @param {number} params.startLedger - Starting ledger sequence number
 * @param {string} [params.contractId] - Target contract ID (defaults to configured invoiceContractId)
 * @param {string} [params.cursor] - Optional RPC pagination cursor
 * @param {number} [params.limit=100] - Event fetch limit per request
 * @returns {Promise<Object>} Raw RPC response object containing events and pagination metadata
 */
async function fetchRawContractEvents({ startLedger, contractId, cursor, limit = 100 }) {
  const targetContractId = contractId || config.invoiceContractId;

  if (!targetContractId) {
    throw new Error('InvoiceContract ID is not configured');
  }

  const options = {
    filters: [
      {
        type: 'contract',
        contractIds: [targetContractId]
      }
    ],
    limit
  };

  // Stellar SDK Server.getEvents(request) expects top-level cursor or startLedger properties:
  // - Initial page: { filters, startLedger, limit }
  // - Cursor page: { filters, cursor, limit }
  if (cursor) {
    options.cursor = cursor;
  } else if (startLedger !== undefined && startLedger !== null && Number(startLedger) > 0) {
    options.startLedger = Number(startLedger);
  }

  return await rpcServer.getEvents(options);
}

module.exports = {
  rpcServer,
  getLatestLedgerSequence,
  fetchRawContractEvents
};
