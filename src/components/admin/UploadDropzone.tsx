import { useRef, useState, type DragEvent } from 'react';
import { CheckCircle2, RefreshCw, UploadCloud, XCircle } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { uploadConfig, isExtensionAllowed, isSizeAllowed } from '@/config/upload';
import { formatBytes, cn } from '@/lib/utils';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';

type Status = 'idle' | 'invalid' | 'ready' | 'uploading' | 'success' | 'error';

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
  onFileCleared: () => void;
  status: Status;
  progressPercent: number;
  errorMessage?: string;
}

/**
 * Presentational drag/drop + validation surface. Deliberately does NOT own
 * the actual upload call - AdminUploadPage owns that, so this component
 * stays reusable if a future screen needs a different upload target.
 */
export function UploadDropzone({
  onFileSelected,
  onFileCleared,
  status,
  progressPercent,
  errorMessage,
}: UploadDropzoneProps) {
  const { t, language } = useTranslation();
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateAndSelect(file: File) {
    if (!isExtensionAllowed(file.name)) {
      setValidationError(t('upload.fileTypeNotAllowed'));
      setSelectedFile(null);
      return;
    }
    if (!isSizeAllowed(file.size)) {
      setValidationError(t('upload.fileTooLarge'));
      setSelectedFile(null);
      return;
    }
    setValidationError(null);
    setSelectedFile(file);
    onFileSelected(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSelect(file);
  }

  function clear() {
    setSelectedFile(null);
    setValidationError(null);
    onFileCleared();
    if (inputRef.current) inputRef.current.value = '';
  }

  const isBusy = status === 'uploading';

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !isBusy && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors duration-150 ease-standard',
          isDragActive ? 'border-accent bg-accent/5' : 'border-border bg-surface',
          isBusy && 'pointer-events-none opacity-70',
        )}
      >
        <UploadCloud className="size-8 text-muted" aria-hidden="true" />
        <p className="text-sm font-medium text-ink">{t('upload.dropzoneLabel')}</p>
        <p className="text-xs text-muted">{t('upload.dropzoneHint')}</p>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={uploadConfig.allowedExtensions.join(',')}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) validateAndSelect(file);
          }}
        />
      </div>

      {(validationError || errorMessage) && (
        <p className="flex items-center gap-1.5 text-sm text-danger">
          <XCircle className="size-4" />
          {validationError ?? errorMessage}
        </p>
      )}

      {selectedFile && !validationError && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium text-ink">{selectedFile.name}</span>
            <span className="shrink-0 text-muted">
              {formatBytes(selectedFile.size, language)}
            </span>
          </div>

          {status === 'uploading' && <ProgressBar percent={progressPercent} />}

          {status === 'success' && (
            <span className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="size-4" />
              {t('upload.success')}
            </span>
          )}

          {status === 'error' && (
            <Button variant="secondary" size="sm" onClick={() => onFileSelected(selectedFile)}>
              <RefreshCw className="size-4" />
              {t('common.retry')}
            </Button>
          )}

          {!isBusy && status !== 'success' && (
            <button onClick={clear} className="self-start text-xs text-muted underline">
              {t('common.cancel')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
