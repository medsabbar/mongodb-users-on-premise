import type {
  HTMLAttributes,
  ReactElement,
  TableHTMLAttributes
} from 'react';
import { cn } from '../../lib/utils';

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {}

export function Table({ className, ...props }: TableProps): ReactElement {
  return (
    <table
      className={cn('min-w-full border-collapse text-xs', className)}
      {...props}
    />
  );
}

export function TableHead(props: HTMLAttributes<HTMLTableSectionElement>): ReactElement {
  return <thead {...props} />;
}

export function TableRow(props: HTMLAttributes<HTMLTableRowElement>): ReactElement {
  return <tr {...props} />;
}

interface TableHeaderCellProps extends HTMLAttributes<HTMLTableCellElement> {
  className?: string;
}

export function TableHeaderCell({
  className,
  ...props
}: TableHeaderCellProps): ReactElement {
  return (
    <th
      className={cn(
        'px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500',
        className
      )}
      {...props}
    />
  );
}

interface TableCellProps extends HTMLAttributes<HTMLTableCellElement> {
  className?: string;
}

export function TableCell({ className, ...props }: TableCellProps): ReactElement {
  return (
    <td className={cn('px-3 py-2 text-xs text-slate-700', className)} {...props} />
  );
}

