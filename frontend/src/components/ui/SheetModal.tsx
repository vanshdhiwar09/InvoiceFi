import React, { useEffect } from 'react';

export interface SheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const SheetModal: React.FC<SheetModalProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop Fade */}
      <div
        className="fixed inset-0 bg-[#0D1B2E]/40 backdrop-blur-xs motion-normal transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal / Bottom Sheet Surface */}
      <div
        className="relative z-10 w-full sm:max-w-[440px] bg-white rounded-t-2xl sm:rounded-[24px] overflow-hidden elevation-2 border border-[#E2E7EE] motion-smooth transform transition-all duration-300 translate-y-0 opacity-100 scale-100 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* Absolute Top-Right Close Button per design spec */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-20 text-[#647087] hover:text-[#0D1B2E] hover:bg-[#F5F8FB] rounded-full p-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#4C3AFF]/30"
          aria-label="Close modal"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6L18 18" />
          </svg>
        </button>

        {/* Mobile Pull Handle Indicator */}
        <div className="w-12 h-1 bg-[#E2E7EE] rounded-full mx-auto mt-3 sm:hidden" />

        {title && (
          <div className="px-6 pt-6 pb-2">
            <h3 className="text-lg font-bold text-[#0D1B2E]">{title}</h3>
          </div>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
};
