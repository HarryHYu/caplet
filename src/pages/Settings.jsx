import { Outlet, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useReveal } from '../lib/useReveal';

const Settings = () => {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  // Re-run on tab change so the Outlet's own content (which swaps out) reveals too.
  useReveal(undefined, [pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { path: '/settings/profile', label: 'Profile', description: 'Name, email, password, bio' },
    { path: '/settings/appearance', label: 'Appearance', description: 'Theme and background colour' },
    { path: '/settings/financial', label: 'Financial', description: 'Income, savings, debts, and goals' },
    { path: '/settings/account', label: 'Account', description: 'Role, preferences' },
    { path: '/settings/privacy', label: 'Privacy & data', description: 'Consent, AI history, export, deletion' },
  ];

  return (
    <div className="minimal-page selection:bg-accent selection:text-white">
      <div className="container-custom">
        <div className="minimal-page-header reveal">
          <span className="section-kicker">Your space</span>
          <h1 className="minimal-page-title">
            Account settings
          </h1>
          <p className="minimal-page-description">Manage your profile and preferences.</p>
        </div>

        <div className="flex flex-col gap-8 reveal md:flex-row md:gap-12">
          <nav aria-label="Settings sections" className="sticky top-14 z-20 -mx-6 w-auto border-y border-line-soft bg-surface-body/95 px-6 py-3 backdrop-blur-xl md:static md:mx-0 md:w-56 md:flex-shrink-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            <ul className="flex snap-x gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:block md:space-y-1 md:overflow-visible md:pb-0">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/settings/profile'}
                    className={({ isActive }) =>
                      `group block min-w-max snap-start rounded-lg px-4 py-2.5 transition-colors active:scale-[0.98] md:min-w-0 ${isActive
                        ? 'bg-accent-soft text-accent'
                        : 'text-text-muted hover:bg-surface-soft hover:text-text-primary'
                      }`
                    }
                  >
                    <span className="block text-sm font-bold leading-tight">{item.label}</span>
                    <span className="sr-only">{item.description}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <main className="min-w-0 flex-1">
            <div className="border-t border-line-soft py-8 md:border-l md:border-t-0 md:py-0 md:pl-12">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Settings;
