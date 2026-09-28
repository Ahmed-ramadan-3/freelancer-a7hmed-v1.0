import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Upload, Files, Users } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export function AdminSidebar() {
  const { t } = useTranslation();
  const { isOwner } = useAuth();

  const links = [
    { to: '/admin', label: t('admin.dashboard'), icon: LayoutDashboard, end: true },
    { to: '/admin/files', label: t('admin.files'), icon: Files },
    { to: '/admin/upload', label: t('admin.upload'), icon: Upload },
    ...(isOwner ? [{ to: '/admin/users', label: t('admin.users'), icon: Users }] : []),
  ];

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border pb-2 sm:w-56 sm:flex-col sm:border-b-0 sm:border-e sm:pb-0 sm:pe-4">
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-accent/12 text-accent' : 'text-muted hover:bg-surface-raised hover:text-ink',
            )
          }
        >
          <Icon className="size-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
