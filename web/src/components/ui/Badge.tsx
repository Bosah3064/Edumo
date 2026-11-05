import React from 'react';
import clsx from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'accent' | 'warning' | 'danger' | 'neutral' | 'purple' | 'info' | 'success';
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
    sm: 'text-2xs px-2 py-0.5 gap-1 font-semibold leading-tight',
    md: 'text-xs px-2.5 py-0.5 gap-1.5 font-semibold leading-normal',
  };

  const variantStyles: Record<string, string> = {
    brand: 'bg-blue-50 text-blue-800 border border-blue-200/80',
    accent: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/80',
    danger: 'bg-rose-50 text-rose-800 border border-rose-200/80',
    purple: 'bg-purple-50 text-purple-800 border border-purple-200/80',
    info: 'bg-sky-50 text-sky-800 border border-sky-200/80',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200/80',
  };

  const dotColors: Record<string, string> = {
    brand: 'bg-blue-600',
    accent: 'bg-emerald-600',
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    danger: 'bg-rose-600',
    purple: 'bg-purple-600',
    info: 'bg-sky-600',
    neutral: 'bg-slate-500',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md shrink-0 border select-none',
        sizeStyles[size],
        variantStyles[variant] || variantStyles.neutral,
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant] || dotColors.neutral)}
        />
      )}
      <span>{children}</span>
    </span>
  );
};
