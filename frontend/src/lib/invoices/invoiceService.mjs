/**
 * Node Test Runner ES Module mirror for invoiceService unit tests.
 */
const createdInvoicesStore = [];

export function addCreatedInvoice(invoice) {
  const existingIdx = createdInvoicesStore.findIndex(i => i.id === invoice.id || (i.onChainId && invoice.onChainId && i.onChainId === invoice.onChainId));
  if (existingIdx >= 0) {
    createdInvoicesStore[existingIdx] = invoice;
  } else {
    createdInvoicesStore.unshift(invoice);
  }
}

export function updateInvoiceToTokenized(invoiceId) {
  const found = createdInvoicesStore.find(i => i.id === invoiceId || String(i.onChainId) === String(invoiceId).replace('INV-', ''));
  if (found) {
    found.lifecycleState = 'Tokenized';
    return true;
  }
  return false;
}

export function updateInvoiceToFunded(invoiceId, investorWallet, fundedAmount) {
  const targetId = invoiceId;
  const numId = Number(String(invoiceId).replace('INV-', ''));

  const foundInStore = createdInvoicesStore.find(i => i.id === targetId || i.onChainId === numId);
  if (foundInStore) {
    foundInStore.lifecycleState = 'Funded';
    foundInStore.investorWallet = investorWallet;
    foundInStore.fundedAmount = fundedAmount;
    return true;
  }
  return false;
}

export function updateInvoiceToRepaid(invoiceId) {
  const targetId = invoiceId;
  const numId = Number(String(invoiceId).replace('INV-', ''));

  const foundInStore = createdInvoicesStore.find(i => i.id === targetId || i.onChainId === numId);
  if (foundInStore) {
    foundInStore.lifecycleState = 'Repaid';
    return true;
  }
  return false;
}

export function updateInvoiceToClosed(invoiceId) {
  const targetId = invoiceId;
  const numId = Number(String(invoiceId).replace('INV-', ''));

  const foundInStore = createdInvoicesStore.find(i => i.id === targetId || i.onChainId === numId);
  if (foundInStore) {
    foundInStore.lifecycleState = 'Closed';
    return true;
  }
  return false;
}

export function mapSorobanStatusToLifecycleState(rawStatus) {
  if (rawStatus === undefined || rawStatus === null) return 'Created';
  let code = rawStatus;
  if (typeof rawStatus === 'object' && rawStatus !== null && 'name' in rawStatus) {
    code = rawStatus.name || 0;
  }
  const num = Number(code);
  if (!isNaN(num)) {
    switch (num) {
      case 0: return 'Created';
      case 1: return 'Tokenized';
      case 2: return 'Funded';
      case 3: return 'Repaid';
      case 4: return 'Closed';
      case 5: return 'Cancelled';
    }
  }
  const str = String(code).trim().toLowerCase();
  if (str === 'created' || str === '0') return 'Created';
  if (str === 'tokenized' || str === '1') return 'Tokenized';
  if (str === 'funded' || str === '2') return 'Funded';
  if (str === 'repaid' || str === '3') return 'Repaid';
  if (str === 'closed' || str === '4') return 'Closed';
  if (str === 'cancelled' || str === 'canceled' || str === '5') return 'Cancelled';
  return 'Created';
}

export function deriveInvoiceStatus(invoice, nowString) {
  const currentDate = nowString ? new Date(nowString) : new Date();
  const due = new Date(invoice.dueDate);

  if (invoice.lifecycleState === 'Cancelled') return 'Cancelled';
  if (invoice.lifecycleState === 'Closed') return 'Closed';
  if (invoice.lifecycleState === 'Repaid') return 'Repaid';
  if (invoice.lifecycleState === 'Funded') return 'Funded';
  if (due < currentDate) return 'Overdue';
  if (invoice.lifecycleState === 'Tokenized') {
    return invoice.fundedAmount > 0 ? 'Funding' : 'Tokenized';
  }
  return 'Created';
}

export function getInvoiceSummary(invoices, nowString) {
  let activeInvoices = 0;
  let totalFaceValue = 0;
  let totalFundedValue = 0;
  let totalRepaidValue = 0;

  invoices.forEach((inv) => {
    const status = deriveInvoiceStatus(inv, nowString);
    totalFaceValue += inv.faceValue;
    totalFundedValue += inv.fundedAmount;

    if (status === 'Repaid' || status === 'Closed') {
      totalRepaidValue += (inv.repaymentAmount || inv.faceValue);
    } else if (status !== 'Cancelled') {
      activeInvoices += 1;
    }
  });

  return {
    totalInvoices: invoices.length,
    activeInvoices,
    totalFaceValue,
    totalFundedValue,
    totalRepaidValue
  };
}

export function filterInvoices(invoices, statusFilter, nowString) {
  if (!statusFilter || statusFilter === 'All') return invoices;
  return invoices.filter((inv) => {
    const status = deriveInvoiceStatus(inv, nowString);
    return status.toLowerCase() === statusFilter.toLowerCase();
  });
}

export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 XLM';
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
  return `${formatted} XLM`;
}

export function formatXlm(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 XLM';
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
  return `${formatted} XLM`;
}

export function getInvoiceActions(invoice, walletAddress) {
  const isConnected = !!walletAddress;
  const isFreelancer = isConnected && walletAddress === invoice.freelancerWallet;
  const isRecordedInvestor = isConnected && !!invoice.investorWallet && walletAddress === invoice.investorWallet;

  switch (invoice.lifecycleState) {
    case 'Created':
      return {
        actionKey: 'tokenize',
        label: 'Tokenize Invoice',
        description: 'Mint Soroban smart contract asset on Stellar Testnet.',
        enabled: isFreelancer,
        role: isFreelancer ? 'freelancer' : 'viewer'
      };

    case 'Tokenized':
      if (isFreelancer) {
        return {
          actionKey: 'view',
          label: 'Waiting for Investor Funding',
          description: 'You\'re the invoice owner. Connect a different wallet to fund.',
          enabled: false,
          role: 'freelancer'
        };
      }
      return {
        actionKey: 'fund',
        label: isConnected ? 'Fund Invoice Escrow' : 'Connect Wallet to Fund',
        description: isConnected
          ? 'Deposit testnet liquidity into Soroban escrow contract.'
          : 'Connect your Freighter, Albedo, or xBull wallet to fund this invoice.',
        enabled: isConnected,
        role: 'investor'
      };

    case 'Funded':
      if (isRecordedInvestor) {
        return {
          actionKey: 'repay',
          label: 'Awaiting Repayment Settlement',
          description: 'Invoice is funded. Awaiting client Notice of Assignment settlement.',
          enabled: false,
          role: 'investor'
        };
      }
      return {
        actionKey: 'view',
        label: 'Funding Unavailable',
        description: 'Invoice is funded and awaiting repayment settlement.',
        enabled: false,
        role: 'viewer'
      };

    case 'Repaid':
      return {
        actionKey: 'claim',
        label: 'Claim Investor Returns',
        description: 'Disburse principal plus return to investor wallet.',
        enabled: true,
        role: 'investor'
      };

    case 'Closed':
      return {
        actionKey: 'view',
        label: 'Settlement Complete — Invoice Closed',
        description: 'Invoice lifecycle fully completed and closed on Stellar Testnet.',
        enabled: false,
        role: 'viewer'
      };

    default:
      return {
        actionKey: 'view',
        label: 'Invoice Closed',
        description: 'Invoice lifecycle fully completed on Stellar Testnet.',
        enabled: false,
        role: 'viewer'
      };
  }
}
