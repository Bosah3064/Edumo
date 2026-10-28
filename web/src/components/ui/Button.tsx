import React, { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'tricolor';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  pulse?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  pulse = false,
  disabled,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-900 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5',
    md: 'text-sm px-4.5 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-[#1d5f99] to-[#683669] hover:from-[#174e7e] hover:to-[#562b57] text-white shadow-lg shadow-[#1d5f99]/30 hover:shadow-[#683669]/40 hover:-translate-y-0.5 focus:ring-[#1d5f99] border border-white/10',
    tricolor:
      'bg-gradient-to-r from-[#1d5f99] via-[#683669] to-[#a5243d] hover:opacity-95 text-white shadow-lg shadow-[#1d5f99]/30 hover:-translate-y-0.5 focus:ring-[#683669] border border-white/10',
    secondary:
      'bg-surface-800 hover:bg-surface-700 text-surface-100 border border-surface-700/60 focus:ring-surface-500',
    accent:
      'bg-accent-600 hover:bg-accent-500 text-white shadow-lg shadow-accent-500/20 focus:ring-accent-400 border border-accent-500/30',
    outline:
      'bg-transparent hover:bg-surface-800/80 text-surface-200 border border-surface-700 focus:ring-[#1d5f99]',
    ghost:
      'bg-transparent hover:bg-surface-800/60 text-surface-300 hover:text-white focus:ring-surface-600',
    danger:
      'bg-[#a5243d] hover:bg-[#891b30] text-white shadow-lg shadow-[#a5243d]/30 focus:ring-[#a5243d] border border-white/10',
  };

  return (
    <button
      className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && (
        <span className="inline-flex shrink-0">{rightIcon}</span>
      )}
    </button>
  );
};
