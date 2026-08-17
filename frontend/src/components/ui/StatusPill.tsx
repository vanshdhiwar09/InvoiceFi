import React from 'react';

export type InvoiceStatusType = 'Open' | 'Funding' | 'Funded' | 'Repaid' | 'Overdue' | 'Cancelled';

export interface StatusPillProps {
  status: InvoiceStatusType | string;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, className = '' }) => {
  const normalizedStatus = (status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()) as InvoiceStatusType;

  const styles: Record<string, string> = {
    Open: 'bg-[#F5F8FB] text-[#647087] border border-[#E2E7EE]',
    Funding: 'bg-[#DAD6FF]/60 text-[#4C3AFF] border border-[#7669FF]/30',
    Funded: 'bg-[#D7F0EA] text-[#0F6E5C] border border-[#0F6E5C]/20',
    Repaid: 'bg-[#E3F6EC] text-[#0E8F5A] border border-[#0E8F5A]/20',
    Overdue: 'bg-[#FCE7EA] text-[#D6304A] border border-[#D6304A]/20',
    Cancelled: 'bg-[#FCE7EA] text-[#D6304A] border border-[#D6304A]/20'
  };

  const statusStyle = styles[normalizedStatus] || 'bg-[#F5F8FB] text-[#647087] border border-[#E2E7EE]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none ${statusStyle} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {normalizedStatus}
    </span>
  );
};
