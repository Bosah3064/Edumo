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
        'rounded-xl p-5 sm:p-6 transition-all duration-150 bg-white border border-slate-200/80 shadow-2xs',
        variant === 'interactive' &&
          'cursor-pointer hover:border-slate-300 hover:shadow-xs active:bg-slate-50/50',
        glow && 'ring-1 ring-[#1d5f99]/20 shadow-xs',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
