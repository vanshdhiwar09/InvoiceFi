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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop Fade */}
      <div
        className="fixed inset-0 bg-[#0D1B2E]/40 backdrop-blur-xs motion-normal transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal / Bottom Sheet Surface */}
      <div
        className="relative z-10 w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-xl p-6 elevation-2 border border-[#E2E7EE] motion-smooth transform transition-all duration-300 translate-y-0 opacity-100 scale-100 sm:m-4"
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile Pull Handle Indicator */}
        <div className="w-12 h-1 bg-[#E2E7EE] rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-base font-semibold text-[#0D1B2E]">{title}</h3>}
          <button
            onClick={onClose}
            className="text-[#647087] hover:text-[#0D1B2E] p-1.5 rounded-full hover:bg-[#F5F8FB] transition-colors ml-auto"
            aria-label="Close sheet modal"
          >
            ✕
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
};
