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

export function deriveInvoiceStatus(invoice, nowString) {
  const currentDate = nowString ? new Date(nowString) : new Date();
  const due = new Date(invoice.dueDate);

  if (invoice.lifecycleState === 'Cancelled') return 'Cancelled';
  if (invoice.lifecycleState === 'Repaid' || invoice.lifecycleState === 'Closed') return 'Repaid';
  if (invoice.lifecycleState === 'Funded') return 'Funded';
  if (due < currentDate) return 'Overdue';
  if (invoice.lifecycleState === 'Tokenized') {
    return invoice.fundedAmount > 0 ? 'Funding' : 'Open';
  }
  return 'Open';
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

    if (status === 'Repaid') {
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
