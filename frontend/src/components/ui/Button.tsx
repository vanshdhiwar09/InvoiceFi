import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full motion-fast active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none';

  const variantStyles = {
    primary: 'bg-[#4C3AFF] text-white hover:bg-[#3C2ED4] active:bg-[#2A1F94] focus:ring-[#4C3AFF]',
    secondary: 'bg-white text-[#4C3AFF] border border-[#4C3AFF] hover:bg-[#F5F8FB] active:bg-[#DAD6FF]/40 focus:ring-[#4C3AFF]',
    ghost: 'bg-transparent text-[#2A3A52] hover:bg-[#F5F8FB] focus:ring-[#647087]',
    danger: 'bg-[#D6304A] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] focus:ring-[#D6304A]'
  };

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-1.5 h-8 min-h-[32px]',
    md: 'text-sm px-5 py-2.5 h-10 min-h-[40px]',
    lg: 'text-base px-6 py-3 h-12 min-h-[48px]'
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
