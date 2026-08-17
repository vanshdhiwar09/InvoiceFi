import React from 'react';

export interface ShinyTextProps {
  children: React.ReactNode;
  className?: string;
}

export const ShinyText: React.FC<ShinyTextProps> = ({ children, className = '' }) => {
  return (
    <span
      className={`inline-block bg-gradient-to-r from-[#0D1B2E] via-[#4C3AFF] to-[#0F6E5C] bg-clip-text text-transparent ${className}`}
    >
      {children}
    </span>
  );
};
