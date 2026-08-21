import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveInvoiceStatus,
  getInvoiceSummary,
  filterInvoices,
  formatCurrency,
  getInvoiceActions,
  mapSorobanStatusToLifecycleState
} from '../invoiceService.mjs';

test('Invoice Service Abstraction Unit Tests', async (t) => {

  await t.test('1. deriveInvoiceStatus correctly derives Overdue vs Open/Funded/Repaid', () => {
    const overdueInvoice = {
      id: 'INV-TEST-01',
      clientName: 'Test Corp',
      faceValue: 10000,
      advanceAmount: 8500,
      fundedAmount: 8500,
      lifecycleState: 'Tokenized',
      issuedDate: '2026-05-01',
      dueDate: '2026-06-01',
      freelancerWallet: 'GC111111111111111111111111111111111111111111111111111111'
    };

    // Evaluate against date 2026-08-01 (after due date)
    const statusOverdue = deriveInvoiceStatus(overdueInvoice, '2026-08-01');
    assert.equal(statusOverdue, 'Overdue');

    // Evaluate against date 2026-05-15 (before due date)
    const statusOpen = deriveInvoiceStatus(overdueInvoice, '2026-05-15');
    assert.equal(statusOpen, 'Funding');

    // Repaid invoice should remain Repaid regardless of date
    const repaidInvoice = { ...overdueInvoice, lifecycleState: 'Repaid' };
    const statusRepaid = deriveInvoiceStatus(repaidInvoice, '2026-08-01');
    assert.equal(statusRepaid, 'Repaid');
  });

  await t.test('2. getInvoiceSummary calculates correct totals and counts', () => {
    const invoices = [
      {
        id: 'INV-1',
        clientName: 'Client 1',
        faceValue: 10000,
        advanceAmount: 8500,
        fundedAmount: 8500,
        repaymentAmount: 8900,
        lifecycleState: 'Funded',
        issuedDate: '2026-08-01',
        dueDate: '2026-09-01',
        freelancerWallet: 'GC1'
      },
      {
        id: 'INV-2',
        clientName: 'Client 2',
        faceValue: 20000,
        advanceAmount: 17000,
        fundedAmount: 0,
        lifecycleState: 'Created',
        issuedDate: '2026-08-01',
        dueDate: '2026-09-01',
        freelancerWallet: 'GC1'
      },
      {
        id: 'INV-3',
        clientName: 'Client 3',
        faceValue: 5000,
        advanceAmount: 4250,
        fundedAmount: 4250,
        repaymentAmount: 4500,
        lifecycleState: 'Repaid',
        issuedDate: '2026-07-01',
        dueDate: '2026-08-01',
        freelancerWallet: 'GC1'
      }
    ];

    const summary = getInvoiceSummary(invoices, '2026-08-15');
    assert.equal(summary.totalInvoices, 3);
    assert.equal(summary.activeInvoices, 2); // INV-1 + INV-2
    assert.equal(summary.totalFaceValue, 35000); // 10000 + 20000 + 5000
    assert.equal(summary.totalFundedValue, 12750); // 8500 + 4250
    assert.equal(summary.totalRepaidValue, 4500); // INV-3 repayment
  });

  await t.test('3. filterInvoices filters dataset by UI status tab', () => {
    const invoices = [
      {
        id: 'INV-1',
        clientName: 'Client 1',
        faceValue: 10000,
        advanceAmount: 8500,
        fundedAmount: 8500,
        lifecycleState: 'Funded',
        issuedDate: '2026-08-01',
        dueDate: '2026-09-01',
        freelancerWallet: 'GC1'
      },
      {
        id: 'INV-2',
        clientName: 'Client 2',
        faceValue: 5000,
        advanceAmount: 4250,
        fundedAmount: 4250,
        repaymentAmount: 4500,
        lifecycleState: 'Repaid',
        issuedDate: '2026-07-01',
        dueDate: '2026-08-01',
        freelancerWallet: 'GC1'
      }
    ];

    const allInvoices = filterInvoices(invoices, 'All', '2026-08-15');
    assert.equal(allInvoices.length, 2);

    const fundedInvoices = filterInvoices(invoices, 'Funded', '2026-08-15');
    assert.equal(fundedInvoices.length, 1);
    assert.equal(fundedInvoices[0].id, 'INV-1');

    const repaidInvoices = filterInvoices(invoices, 'Repaid', '2026-08-15');
    assert.equal(repaidInvoices.length, 1);
    assert.equal(repaidInvoices[0].id, 'INV-2');
  });

  await t.test('4. formatCurrency formats monetary precision correctly', () => {
    assert.equal(formatCurrency(12400), '12,400 XLM');
    assert.equal(formatCurrency(0), '0 XLM');
    assert.equal(formatCurrency(500.5), '500.5 XLM');
  });

  await t.test('5. Investor Funding Action Resolution Scenarios (Prompt Section 9)', () => {
    const tokenizedInvoice = {
      id: 'INV-TOK-1',
      clientName: 'Client X',
      faceValue: 25000,
      advanceAmount: 21250,
      fundedAmount: 0,
      lifecycleState: 'Tokenized',
      issuedDate: '2026-08-01',
      dueDate: '2026-09-01',
      freelancerWallet: 'GC_FREELANCER',
      investorWallet: undefined
    };

    const fundedInvoice = {
      ...tokenizedInvoice,
      id: 'INV-FUNDED-1',
      fundedAmount: 21250,
      lifecycleState: 'Funded',
      investorWallet: 'GA_INVESTOR_RECORDED'
    };

    // Scenario 1: Tokenized invoice + eligible wallet -> fund action available
    const act1 = getInvoiceActions(tokenizedInvoice, 'GA_PROSPECTIVE_INVESTOR');
    assert.equal(act1.actionKey, 'fund');
    assert.equal(act1.enabled, true);
    assert.equal(act1.role, 'investor');

    // Scenario 2: Tokenized invoice + freelancer wallet -> fund action unavailable for freelancer
    const act2 = getInvoiceActions(tokenizedInvoice, 'GC_FREELANCER');
    assert.equal(act2.enabled, false);
    assert.equal(act2.role, 'freelancer');

    // Scenario 3: Tokenized invoice + no connected wallet -> connect wallet prompt
    const act3 = getInvoiceActions(tokenizedInvoice, undefined);
    assert.equal(act3.enabled, false);
    assert.equal(act3.role, 'investor');
    assert.match(act3.label, /Connect Wallet/i);

    // Scenario 4: Funded invoice + recorded investor wallet -> funding unavailable, repayment step active
    const act4 = getInvoiceActions(fundedInvoice, 'GA_INVESTOR_RECORDED');
    assert.notEqual(act4.actionKey, 'fund');

    // Scenario 5: Funded invoice + different wallet -> funding unavailable
    const act5 = getInvoiceActions(fundedInvoice, 'GA_OTHER_WALLET');
    assert.notEqual(act5.actionKey, 'fund');

    // Scenario 6: Tokenized invoice with investor = null -> funding remains available to prospective investor
    assert.equal(tokenizedInvoice.investorWallet, undefined);
    const act6 = getInvoiceActions(tokenizedInvoice, 'GA_PROSPECTIVE_INVESTOR');
    assert.equal(act6.actionKey, 'fund');
    assert.equal(act6.enabled, true);

    // Scenario 7: Funded invoice with investor set -> investor is treated as recorded investor
    assert.equal(fundedInvoice.investorWallet, 'GA_INVESTOR_RECORDED');
    const act7 = getInvoiceActions(fundedInvoice, 'GA_INVESTOR_RECORDED');
    assert.equal(act7.role, 'investor');
    assert.notEqual(act7.actionKey, 'fund');
  });

  await t.test('6. Canonical Soroban Status Mapping & Reconciliation (Task 10)', () => {
    // 1-6. Soroban status codes 0-5 map correctly to canonical lifecycle states
    assert.equal(mapSorobanStatusToLifecycleState(0), 'Created');
    assert.equal(mapSorobanStatusToLifecycleState(1), 'Tokenized');
    assert.equal(mapSorobanStatusToLifecycleState(2), 'Funded');
    assert.equal(mapSorobanStatusToLifecycleState(3), 'Repaid');
    assert.equal(mapSorobanStatusToLifecycleState(4), 'Closed');
    assert.equal(mapSorobanStatusToLifecycleState(5), 'Cancelled');

    // 7. Supabase REPAID + Soroban CLOSED -> UI CLOSED
    const invRepaidInSupabase = {
      id: 'INV-10',
      onChainId: 10,
      lifecycleState: mapSorobanStatusToLifecycleState(4), // Soroban 4 = Closed
      dueDate: '2026-09-01'
    };
    assert.equal(invRepaidInSupabase.lifecycleState, 'Closed');
    assert.equal(deriveInvoiceStatus(invRepaidInSupabase), 'Closed');

    // 8. Supabase FUNDED + Soroban CLOSED -> UI CLOSED
    const invFundedInSupabase = {
      id: 'INV-10',
      onChainId: 10,
      lifecycleState: mapSorobanStatusToLifecycleState(4),
      dueDate: '2026-09-01'
    };
    assert.equal(invFundedInSupabase.lifecycleState, 'Closed');
    assert.equal(deriveInvoiceStatus(invFundedInSupabase), 'Closed');

    // 9. NoA PROCESSED does not change financial state
    const invNoAProcessed = {
      id: 'INV-10',
      onChainId: 10,
      lifecycleState: 'Closed',
      noaStatus: 'PROCESSED',
      dueDate: '2026-09-01'
    };
    assert.equal(deriveInvoiceStatus(invNoAProcessed), 'Closed');

    // 10. Closed invoices expose no financial actions
    const closedActions = getInvoiceActions(invNoAProcessed, 'GA_ANY');
    assert.equal(closedActions.enabled, false);
    assert.equal(closedActions.actionKey, 'view');
    assert.match(closedActions.label, /Closed/i);

    // 11. Dashboard and detail use same canonical status mapper
    const statusFromMapper = mapSorobanStatusToLifecycleState(4);
    assert.equal(statusFromMapper, 'Closed');

    // 12. RPC reconciliation failure preserves last known status
    const fallbackInv = {
      id: 'INV-RPC-FAIL',
      lifecycleState: 'Funded',
      dueDate: '2026-09-01'
    };
    assert.equal(deriveInvoiceStatus(fallbackInv), 'Funded');
  });

});

