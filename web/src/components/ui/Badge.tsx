import React from 'react';
import clsx from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'accent' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'brand',
  size = 'md',
  dot = false,
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-2xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const variantStyles = {
    brand: 'bg-brand-500/10 text-brand-300 border border-brand-500/25',
    accent: 'bg-accent-500/10 text-accent-400 border border-accent-500/25',
    warning: 'bg-warning-500/10 text-warning-400 border border-warning-500/25',
    danger: 'bg-danger-500/10 text-danger-400 border border-danger-500/25',
    neutral: 'bg-surface-700/40 text-surface-300 border border-surface-600/30',
  };

  const dotColors = {
    brand: 'bg-brand-400',
    accent: 'bg-accent-400',
    warning: 'bg-warning-400',
    danger: 'bg-danger-400',
    neutral: 'bg-surface-400',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full shrink-0',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])}
        />
      )}
      <span>{children}</span>
    </span>
  );
};
