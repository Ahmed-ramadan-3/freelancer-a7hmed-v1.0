import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Files, FolderKanban, UploadCloud } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { fileService } from '@/services';
import type { FileResource } from '@/types';
import { categoryDefinitions } from '@/config/categories';
import { formatDate } from '@/lib/utils';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export function AdminDashboardPage() {
  const { t, language } = useTranslation();
  const [files, setFiles] = useState<FileResource[] | null>(null);

  useEffect(() => {
    fileService.listFiles().then(setFiles);
  }, []);

  if (!files) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard label={t('admin.totalFiles')} value={files.length} icon={Files} />
        <AdminStatCard
          label={t('admin.totalCategories')}
          value={categoryDefinitions.length}
          icon={FolderKanban}
        />
        <Link to="/admin/upload">
          <AdminStatCard label={t('admin.upload')} value="+" icon={UploadCloud} />
        </Link>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold text-ink">{t('admin.recentUploads')}</h2>
        <ul className="flex flex-col divide-y divide-border">
          {files.slice(0, 6).map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-3 py-3">
              {/* This preserved Admin table manages the separate, Supabase-backed
                  FileResource model - the active site has no public route for
                  it (see README.md "Architecture"), so this is plain text
                  rather than a link to a page that no longer exists. */}
              <span className="truncate text-sm font-medium text-ink">{file.title[language]}</span>
              <span className="shrink-0 text-xs text-muted">
                {formatDate(file.createdAt, language)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
