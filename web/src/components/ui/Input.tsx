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
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-slate-700 tracking-normal"
          >
            {label}
          </label>
        )}
        <div className="relative rounded-lg">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={computedType}
            value={value}
            className={clsx(
              'w-full rounded-lg bg-white border text-slate-900 placeholder:text-slate-400 text-sm transition-all duration-150 focus:outline-none focus:ring-3 focus:bg-white',
              leftIcon ? 'pl-9' : 'pl-3.5',
              isPassword || rightIcon ? 'pr-10' : 'pr-3.5',
              'py-2 h-9.5',
              error
                ? 'border-red-500 focus:border-red-600 focus:ring-red-500/15'
                : 'border-slate-300 hover:border-slate-400 focus:border-[#1d5f99] focus:ring-[#1d5f99]/15 shadow-2xs',
              className
            )}
            {...props}
          />

          {isPassword && showPasswordToggle ? (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
              title={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          ) : (
            rightIcon && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                {rightIcon}
              </div>
            )
          )}
        </div>

        {showStrength && strength && (
          <div className="pt-1 flex items-center gap-1.5">
            <div className="flex-1 h-1 rounded-full bg-slate-200 overflow-hidden flex gap-0.5">
              <div
                className={clsx(
                  'h-full transition-all duration-300',
                  strength === 'weak' && 'w-1/4 bg-red-500',
                  strength === 'fair' && 'w-2/4 bg-amber-500',
                  strength === 'good' && 'w-3/4 bg-blue-500',
                  strength === 'strong' && 'w-full bg-emerald-500'
                )}
              />
            </div>
            <span className="text-2xs font-medium text-slate-500 capitalize">
              {strength}
            </span>
          </div>
        )}

        {error ? (
          <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
            <span>•</span> {error}
          </p>
        ) : (
          helperText && (
            <p className="text-xs text-slate-500 mt-1">{helperText}</p>
          )
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
