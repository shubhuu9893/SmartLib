import { NavLink } from 'react-router-dom';
import { MOBILE_ITEMS } from './navItems';

export default function MobileBottomNav() {
  return (
    <nav aria-label="Mobile navigation" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink-950/95 backdrop-blur-md md:hidden">
      <ul className="grid grid-cols-5">
        {MOBILE_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${isActive ? 'text-brand' : 'text-fg-subtle hover:text-fg'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`h-5 w-5 ${isActive ? 'fill-brand/20' : ''}`} aria-hidden="true" />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
