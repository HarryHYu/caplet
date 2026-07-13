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
    <div className="min-h-screen bg-surface-body pb-24 pt-24 selection:bg-accent selection:text-white md:py-32">
      <div className="container-custom">
        <div className="mb-10 reveal md:mb-20">
          <span className="font-hand text-2xl text-accent -rotate-2 inline-block">your space</span>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl md:mb-6 md:text-7xl">
            Account settings
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-text-muted md:text-xl">
            Manage your profile and preferences.
          </p>
        </div>

        <div className="flex flex-col gap-6 reveal md:flex-row md:gap-10">
          <nav aria-label="Settings sections" className="sticky top-14 z-20 -mx-6 w-auto border-y border-line-soft bg-surface-body/95 px-6 py-3 backdrop-blur-xl md:static md:mx-0 md:w-72 md:flex-shrink-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            <ul className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:block md:space-y-3 md:overflow-visible md:pb-0">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/settings/profile'}
                    className={({ isActive }) =>
                      `group block min-w-max snap-start rounded-full px-4 py-2.5 transition-[color,background-color,transform,box-shadow] active:scale-[0.98] md:min-w-0 md:rounded-2xl md:p-6 md:hover:-translate-y-0.5 ${isActive
                        ? 'bg-accent text-white shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]'
                        : 'bg-surface-raised text-text-primary hover:bg-block-blue shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className="block font-display text-sm font-bold leading-tight tracking-tight md:mb-1 md:text-lg">
                          {item.label}
                        </span>
                        <span className={`hidden text-sm md:block ${isActive ? 'text-white/80' : 'text-text-muted'}`}>
                          {item.description}
                        </span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <main className="min-w-0 flex-1">
            <div className="rounded-3xl bg-surface-raised p-5 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] sm:p-8 md:p-12">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Settings;
