import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-surface-700/80 bg-surface-900/40">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-surface-800 border border-surface-700/60 flex items-center justify-center text-surface-400 mb-4 shadow-inner">
          {icon}
        </div>
      )}
      <h4 className="text-base font-semibold text-surface-200">{title}</h4>
      <p className="text-xs text-surface-400 max-w-sm mt-1 mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
