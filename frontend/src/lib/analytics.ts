import { track } from '@vercel/analytics';

/**
 * Level 4 Analytics Helper (InvoiceFi Phase 6H)
 * 
 * Safe, privacy-preserving tracking wrapper around @vercel/analytics.
 * Guarantees that analytics failures NEVER throw or block financial workflows.
 */

export function trackWalletConnected(provider: string): void {
  try {
    const safeProvider = (provider || 'unknown').toLowerCase();
    track('wallet_connected', { provider: safeProvider });
  } catch (err) {
    console.warn('[Analytics] Failed to track wallet_connected:', err);
  }
}

export function trackInvoiceCreated(): void {
  try {
    track('invoice_created', { asset: 'XLM', network: 'testnet' });
  } catch (err) {
    console.warn('[Analytics] Failed to track invoice_created:', err);
  }
}

export function trackInvoiceFunded(): void {
  try {
    track('invoice_funded', { asset: 'XLM', network: 'testnet' });
  } catch (err) {
    console.warn('[Analytics] Failed to track invoice_funded:', err);
  }
}
