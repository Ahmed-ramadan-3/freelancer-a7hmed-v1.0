import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';

export function AdminLayout() {
  return (
    <div className="flex flex-col gap-6">
      <AdminTopBar />
      <div className="flex flex-col gap-6 sm:flex-row">
        <AdminSidebar />
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
