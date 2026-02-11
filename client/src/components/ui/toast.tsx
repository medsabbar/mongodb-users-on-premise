import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { cn } from '../../lib/utils';
import type { ToastState } from '../../types/api';

interface ToastProps extends ToastState {
  onClear?: () => void;
}

export function Toast({ message, tone, onClear }: ToastProps): ReactElement | null {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => {
      onClear?.();
    }, 5000);
    return () => clearTimeout(id);
  }, [message, onClear]);

  if (!message) return null;

  const palette =
    tone === 'error'
      ? 'border-rose-300 bg-rose-50 text-rose-800'
      : 'border-emerald-300 bg-emerald-50 text-emerald-800';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-end px-4 sm:px-6">
      <div
        className={cn(
          'pointer-events-auto inline-flex max-w-sm items-center gap-3 rounded-xl border px-4 py-2 text-xs shadow-lg shadow-slate-900/10 backdrop-blur',
          palette
        )}
      >
        <span className="leading-snug">{message}</span>
        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-current/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide hover:border-current/60"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

