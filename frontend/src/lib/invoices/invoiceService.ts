import { Invoice, InvoiceStatus, InvoiceSummary, InvoiceActionHint, InvoiceLifecycleState, NoAQueueStatus } from './types';
import { MOCK_INVOICES } from './mockInvoices';

export const INVOICE_CONTRACT_ID = process.env.NEXT_PUBLIC_INVOICE_CONTRACT_ID || 'CCG2BPR7NEQPV4XOLABSZOWSU24CBJXF4V7LEXIXMAMBPIL6P5CPO2YR';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// Local in-memory invoice store to preserve newly created/tokenized invoices during session
const createdInvoicesStore: Invoice[] = [];

/**
 * Adds a newly created invoice record to normalized state.
 */
export function addCreatedInvoice(invoice: Invoice): void {
  const existingIdx = createdInvoicesStore.findIndex(i =>
    i.id === invoice.id || (i.onChainId && invoice.onChainId && i.onChainId === invoice.onChainId)
  );
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
  const foundInStore = createdInvoicesStore.find(i => i.id === invoiceId || String(i.onChainId) === invoiceId.replace('INV-', ''));
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
 * Updates an invoice record state to Funded upon on-chain reconciliation.
 */
export function updateInvoiceToFunded(invoiceId: string, investorWallet: string, fundedAmount: number): boolean {
  const targetId = invoiceId;
  const numId = Number(invoiceId.replace('INV-', ''));

  // Sync off-chain database status to FUNDED in Supabase
  const targetParam = !isNaN(numId) && numId > 0 ? String(numId) : invoiceId;
  fetch(`${BACKEND_URL}/api/invoices/${encodeURIComponent(targetParam)}/funded`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ investor_address: investorWallet, funding_amount: fundedAmount })
  }).catch(() => null);

  const foundInStore = createdInvoicesStore.find(i => i.id === targetId || i.onChainId === numId);
  if (foundInStore) {
    foundInStore.lifecycleState = 'Funded';
    foundInStore.investorWallet = investorWallet;
    foundInStore.fundedAmount = fundedAmount;
  }

  const foundInMock = MOCK_INVOICES.find(i => i.id === targetId || i.onChainId === numId);
  if (foundInMock) {
    foundInMock.lifecycleState = 'Funded';
    foundInMock.investorWallet = investorWallet;
    foundInMock.fundedAmount = fundedAmount;
  }

  return true;
}

/**
 * Updates an invoice record state to Repaid upon on-chain reconciliation.
 */
export function updateInvoiceToRepaid(invoiceId: string): boolean {
  const targetId = invoiceId;
  const numId = Number(invoiceId.replace('INV-', ''));

  // Sync off-chain database status to REPAID in Supabase
  const targetParam = !isNaN(numId) && numId > 0 ? String(numId) : invoiceId;
  fetch(`${BACKEND_URL}/api/invoices/${encodeURIComponent(targetParam)}/repaid`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }).catch(() => null);

  const foundInStore = createdInvoicesStore.find(i => i.id === targetId || i.onChainId === numId);
  if (foundInStore) {
    foundInStore.lifecycleState = 'Repaid';
  }

  const foundInMock = MOCK_INVOICES.find(i => i.id === targetId || i.onChainId === numId);
  if (foundInMock) {
    foundInMock.lifecycleState = 'Repaid';
  }

  return true;
}

/**
 * Updates an invoice record state to Closed upon on-chain reconciliation.
 */
export function updateInvoiceToClosed(invoiceId: string): boolean {
  const targetId = invoiceId;
  const numId = Number(invoiceId.replace('INV-', ''));

  // Sync off-chain database status to CLOSED in Supabase
  const targetParam = !isNaN(numId) && numId > 0 ? String(numId) : invoiceId;
  fetch(`${BACKEND_URL}/api/invoices/${encodeURIComponent(targetParam)}/closed`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }).catch(() => null);

  const foundInStore = createdInvoicesStore.find(i => i.id === targetId || i.onChainId === numId);
  if (foundInStore) {
    foundInStore.lifecycleState = 'Closed';
  }

  const foundInMock = MOCK_INVOICES.find(i => i.id === targetId || i.onChainId === numId);
  if (foundInMock) {
    foundInMock.lifecycleState = 'Closed';
  }

  return true;
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
 * Fetches invoices from backend REST API and merges with session createdInvoicesStore and MOCK_INVOICES.
 */
export async function getInvoices(walletAddress?: string): Promise<Invoice[]> {
  if (walletAddress) {
    // Parameter referenced
  }

  let backendInvoices: Invoice[] = [];

  try {
    const res = await fetch(`${BACKEND_URL}/api/invoices`).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.invoices)) {
        backendInvoices = data.invoices.map((dbInv: {
          id: string;
          client_ref: string;
          on_chain_id?: number | string;
          client_name: string;
          face_value: number | string;
          funding_amount: number | string;
          repayment_amount?: number | string;
          status?: string;
          created_at?: string;
          due_date?: string;
          freelancer_address: string;
          investor_address?: string;
          description?: string;
        }) => {
          const onChainIdNum = dbInv.on_chain_id ? Number(dbInv.on_chain_id) : undefined;
          const displayId = onChainIdNum ? `INV-${onChainIdNum}` : `INV-${dbInv.client_ref.slice(-6)}`;

          let lifecycleState: InvoiceLifecycleState = 'Created';
          if (dbInv.status === 'TOKENIZED') lifecycleState = 'Tokenized';
          if (dbInv.status === 'FUNDED') lifecycleState = 'Funded';
          if (dbInv.status === 'REPAID') lifecycleState = 'Repaid';
          if (dbInv.status === 'CLOSED') lifecycleState = 'Closed';

          return {
            id: displayId,
            clientName: dbInv.client_name,
            faceValue: Number(dbInv.face_value),
            advanceAmount: Number(dbInv.funding_amount),
            fundedAmount: dbInv.status === 'FUNDED' ? Number(dbInv.funding_amount) : 0,
            repaymentAmount: Number(dbInv.repayment_amount || dbInv.face_value),
            lifecycleState,
            issuedDate: dbInv.created_at ? new Date(dbInv.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            dueDate: dbInv.due_date ? new Date(dbInv.due_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            freelancerWallet: dbInv.freelancer_address,
            investorWallet: dbInv.investor_address || undefined,
            contractId: INVOICE_CONTRACT_ID,
            onChainId: onChainIdNum,
            clientRef: dbInv.client_ref,
            stellarMemo: onChainIdNum ? `INV-${onChainIdNum}` : undefined,
            description: dbInv.description || `B2B Receivable issued to ${dbInv.client_name}`
          };
        });
      }
    }
  } catch {
    // Fallback if backend server offline
  }

  // Merge map by id & onChainId
  const allMap = new Map<string, Invoice>();
  MOCK_INVOICES.forEach(i => allMap.set(i.id, i));
  backendInvoices.forEach(i => allMap.set(i.id, i));
  createdInvoicesStore.forEach(i => allMap.set(i.id, i));

  return Array.from(allMap.values());
}

/**
 * Fetches a single invoice by ID, onChainId, or clientRef.
 */
export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const all = await getInvoices();

  const numSearch = Number(id.replace('INV-', ''));
  const isNum = !isNaN(numSearch) && numSearch > 0;

  const found = all.find(i =>
    i.id === id ||
    i.clientRef === id ||
    (isNum && i.onChainId === numSearch)
  );

  return found || null;
}

/**
 * Fetches Notice of Assignment queue status for an onChainId or clientRef from backend.
 */
export async function fetchBackendNoAStatus(
  onChainId?: number,
  clientRef?: string
): Promise<{ status: NoAQueueStatus; noa?: { reference: string; processedAt?: string; memo?: string } | null }> {
  try {
    let url = `${BACKEND_URL}/api/invoices/${onChainId || 0}/noa`;
    if (clientRef) {
      url += `?client_ref=${encodeURIComponent(clientRef)}`;
    }

    const res = await fetch(url).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      if (data.success) {
        return {
          status: data.status as NoAQueueStatus,
          noa: data.noa || null
        };
      }
    }
  } catch {
    // Catch fetch network errors
  }
  return { status: 'NONE', noa: null };
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
