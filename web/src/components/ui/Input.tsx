import React, { InputHTMLAttributes, forwardRef, useState } from 'react';
import clsx from 'clsx';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
  showStrength?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      className,
      id,
      type = 'text',
      showPasswordToggle = true,
      showStrength = false,
      value,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || props.name || Math.random().toString(36).substring(2, 9);

    const isPassword = type === 'password';
    const computedType = isPassword ? (showPassword ? 'text' : 'password') : type;

    // Calculate basic password strength if showStrength is true
    const getStrength = (val: string): 'weak' | 'fair' | 'good' | 'strong' | null => {
      if (!val || val.length === 0) return null;
      if (val.length < 6) return 'weak';
      let score = 0;
      if (val.length >= 8) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;
      if (score <= 1) return 'weak';
      if (score === 2) return 'fair';
      if (score === 3) return 'good';
      return 'strong';
    };

    const strength = showStrength && typeof value === 'string' ? getStrength(value) : null;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-surface-300 uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <div className="relative rounded-xl">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={computedType}
            value={value}
            className={clsx(
              'w-full rounded-xl bg-surface-900/80 border text-surface-100 placeholder-surface-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2',
              leftIcon ? 'pl-10' : 'pl-4',
              isPassword || rightIcon ? 'pr-11' : 'pr-4',
              'py-2.5',
              error
                ? 'border-danger-500/80 focus:border-danger-500 focus:ring-danger-500/20'
                : 'border-surface-700/80 focus:border-brand-500 focus:ring-brand-500/20 hover:border-surface-600',
              className
            )}
            {...props}
          />

          {/* Password Eye Toggle */}
          {isPassword && showPasswordToggle ? (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="password-eye-btn text-surface-400 hover:text-brand-400 focus:outline-none"
              title={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          ) : (
            rightIcon && (
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-surface-400 pointer-events-none">
                {rightIcon}
              </div>
            )
          )}
        </div>

        {/* Optional Password Strength Bar */}
        {showStrength && strength && (
          <div className="pt-1">
            <div className="flex gap-1.5 h-1">
              <div className={clsx('strength-bar', strength)} />
              <div
                className={clsx(
                  'strength-bar',
                  strength === 'fair' || strength === 'good' || strength === 'strong'
                    ? strength
                    : ''
                )}
              />
              <div
                className={clsx(
                  'strength-bar',
                  strength === 'good' || strength === 'strong' ? strength : ''
                )}
              />
              <div className={clsx('strength-bar', strength === 'strong' ? strength : '')} />
            </div>
            <p className="text-[10px] text-surface-400 mt-1 capitalize">
              Password strength: <span className="font-semibold text-white">{strength}</span>
            </p>
          </div>
        )}

        {error ? (
          <p className="text-xs text-danger-400 mt-1 animate-fade-in">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-surface-400 mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
