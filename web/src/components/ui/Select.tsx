import React, { SelectHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, className, id, ...props }, ref) => {
    const selectId = id || props.name || Math.random().toString(36).substring(2, 9);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-medium text-gray-600 uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <div className="relative rounded-xl">
          <select
            ref={ref}
            id={selectId}
            className={clsx(
              'w-full appearance-none rounded-xl bg-gray-50 border text-gray-800 text-sm py-2.5 pl-4 pr-10 transition-all duration-200 focus:outline-none focus:ring-2 focus:bg-white cursor-pointer',
              error
                ? 'border-danger-500/80 focus:border-danger-500 focus:ring-danger-500/20'
                : 'border-gray-200 focus:border-brand-500 focus:ring-brand-500/20 hover:border-gray-300',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-white text-gray-800"
              >
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error ? (
          <p className="text-xs text-red-500 mt-1 animate-fade-in">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-gray-500 mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
