import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const { user } = useAuth();
  
  // Don't show layout on auth page
  if (location.pathname === '/auth') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Header */}
      {user && (
        <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <span className="text-xl font-bold gradient-text">L_EFT</span>
            <NotificationBell />
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`${user ? 'md:ml-64 pt-14 md:pt-0' : ''}`}>
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
