import type { HTMLAttributes, ReactElement } from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'accent' | 'warning';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps): ReactElement {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-slate-100 text-slate-800 ring-1 ring-slate-300',
    secondary:
      'bg-slate-50 text-slate-700 ring-1 ring-slate-200',
    destructive:
      'bg-rose-50 text-rose-700 ring-1 ring-rose-300',
    outline:
      'border border-slate-300 text-slate-700 bg-transparent ring-0',
    accent: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300',
    warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-300'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

