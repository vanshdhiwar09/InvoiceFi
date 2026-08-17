import React from 'react';

export interface BadgeNetworkProps {
  network?: 'TESTNET' | 'MAINNET';
  className?: string;
}

export const BadgeNetwork: React.FC<BadgeNetworkProps> = ({
  network = 'TESTNET',
  className = ''
}) => {
  if (network === 'MAINNET') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#F4EFE1] text-[#B8860B] border border-[#B8860B] shadow-sm select-none ${className}`}
        title="Live Stellar Mainnet Network"
      >
        <span className="w-2 h-2 rounded-full bg-[#B8860B]" />
        MAINNET
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#F5F8FB] text-[#5B6B85] border border-dashed border-[#5B6B85] select-none ${className}`}
      title="Stellar Testnet Network (Development & Verification)"
    >
      <span className="w-2 h-2 rounded-full bg-[#5B6B85]" />
      TESTNET
    </span>
  );
};
