const { scValToNative } = require('@stellar/stellar-sdk');

/**
 * Validates and normalizes a raw Soroban RPC event into a standard queue object.
 * Returns null if the event does not belong to the target contract, is not an
 * invoice_funded event, or is malformed.
 *
 * @param {Object} rawEvent - Raw event object from Soroban RPC getEvents
 * @param {string} expectedContractId - Configured InvoiceContract ID
 * @returns {Object|null} Normalized event payload object or null if rejected
 */
function normalizeEvent(rawEvent, expectedContractId) {
  if (!rawEvent) return null;

  // 1. Contract Address Filtering
  const rawContractId = rawEvent.contractId
    ? rawEvent.contractId.toString()
    : null;

  if (expectedContractId && rawContractId && rawContractId !== expectedContractId) {
    return null;
  }

  // 2. Event Type & Success Validation
  if (rawEvent.type !== 'contract' || rawEvent.inSuccessfulContractCall === false) {
    return null;
  }

  // 3. Topic Decoding & Invoice Funded Symbol Filtering
  let decodedTopics;
  try {
    if (!Array.isArray(rawEvent.topic) || rawEvent.topic.length < 2) {
      return null;
    }
    decodedTopics = rawEvent.topic.map(t => scValToNative(t));
  } catch (err) {
    return null;
  }

  const eventSymbol = String(decodedTopics[0]);
  if (eventSymbol !== 'invoice_funded') {
    return null;
  }

  const invoiceIdRaw = decodedTopics[1];
  const invoiceId = Number(invoiceIdRaw);
  if (isNaN(invoiceId) || invoiceId <= 0) {
    return null;
  }

  // 4. Value Payload Decoding
  let decodedValue;
  try {
    decodedValue = scValToNative(rawEvent.value);
  } catch (err) {
    return null;
  }

  if (!Array.isArray(decodedValue) || decodedValue.length < 4) {
    return null;
  }

  const [freelancerAddress, investorAddress, fundingAmountRaw, tokenAddress] = decodedValue;

  if (!freelancerAddress || !investorAddress || !fundingAmountRaw || !tokenAddress) {
    return null;
  }

  // 5. Deterministic Identity & Normalized Output
  const eventId = String(rawEvent.id);
  const ledgerSequence = Number(rawEvent.ledger);
  const txHash = String(rawEvent.txHash);
  const fundingAmountStr = fundingAmountRaw.toString();

  return {
    event_id: eventId,
    invoice_id: invoiceId,
    ledger_sequence: ledgerSequence,
    tx_hash: txHash,
    freelancer_address: String(freelancerAddress),
    investor_address: String(investorAddress),
    funding_amount: fundingAmountStr,
    token_address: String(tokenAddress),
    status: 'DISCOVERED',
    retry_count: 0
  };
}

module.exports = {
  normalizeEvent
};
