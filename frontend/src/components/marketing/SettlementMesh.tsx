import React from 'react';

export interface SettlementMeshProps {
  children?: React.ReactNode;
  className?: string;
}

export const SettlementMesh: React.FC<SettlementMeshProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-b from-[#F5F8FB] via-[#DAD6FF]/20 to-[#F5F8FB] ${className}`}>
      {/* 6% Opacity Diagonal Ledger-Line Texture overlay per InvoiceFi_DESIGN.md §0 */}
      <div className="absolute inset-0 settlement-ledger-grid pointer-events-none opacity-60" />
      
      {/* Subdued Indigo Atmospheric Mesh Wash */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#4C3AFF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#0F6E5C]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">{children}</div>
    </div>
  );
};
