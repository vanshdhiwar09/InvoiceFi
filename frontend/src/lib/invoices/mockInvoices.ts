import { Invoice } from './types';

/**
 * Local structured demo invoice dataset for visual development.
 * Decoupled from UI components and normalized to the Invoice model.
 * Level 4 single-investor lifecycle: investor is UNDEFINED on Tokenized invoices until funded.
 */
export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'INV-2026-0042',
    clientName: 'Acme Textiles Pvt Ltd',
    faceValue: 12400.00,
    advanceAmount: 10540.00,
    fundedAmount: 10540.00,
    repaymentAmount: 10980.00,
    lifecycleState: 'Funded',
    issuedDate: '2026-08-01',
    dueDate: '2026-09-14',
    freelancerWallet: 'GC4K7V2N6...Q0P8',
    investorWallet: 'GA8W9P3B1...M4L2',
    contractId: 'CCG2BPR7NEQPV4XOLABSZOWSU24CBJXF4V7LEXIXMAMBPIL6P5CPO2YR',
    stellarMemo: 'NOA-0042-SETTLE',
    description: 'Enterprise Textile Export Shipment & Logistics Services'
  },
  {
    id: 'INV-2026-0089',
    clientName: 'Global Tech Solutions Inc',
    faceValue: 25000.00,
    advanceAmount: 21250.00,
    fundedAmount: 0.00,
    repaymentAmount: 22100.00,
    lifecycleState: 'Tokenized',
    issuedDate: '2026-08-10',
    dueDate: '2026-09-28',
    freelancerWallet: 'GC4K7V2N6...Q0P8',
    investorWallet: undefined, // Prospective funding state: investor is established upon invest()
    contractId: 'CCG2BPR7NEQPV4XOLABSZOWSU24CBJXF4V7LEXIXMAMBPIL6P5CPO2YR',
    description: 'Quarterly Cloud Architecture & Security Audit Deliverables'
  },
  {
    id: 'INV-2026-0112',
    clientName: 'Apex Manufacturing Co',
    faceValue: 8500.00,
    advanceAmount: 7225.00,
    fundedAmount: 7225.00,
    repaymentAmount: 7550.00,
    lifecycleState: 'Repaid',
    issuedDate: '2026-07-05',
    dueDate: '2026-08-10',
    freelancerWallet: 'GC4K7V2N6...Q0P8',
    investorWallet: 'GA8W9P3B1...M4L2',
    contractId: 'CCG2BPR7NEQPV4XOLABSZOWSU24CBJXF4V7LEXIXMAMBPIL6P5CPO2YR',
    stellarMemo: 'NOA-0112-SETTLE',
    txHash: 'a4b8c9d0...e1f2',
    description: 'Precision Metal Components Supply'
  },
  {
    id: 'INV-2026-0145',
    clientName: 'Horizon Logistics Ltd',
    faceValue: 16500.00,
    advanceAmount: 14025.00,
    fundedAmount: 0.00,
    lifecycleState: 'Created',
    issuedDate: '2026-08-12',
    dueDate: '2026-09-30',
    freelancerWallet: 'GC4K7V2N6...Q0P8',
    investorWallet: undefined,
    description: 'Freight Forwarding & Customs Clearance'
  },
  {
    id: 'INV-2026-0018',
    clientName: 'Starlight Retail Outlets',
    faceValue: 9800.00,
    advanceAmount: 8330.00,
    fundedAmount: 0.00,
    repaymentAmount: 8700.00,
    lifecycleState: 'Tokenized',
    issuedDate: '2026-06-01',
    dueDate: '2026-07-15',
    freelancerWallet: 'GC4K7V2N6...Q0P8',
    investorWallet: undefined,
    contractId: 'CCG2BPR7NEQPV4XOLABSZOWSU24CBJXF4V7LEXIXMAMBPIL6P5CPO2YR',
    description: 'Retail POS Software License Renewal'
  }
];
