import React from 'react';
import clsx from 'clsx';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className,
  label,
}) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={clsx(
          'rounded-full border-brand-500/20 border-t-brand-500 animate-spin',
          sizeMap[size],
          className
        )}
      />
      {label && <p className="text-xs text-gray-500 font-medium">{label}</p>}
    </div>
  );
};
