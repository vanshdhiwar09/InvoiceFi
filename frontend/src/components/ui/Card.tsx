import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  elevation?: 0 | 1 | 2;
  borderStyle?: 'solid' | 'dashed';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  elevation = 1,
  borderStyle = 'solid',
  interactive = false,
  className = '',
  ...props
}) => {
  const elevationStyles = {
    0: 'shadow-none',
    1: 'elevation-1',
    2: 'elevation-2'
  };

  const borderStyles = {
    solid: 'border border-[#E2E7EE]',
    dashed: 'border-2 border-dashed border-[#AFC0DA]'
  };

  const interactiveStyles = interactive
    ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-[#AFC0DA] motion-fast'
    : 'motion-fast';

  return (
    <div
      className={`bg-white rounded-xl p-6 ${borderStyles[borderStyle]} ${elevationStyles[elevation]} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
