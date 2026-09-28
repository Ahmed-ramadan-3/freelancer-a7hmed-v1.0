import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { ToastContainer } from '@/components/ui/ToastContainer';

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container flex-1 py-8">
        <Outlet />
      </main>
      <Footer />
      <ToastContainer />
    </div>
  );
}
