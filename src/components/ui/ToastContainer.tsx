import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const toneClasses = {
  success: 'border-success/30 text-success',
  error: 'border-danger/30 text-danger',
  info: 'border-teal/30 text-teal',
};

/** Fixed to a screen corner regardless of language direction: `end-4`
 *  resolves to the reading-end side automatically (right in LTR, left in
 *  RTL) via Tailwind's logical-property utilities. */
export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="pointer-events-none fixed bottom-4 end-4 z-[60] flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.variant];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'pointer-events-auto flex items-center gap-2 rounded-md border bg-surface px-4 py-3 text-sm text-ink shadow-raised',
                toneClasses[toast.variant],
              )}
              onClick={() => dismissToast(toast.id)}
              role="status"
            >
              <Icon className="size-4 shrink-0" />
              <span>{toast.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
