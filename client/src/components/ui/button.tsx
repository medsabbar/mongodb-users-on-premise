import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { cn } from "../../lib/utils";

type ButtonVariant =
  | "default"
  | "outline"
  | "ghost"
  | "destructive"
  | "secondary"
  | "link";
type ButtonSize = "default" | "sm" | "lg" | "icon" | "xs" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "default", size = "default", ...props },
    ref,
  ): ReactElement {
    const base =
      "inline-flex items-center justify-center gap-1 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 disabled:pointer-events-none disabled:opacity-60";

    const variants: Record<ButtonVariant, string> = {
      default:
        "bg-emerald-600 text-white shadow-sm shadow-emerald-500/40 hover:bg-emerald-500",
      outline:
        "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50",
      ghost: "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
      destructive:
        "bg-rose-500 text-rose-50 shadow-sm shadow-rose-500/40 hover:bg-rose-400",
      secondary: "bg-slate-100 text-slate-950 hover:bg-white",
      link: "text-emerald-400 underline-offset-4 hover:text-emerald-300 hover:underline",
    };

    const sizes: Record<ButtonSize, string> = {
      default: "h-9 px-3 text-xs",
      sm: "h-8 px-2.5 text-[11px]",
      lg: "h-10 px-4 text-sm",
      icon: "h-8 w-8 text-xs",
      xs: "h-7 px-2 text-[11px]",
      md: "h-9 px-3 text-xs",
    };

    return (
      <button
        ref={ref}
        className={cn(
          base,
          variants[variant] ?? variants.default,
          sizes[size] ?? sizes.default,
          className,
        )}
        {...props}
      />
    );
  },
);
