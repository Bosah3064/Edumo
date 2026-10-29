import React from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'interactive';
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'glass',
  glow = false,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'rounded-2xl p-6 transition-all duration-300 bg-white border border-gray-200 shadow-sm hover:shadow-md',
        variant === 'interactive' &&
          'cursor-pointer hover:border-brand-500/40 hover:-translate-y-1',
        glow && 'ring-1 ring-brand-500/30 shadow-glow',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
