import { Link, useLocation } from 'react-router-dom';
import { Home, Search, MessageCircle, User, Shield, PlusSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export function MobileNav() {
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-md border-t border-border">
      <div className="flex items-center justify-around h-16 px-2">
        <Link
          to="/"
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors ${
            isActive('/') ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Home className="w-6 h-6" />
        </Link>

        <Link
          to="/search"
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors ${
            isActive('/search') ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Search className="w-6 h-6" />
        </Link>

        <Link
          to="/"
          className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground"
        >
          <PlusSquare className="w-6 h-6" />
        </Link>

        <Link
          to="/messages"
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors ${
            isActive('/messages') ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <MessageCircle className="w-6 h-6" />
        </Link>

        <Link
          to="/profile"
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors ${
            isActive('/profile') ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <User className="w-6 h-6" />
        </Link>
      </div>
    </nav>
  );
}
