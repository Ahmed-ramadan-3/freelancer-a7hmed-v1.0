import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { I18nProvider } from '@/i18n';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { router } from '@/routes/router';

/**
 * Readiness gate for the splash screen (master spec, "Download UX" /
 * general polish): shown only for the brief moment the app takes to mount,
 * with no artificial minimum delay. The active public site needs no auth
 * session lookup - it has no backend - so this no longer waits on
 * authService; AuthProvider now lives only inside the lazy-loaded /admin
 * subtree (see src/routes/router.tsx, AdminGate), since the public catalog
 * never needs to know who's signed in.
 */
function useAppReady() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // A microtask tick is enough to let the first paint happen behind the
    // splash instead of before it - no manufactured waiting.
    Promise.resolve().then(() => setIsReady(true));
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
