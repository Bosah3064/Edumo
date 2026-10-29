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
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/60">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 mb-4">
          {icon}
        </div>
      )}
      <h4 className="text-base font-semibold text-gray-700">{title}</h4>
      <p className="text-xs text-gray-500 max-w-sm mt-1 mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
