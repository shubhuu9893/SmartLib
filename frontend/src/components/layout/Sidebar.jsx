import { NavLink } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { SIDEBAR_ITEMS } from './navItems';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

function itemClass({ isActive }) {
  return `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:justify-start md:justify-center ${
    isActive ? 'bg-brand/15 text-fg' : 'text-fg-muted hover:bg-ink-800 hover:text-fg'
  }`;
}

function Item({ to, label, icon: Icon }) {
  return (
    <NavLink to={to} className={itemClass} title={label}>
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand" aria-hidden="true" />}
          <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-brand' : ''}`} aria-hidden="true" />
          <span className="md:sr-only lg:not-sr-only">{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { logout } = useAuth();
  const toast = useToast();

  const onLogout = async () => {
    try {
      await logout();
    } catch {
      toast("Couldn't sign out. Please try again.", 'error');
    }
  };

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-line bg-ink-950 px-3 py-5 md:flex md:w-[76px] lg:w-60">
      <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto scrollbar-none">
        {SIDEBAR_ITEMS.map((item) => (
          <Item key={item.to} {...item} />
        ))}
      </nav>
      <div className="mt-4 space-y-1 border-t border-line pt-4">
        <Item to="/profile" label="Profile" icon={User} />
        <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-fg-muted transition-colors hover:bg-danger/10 hover:text-danger md:justify-center lg:justify-start" title="Logout">
          <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="md:sr-only lg:not-sr-only">Logout</span>
        </button>
      </div>
    </aside>
  );
}
