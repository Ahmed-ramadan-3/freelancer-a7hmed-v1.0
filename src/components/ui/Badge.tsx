import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'accent' | 'teal' | 'success' | 'danger';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-border/50 text-ink',
  accent: 'bg-accent/15 text-accent',
  teal: 'bg-teal/15 text-teal',
  success: 'bg-success/15 text-success',
  danger: 'bg-danger/15 text-danger',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
