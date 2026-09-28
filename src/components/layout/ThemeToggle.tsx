import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

const options = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center rounded-md border border-border p-0.5">
      {options.map(({ value, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          aria-label={value}
          className={cn(
            'rounded p-1.5 transition-colors',
            theme === value ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink',
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
