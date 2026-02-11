import type { HTMLAttributes, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, children, className }: DialogProps) {
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4"
      onClick={() => onOpenChange?.(false)}
    >
      <DialogContent onClick={(e) => e.stopPropagation()} className={className}>
        {children}
      </DialogContent>
    </div>,
    document.body
  );
}

interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function DialogContent({ className, ...props }: DialogContentProps) {
  return (
    <div
      className={cn(
        'w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10',
        className
      )}
      {...props}
    />
  );
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mb-3 flex items-center justify-between gap-3 border-b border-slate-200 pb-3',
        className
      )}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-sm font-semibold text-slate-900', className)}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs text-slate-500', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mt-4 flex items-center justify-end gap-2 border-t border-slate-200 pt-3',
        className
      )}
      {...props}
    />
  );
}

interface DialogCloseButtonProps {
  onClick?: () => void;
}

export function DialogCloseButton({ onClick }: DialogCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-slate-300 px-2 py-1 text-[11px] text-slate-700 hover:border-slate-400 hover:text-slate-900"
    >
      Close
    </button>
  );
}

