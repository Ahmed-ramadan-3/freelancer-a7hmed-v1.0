export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-border/60"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-200 ease-standard"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
