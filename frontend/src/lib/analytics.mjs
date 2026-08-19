/**
 * ES Module mirror of analytics.ts for Node.js unit test runner
 */

export let mockEventsLog = [];

export function clearMockEvents() {
  mockEventsLog = [];
}

export function trackWalletConnected(provider) {
  try {
    const safeProvider = (provider || 'unknown').toLowerCase();
    mockEventsLog.push({ name: 'wallet_connected', payload: { provider: safeProvider } });
  } catch (err) {
    console.warn('[Analytics Mjs] Failed to track wallet_connected:', err);
  }
}

export function trackInvoiceCreated() {
  try {
    mockEventsLog.push({ name: 'invoice_created', payload: { asset: 'XLM', network: 'testnet' } });
  } catch (err) {
    console.warn('[Analytics Mjs] Failed to track invoice_created:', err);
  }
}

export function trackInvoiceFunded() {
  try {
    mockEventsLog.push({ name: 'invoice_funded', payload: { asset: 'XLM', network: 'testnet' } });
  } catch (err) {
    console.warn('[Analytics Mjs] Failed to track invoice_funded:', err);
  }
}
