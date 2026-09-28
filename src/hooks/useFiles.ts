/** ⚠️ ADMIN-ONLY - used by the preserved Admin file table, not the active
 *  public store (which reads src/data/resources.ts directly and needs no
 *  loading state, since that data is static). */
import { useEffect, useState } from 'react';
import type { FileResource } from '@/types';
import { fileService } from '@/services';

interface UseFilesParams {
  categorySlug?: string;
  search?: string;
}

interface UseFilesResult {
  files: FileResource[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Centralizes the fetch/loading/error dance for the library grid and admin
 *  files table, so neither page repeats the same three `useState` calls. */
export function useFiles(params: UseFilesParams): UseFilesResult {
  const [files, setFiles] = useState<FileResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    fileService
      .listFiles(params)
      .then((result) => {
        if (active) setFiles(result);
      })
      .catch(() => {
        if (active) setError('errors.generic');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.categorySlug, params.search, refetchToken]);

  return { files, isLoading, error, refetch: () => setRefetchToken((n) => n + 1) };
}
