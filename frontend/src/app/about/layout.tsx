import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About InvoiceFi — Invoice Financing on Stellar',
  description: 'Learn how InvoiceFi tokenizes unpaid invoices on Stellar and connects businesses with invoice financing through a programmable Testnet MVP.',
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
