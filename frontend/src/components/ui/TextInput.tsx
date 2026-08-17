import React from 'react';

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  prefixSymbol?: string;
  isTabular?: boolean;
  error?: string;
  helperText?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  prefixSymbol,
  isTabular = false,
  error,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-[#0D1B2E] uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {prefixSymbol && (
          <span className="absolute left-3.5 text-[#647087] text-sm font-medium select-none pointer-events-none">
            {prefixSymbol}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full bg-white text-[#0D1B2E] text-sm rounded-md border border-[#AFC0DA] px-3.5 py-2.5 outline-none transition-all placeholder-[#8894A6] focus:border-[#4C3AFF] focus:ring-2 focus:ring-[#4C3AFF]/20 ${
            prefixSymbol ? 'pl-8' : ''
          } ${isTabular ? 'font-tabular' : ''} ${error ? 'border-[#D6304A] focus:border-[#D6304A] focus:ring-[#D6304A]/20' : ''} ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-xs text-[#D6304A] font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#647087]">{helperText}</p>
      ) : null}
    </div>
  );
};
