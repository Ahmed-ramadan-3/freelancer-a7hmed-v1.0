import { motion } from 'framer-motion';
import { siteConfig } from '@/config/site';
import { SPLASH_DURATION_SECONDS } from '@/config/splash';
import { useTranslation } from '@/i18n';

/**
 * A deliberate, bounded branding moment (master spec, "Loading / Splash
 * Screen") - not a loading spinner. App.tsx keeps this mounted for exactly
 * SPLASH_DURATION_SECONDS (5-10s, default 5), so the progress bar below
 * fills once, at that exact pace, rather than looping forever like a
 * generic "still working" indicator would.
 *
 * Colors come entirely from the shared `bg-paper`/`text-ink`/`bg-accent`
 * tokens, which main.tsx already resolves to the right light/dark values
 * before this component's first paint - so this never hardcodes a light
 * background and never flashes the wrong theme.
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
          className="h-full rounded-full bg-accent"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: SPLASH_DURATION_SECONDS, ease: 'linear' }}
        />
      </div>
    </div>
  );
}
