import { Invoice, InvoiceStatus, InvoiceSummary, InvoiceActionHint } from './types';
import { MOCK_INVOICES } from './mockInvoices';

// Local in-memory invoice store to preserve newly created/tokenized invoices during session
const createdInvoicesStore: Invoice[] = [];

/**
 * Adds a newly created invoice record to normalized state.
 */
export function addCreatedInvoice(invoice: Invoice): void {
  const existingIdx = createdInvoicesStore.findIndex(i => i.id === invoice.id || (i.contractId && i.contractId === invoice.contractId));
  if (existingIdx >= 0) {
    createdInvoicesStore[existingIdx] = invoice;
  } else {
    createdInvoicesStore.unshift(invoice);
  }
}

/**
 * Updates an invoice record state to Tokenized.
 */
export function updateInvoiceToTokenized(invoiceId: string): boolean {
  const foundInStore = createdInvoicesStore.find(i => i.id === invoiceId);
  if (foundInStore) {
    foundInStore.lifecycleState = 'Tokenized';
    return true;
  }
  const foundInMock = MOCK_INVOICES.find(i => i.id === invoiceId);
  if (foundInMock) {
    foundInMock.lifecycleState = 'Tokenized';
    return true;
  }
  return false;
}

/**
 * Derives the UI presentation status from the normalized Invoice object.
 * 'Overdue' is a UI-derived presentation state only when dueDate < currentDate and not settled.
 */
export function deriveInvoiceStatus(invoice: Invoice, nowString?: string): InvoiceStatus {
  const currentDate = nowString ? new Date(nowString) : new Date();
  const due = new Date(invoice.dueDate);

  if (invoice.lifecycleState === 'Cancelled') {
    return 'Cancelled';
  }
  if (invoice.lifecycleState === 'Repaid' || invoice.lifecycleState === 'Closed') {
    return 'Repaid';
  }
  if (invoice.lifecycleState === 'Funded') {
    return 'Funded';
  }

  // Check if overdue
  if (due < currentDate) {
    return 'Overdue';
  }

  if (invoice.lifecycleState === 'Tokenized') {
    return invoice.fundedAmount > 0 ? 'Funding' : 'Open';
  }

  return 'Open';
}

/**
 * Calculates dashboard summary metrics from an array of normalized invoices.
 */
export function getInvoiceSummary(invoices: Invoice[], nowString?: string): InvoiceSummary {
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

/**
 * Filters normalized invoices by UI presentation status tab.
 */
export function filterInvoices(invoices: Invoice[], statusFilter: string, nowString?: string): Invoice[] {
  if (!statusFilter || statusFilter === 'All') {
    return invoices;
  }

  return invoices.filter((inv) => {
    const status = deriveInvoiceStatus(inv, nowString);
    return status.toLowerCase() === statusFilter.toLowerCase();
  });
}

/**
 * Formats monetary amounts in standard USD currency string.
 */
export function formatCurrency(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Formats native Stellar XLM asset values cleanly (e.g. 1,000 XLM).
 */
export function formatXlm(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0 XLM';
  }
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
  return `${formatted} XLM`;
}

/**
 * Formats ISO date strings into clean editorial date format (e.g. 14 Sep 2026).
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

/**
 * Fetches invoices for a given wallet address. Combines newly created invoices with mock data.
 */
export async function getInvoices(walletAddress?: string): Promise<Invoice[]> {
  if (walletAddress) {
    // Keep walletAddress param referenced
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
  return [...createdInvoicesStore, ...MOCK_INVOICES];
}

/**
 * Fetches a single invoice by ID.
 */
export async function getInvoiceById(id: string): Promise<Invoice | null> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const foundCreated = createdInvoicesStore.find((inv) => inv.id === id);
  if (foundCreated) return foundCreated;

  const foundMock = MOCK_INVOICES.find((inv) => inv.id === id);
  return foundMock || null;
}

/**
 * Determines role-aware action hints for an invoice based on wallet address and lifecycle state.
 */
export function getInvoiceActions(invoice: Invoice, walletAddress?: string): InvoiceActionHint {
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
          description: 'Your invoice is tokenized on Stellar Testnet and awaiting investor liquidity.',
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
          enabled: true,
          role: 'investor'
        };
      }
      return {
        actionKey: 'repay',
        label: 'Simulate Settlement',
        description: 'Simulate client repayment with Notice of Assignment memo.',
        enabled: true,
        role: 'repayer'
      };

    case 'Repaid':
      return {
        actionKey: 'claim',
        label: 'Claim Investor Returns',
        description: 'Disburse principal plus return to investor wallet.',
        enabled: isRecordedInvestor || !invoice.investorWallet,
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
