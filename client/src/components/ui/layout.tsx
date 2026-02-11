import type { ReactElement, ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ChildrenProps {
  children: ReactNode;
}

export function Shell({ children }: ChildrenProps): ReactElement {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen flex-col">{children}</div>
    </div>
  );
}

export function PageShell({ children }: ChildrenProps): ReactElement {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 gap-0 px-4 pb-6 pt-3 lg:gap-6 lg:px-6">
      {children}
    </div>
  );
}

export function SidebarFrame({ children }: ChildrenProps): ReactElement {
  return (
    <aside className="hidden w-44 shrink-0 border-r border-slate-200 bg-white/80 lg:block">
      {children}
    </aside>
  );
}

export function Main({ children }: ChildrenProps): ReactElement {
  return <main className="flex-1 space-y-4">{children}</main>;
}

interface StatCardProps {
  title: string;
  value: number;
  hint?: string;
  tone?: 'neutral' | 'accent' | 'warning';
  icon?: React.ComponentType<{ className?: string }>;
}

export function StatGrid({ children }: ChildrenProps): ReactElement {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-3">
      {children}
    </div>
  );
}

export function StatCard({
  title,
  value,
  hint,
  tone = 'neutral',
  icon: Icon
}: StatCardProps): ReactElement {
  const palette =
    tone === 'accent'
      ? 'border-emerald-500/40 bg-emerald-50'
      : tone === 'warning'
        ? 'border-amber-400/40 bg-amber-50'
        : 'border-slate-200 bg-white';

  return (
    <div
      className={cn(
        'flex flex-1 flex-col rounded-xl border px-4 py-3 shadow-sm shadow-slate-900/5',
        palette
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {title}
        </p>
        {Icon ? <Icon className="h-4 w-4 text-slate-400" /> : null}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

