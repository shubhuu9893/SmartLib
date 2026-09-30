import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Search, X } from 'lucide-react';
import Logo from '../common/Logo';
import Avatar from '../common/Avatar';
import SearchBar from '../search/SearchBar';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

function NotificationBell() {
  const { unreadCount } = useApp();
  return (
    <Link to="/notifications" className="icon-btn relative" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}>
      <Bell className="h-5 w-5" aria-hidden="true" />
      {unreadCount > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}

export default function Navbar() {
  const { profile, firebaseUser } = useAuth();
  const [mobileSearch, setMobileSearch] = useState(false);
  const name = profile?.name || firebaseUser?.displayName || '';
  const email = profile?.email || firebaseUser?.email || '';
  const avatar = profile?.avatar_url || firebaseUser?.photoURL;

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-line bg-ink-950/90 backdrop-blur-md">
      <div className="flex h-full items-center gap-3 px-4 sm:px-6">
        <div className="shrink-0 md:w-[52px] lg:w-[216px]">
          <span className="md:hidden lg:inline">
            <Logo />
          </span>
          <span className="hidden md:inline lg:hidden">
            <Logo compact />
          </span>
        </div>

        <div className="mx-auto hidden w-full max-w-xl md:block">
          <SearchBar />
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button type="button" className="icon-btn md:hidden" aria-label="Open search" onClick={() => setMobileSearch(true)}>
            <Search className="h-5 w-5" aria-hidden="true" />
          </button>
          <NotificationBell />
          <Link to="/profile" className="hidden items-center gap-2.5 rounded-xl py-1 pl-1 pr-3 transition-colors hover:bg-ink-800 md:flex" aria-label="Your profile">
            <Avatar src={avatar} name={name} email={email} size="sm" />
            <span className="hidden max-w-[140px] truncate text-sm font-medium text-fg lg:block">{name || email}</span>
          </Link>
        </div>
      </div>

      {mobileSearch && (
        <div className="absolute inset-x-0 top-0 z-50 flex h-16 items-center gap-2 border-b border-line bg-ink-950 px-4 md:hidden">
          <div className="flex-1">
            <SearchBar autoFocus onNavigate={() => setMobileSearch(false)} placeholder="Search books…" />
          </div>
          <button type="button" className="icon-btn" onClick={() => setMobileSearch(false)} aria-label="Close search">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </header>
  );
}
