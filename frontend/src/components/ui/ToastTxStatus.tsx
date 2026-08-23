import React from 'react';

export type TxStatusType = 'Awaiting signature' | 'Broadcasting' | 'Confirmed' | 'Failed';

export interface ToastTxStatusProps {
  status: TxStatusType;
  txHash?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onClose?: () => void;
  isVisible?: boolean;
}

export const ToastTxStatus: React.FC<ToastTxStatusProps> = ({
  status,
  txHash,
  errorMessage,
  onRetry,
  onClose,
  isVisible = true
}) => {
  if (!isVisible) return null;

  const statusConfigs: Record<TxStatusType, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    'Awaiting signature': {
      bg: 'bg-white',
      border: 'border-[#E2E7EE]',
      text: 'text-[#647087]',
      icon: (
        <span className="w-2.5 h-2.5 rounded-full bg-[#7669FF] animate-ping" />
      )
    },
    'Broadcasting': {
      bg: 'bg-[#F5F8FB]',
      border: 'border-[#7669FF]/40',
      text: 'text-[#4C3AFF]',
      icon: (
        <svg className="w-4 h-4 animate-spin text-[#4C3AFF]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )
    },
    'Confirmed': {
      bg: 'bg-[#D7F0EA]/40',
      border: 'border-[#0F6E5C]/30',
      text: 'text-[#0F6E5C]',
      icon: (
        <svg className="w-4 h-4 text-[#0F6E5C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
      )
    },
    'Failed': {
      bg: 'bg-[#FCE7EA]/50',
      border: 'border-[#D6304A]/30',
      text: 'text-[#D6304A]',
      icon: (
        <svg className="w-4 h-4 text-[#D6304A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    }
  };

  const config = statusConfigs[status];

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white rounded-xl p-4 border ${config.border} elevation-2 motion-normal transform transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F5F8FB]">
            {config.icon}
          </div>
          <div>
            <h4 className={`text-xs font-semibold uppercase tracking-wider ${config.text}`}>
              {status}
            </h4>
            <p className="text-xs text-[#647087] mt-0.5">
              {status === 'Awaiting signature' && 'Approve transaction in your wallet…'}
              {status === 'Broadcasting' && 'Submitting transaction to Stellar Testnet…'}
              {status === 'Confirmed' && 'Transaction confirmed on Soroban RPC!'}
              {status === 'Failed' && (errorMessage || 'Transaction was rejected by wallet.')}
            </p>
            {txHash && (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                <span className="font-mono text-[#8894A6] truncate max-w-[180px]" title={txHash}>
                  Tx: {txHash}
                </span>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#4C3AFF] hover:underline inline-flex items-center gap-0.5 shrink-0"
                >
                  View on explorer ↗
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === 'Failed' && onRetry && (
            <button
              onClick={onRetry}
              className="text-xs font-semibold text-[#D6304A] hover:underline"
            >
              Retry
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-[#647087] hover:text-[#0D1B2E] p-1 rounded-full"
              aria-label="Close status notification"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
