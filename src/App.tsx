import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { I18nProvider } from '@/i18n';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { SPLASH_DURATION_SECONDS } from '@/config/splash';
import { router } from '@/routes/router';

/**
 * Readiness gate for the splash screen (master spec, "Loading / Splash
 * Screen"): a REAL readiness check (there is no backend to wait on for the
 * active public site - AuthProvider now lives only inside the lazy-loaded
 * /admin subtree, see routes/router.tsx AdminGate - so this resolves almost
 * immediately) combined with a BOUNDED presentation delay
 * (SPLASH_DURATION_SECONDS, 5-10s). The splash disappears only once both are
 * satisfied, so it is never an indefinite fake loading state, but it also
 * never just flashes for a few milliseconds - it's a deliberate branding
 * moment of a known, configured length.
 */
function useAppReady() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let appIsReady = false;
    let timerElapsed = false;
    const reveal = () => {
      if (appIsReady && timerElapsed) setIsReady(true);
    };

    Promise.resolve().then(() => {
      appIsReady = true;
      reveal();
    });

    const timer = setTimeout(() => {
      timerElapsed = true;
      reveal();
    }, SPLASH_DURATION_SECONDS * 1000);

    return () => clearTimeout(timer);
  }, []);

  return isReady;
}

export default function App() {
  const isReady = useAppReady();

  return (
    <I18nProvider>
      <ThemeProvider>
        {!isReady && <SplashScreen />}
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
