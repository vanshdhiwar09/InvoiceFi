import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/lib/wallet/WalletContext';
import { Analytics } from '@vercel/analytics/react';

export const metadata: Metadata = {
  title: 'InvoiceFi — Stellar Invoice Tokenization Protocol',
  description: 'Instant liquidity protocol for B2B invoices on Stellar Soroban Testnet',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#F5F8FB] text-[#0D1B2E]">
        <WalletProvider>
          {children}
        </WalletProvider>
        <Analytics />
      </body>
    </html>
  );
}
