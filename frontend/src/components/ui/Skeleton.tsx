import React from 'react';

export interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height
}) => {
  return (
    <div
      className={`animate-shimmer rounded-lg ${className}`}
      style={{ width, height }}
      aria-label="Loading placeholder"
      role="status"
    />
  );
};
