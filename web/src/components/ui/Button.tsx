import React, { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'tricolor';
  size?: 'xs' | 'sm' | 'md' | 'lg';
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
    'relative inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-500/30 active:scale-[0.985] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none';

  const sizeStyles = {
    xs: 'text-xs px-2.5 py-1 gap-1.5 h-7',
    sm: 'text-xs px-3 py-1.5 gap-1.5 h-8.5 font-medium',
    md: 'text-sm px-4 py-2 gap-2 h-10',
    lg: 'text-sm px-5 py-2.5 gap-2.5 h-11.5 font-semibold',
  };

  const variantStyles = {
    primary:
      'bg-[#1d5f99] hover:bg-[#164e7e] text-white shadow-xs hover:shadow border border-[#164e7e]/50 active:bg-[#123e64]',
    secondary:
      'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs hover:border-slate-400 active:bg-slate-100',
    accent:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border border-emerald-700/40 active:bg-emerald-800',
    outline:
      'bg-transparent hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 active:bg-slate-100',
    ghost:
      'bg-transparent hover:bg-slate-100/80 text-slate-600 hover:text-slate-900 active:bg-slate-200/60',
    danger:
      'bg-[#a5243d] hover:bg-[#8c1e33] text-white shadow-xs border border-[#7a182b] active:bg-[#6d1526]',
    tricolor:
      'bg-gradient-to-r from-[#1d5f99] via-[#683669] to-[#a5243d] hover:opacity-95 text-white shadow-xs border border-white/10',
  };

  return (
    <button
      className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
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
