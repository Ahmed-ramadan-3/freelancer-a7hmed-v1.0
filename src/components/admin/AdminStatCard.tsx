import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export function AdminStatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-teal/12 text-teal">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-ink">{value}</p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </Card>
  );
}
