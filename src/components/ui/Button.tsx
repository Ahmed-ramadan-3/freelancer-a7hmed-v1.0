import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-95 active:brightness-90',
  secondary:
    'bg-surface border border-border text-ink hover:bg-surface-raised active:bg-border/40',
  ghost: 'bg-transparent text-ink hover:bg-surface-raised',
  danger: 'bg-danger text-white hover:brightness-95 active:brightness-90',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

/**
 * The exact class string a <button variant size> would render, exposed so a
 * non-<button> element that needs to look like one - e.g. a react-router
 * <Link> used as a card's primary action for a preview/view-only resource
 * (see ResourceCard.tsx/FeaturedResource.tsx) - shares the same visual rules
 * instead of a second, possibly-drifting copy of these Tailwind strings.
 */
export function getButtonClassName({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}): string {
  return cn(
    'inline-flex items-center justify-center rounded-md font-medium transition-colors duration-150 ease-standard disabled:cursor-not-allowed disabled:opacity-50',
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

/** All comfortable-touch-target sizing lives here (min 44px tap area on
 *  "md"/"lg") so no screen has to remember the rule individually. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={getButtonClassName({ variant, size, className })}
        {...props}
      >
        {isLoading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
