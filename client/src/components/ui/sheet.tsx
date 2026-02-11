import type { HTMLAttributes, ReactNode, ReactElement } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export function Sheet({ open, onOpenChange, children }: SheetProps): ReactElement | null {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/30 backdrop-blur-sm"
      onClick={() => onOpenChange?.(false)}
    >
      <div
        className="h-full w-full max-w-md translate-x-0 border-l border-slate-200 bg-white shadow-2xl shadow-slate-900/10 transition-transform duration-200 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function SheetHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}

export function SheetTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>): ReactElement {
  return (
    <h2
      className={cn("text-sm font-semibold text-slate-100", className)}
      {...props}
    />
  );
}

