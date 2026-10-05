import { useEffect, useState } from 'react';
import { subscribeToResourceUpdates } from '@/data/resourceStore';

/**
 * Bumps on every call to `notifyListeners()` inside resourceStore.ts - in
 * practice, once the initial background fetch from the metadata backend
 * resolves, and again after any admin write. A component includes this
 * value in a `useMemo` dependency array to re-read `getAllResources()` at
 * that moment; when no backend is configured, it simply never changes
 * (resourceStore.ts never calls `notifyListeners()` in local-only mode), so
 * this is a no-op in the project's zero-setup default.
 */
export function useCatalogVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => subscribeToResourceUpdates(() => setVersion((v) => v + 1)), []);

  return version;
}
