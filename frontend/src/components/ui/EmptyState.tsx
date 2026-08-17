import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 bg-white border border-[#E2E7EE] rounded-xl ${className}`}>
      <div className="w-12 h-12 rounded-full bg-[#F5F8FB] border border-[#E2E7EE] flex items-center justify-center text-[#4C3AFF] mb-4">
        {icon || (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 2 0 01-2-2V5a2 2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </div>
      <h3 className="text-base font-medium text-[#0D1B2E] mb-1">{title}</h3>
      <p className="text-sm text-[#647087] max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
