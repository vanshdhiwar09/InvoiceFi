import React from 'react';

export interface ShinyTextProps {
  children: React.ReactNode;
  className?: string;
}

export const ShinyText: React.FC<ShinyTextProps> = ({ children, className = '' }) => {
  return (
    <span
      className={`inline-block py-1 pb-1.5 leading-tight bg-gradient-to-r from-white via-[#A5F3FC] to-[#818CF8] bg-clip-text text-transparent ${className}`}
    >
      {children}
    </span>
  );
};
