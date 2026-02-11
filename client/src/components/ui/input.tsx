import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactElement } from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
): ReactElement {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:border-emerald-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/70",
        className,
      )}
      {...props}
    />
  );
});
