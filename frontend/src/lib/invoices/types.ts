/**
 * InvoiceFi Level 4 Data Models & Types
 * Represents normalized invoice state for the frontend application.
 */

// Soroban Contract On-Chain Lifecycle States
export type InvoiceLifecycleState =
  | 'Created'
  | 'Tokenized'
  | 'Funded'
  | 'Repaid'
  | 'Closed'
  | 'Cancelled';

// UI Presentation Status (Includes UI-derived 'Overdue' state)
export type InvoiceStatus =
  | 'Open'
  | 'Funding'
  | 'Funded'
  | 'Repaid'
  | 'Overdue'
  | 'Cancelled';

export interface Invoice {
  id: string; // e.g. "INV-2026-0042"
  clientName: string;
  faceValue: number; // Invoice total face value in USD
  advanceAmount: number; // Advance funding amount in USD
  fundedAmount: number; // Current funded amount in USD
  repaymentAmount?: number; // Expected or actual repayment amount in USD
  lifecycleState: InvoiceLifecycleState;
  issuedDate: string; // ISO date string
  dueDate: string; // ISO date string
  freelancerWallet: string; // Wallet public key of invoice creator
  investorWallet?: string; // Wallet public key of funding investor
  contractId?: string; // Deployed Soroban contract address (if tokenized)
  stellarMemo?: string; // Notice of Assignment settlement memo (if funded)
  txHash?: string; // On-chain transaction hash (if available)
  description?: string; // B2B service/goods description
}

export interface InvoiceSummary {
  totalInvoices: number;
  activeInvoices: number;
  totalFaceValue: number;
  totalFundedValue: number;
  totalRepaidValue: number;
}

export interface InvoiceActionHint {
  actionKey: 'tokenize' | 'fund' | 'repay' | 'claim' | 'close' | 'view';
  label: string;
  description: string;
  enabled: boolean;
  role: 'freelancer' | 'investor' | 'repayer' | 'viewer';
}
