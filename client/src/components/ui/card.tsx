import { forwardRef } from 'react';
import type {
  ElementType,
  HTMLAttributes,
  ReactElement,
  Ref,
  ComponentPropsWithoutRef
} from 'react';
import { cn } from '../../lib/utils';

type AsProp<C extends ElementType> = {
  as?: C;
};

type PolymorphicProps<C extends ElementType> = AsProp<C> &
  Omit<ComponentPropsWithoutRef<C>, keyof AsProp<C>>;

export const Card = forwardRef(function Card<C extends ElementType = 'div'>(
  { className, as, ...props }: PolymorphicProps<C>,
  ref: Ref<HTMLElement>
): ReactElement {
  const Comp = (as ?? 'div') as ElementType;
  return (
    <Comp
      ref={ref}
      className={cn(
        'rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5',
        className
      )}
      {...props}
    />
  );
});

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactElement {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 border-b border-slate-200 pb-3',
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>): ReactElement {
  return (
    <h2
      className={cn('text-sm font-semibold text-slate-900', className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>): ReactElement {
  return (
    <p
      className={cn('text-xs text-slate-500', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactElement {
  return (
    <div className={cn('pt-3', className)} {...props} />
  );
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactElement {
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

