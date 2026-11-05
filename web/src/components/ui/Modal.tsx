import React, { useEffect } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Centering wrapper with generous vertical padding to prevent top border squeezing */}
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6 py-8 sm:py-12 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        {/* Modal dialog */}
        <div
          className={clsx(
            'relative w-full rounded-2xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-2xl z-10 text-left my-auto animate-scale-in text-slate-700',
            maxWidthStyles[maxWidth]
          )}
        >
          <div className="flex items-start justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
            <div>
              {title && (
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="pt-1">{children}</div>
        </div>
      </div>
    </div>
  );
};
