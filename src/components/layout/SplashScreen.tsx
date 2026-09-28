import { motion } from 'framer-motion';
import { siteConfig } from '@/config/site';
import { useTranslation } from '@/i18n';

/**
 * Polished initial loading experience (master spec, section 14). It stays
 * on screen only while real work is happening (auth session lookup, i18n
 * setup) - App.tsx unmounts it the instant that's done, so it never becomes
 * fake waiting. See useAppReady in App.tsx for the readiness check itself.
 */
export function SplashScreen() {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-paper">
      <motion.span
        className="text-5xl"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        aria-hidden="true"
      >
        📦
      </motion.span>
      <motion.p
        className="text-lg font-medium text-ink"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
      >
        {t('common.welcome', { name: siteConfig.name })}
      </motion.p>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-border/60">
        <motion.div
          className="h-full w-1/3 rounded-full bg-accent"
          animate={{ x: ['-100%', '220%'] }}
          transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
