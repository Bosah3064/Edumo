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
    brand: 'bg-brand-500/10 text-brand-600 border border-brand-500/25',
    accent: 'bg-accent-500/10 text-accent-700 border border-accent-500/25',
    warning: 'bg-warning-500/10 text-warning-600 border border-warning-500/25',
    danger: 'bg-danger-500/10 text-danger-500 border border-danger-500/25',
    neutral: 'bg-gray-100 text-gray-600 border border-gray-200',
  };

  const dotColors = {
    brand: 'bg-brand-500',
    accent: 'bg-accent-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
    neutral: 'bg-gray-400',
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
