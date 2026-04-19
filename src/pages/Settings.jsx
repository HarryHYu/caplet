import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Settings = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { path: '/settings/profile', label: 'Profile', description: 'Name, email, bio' },
    { path: '/settings/account', label: 'Account', description: 'Role, preferences' },
  ];

  return (
    <div className="min-h-screen py-32 bg-surface-body selection:bg-accent selection:text-white">
      <div className="container-custom">
        <div className="mb-24 reveal-text">
          <span className="section-kicker">Configuration</span>
          <h1 className="text-6xl md:text-8xl mb-12">
            Account<br />Settings.
          </h1>
          <p className="text-xl text-text-muted font-serif italic max-w-xl leading-relaxed">
            Manage your registry profile and system preferences.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-20 reveal-text stagger-1">
          <nav className="w-full md:w-64 flex-shrink-0">
            <ul className="space-y-px bg-line-soft border border-line-soft">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/settings/profile'}
                    className={({ isActive }) =>
                      `block p-8 transition-all group ${isActive
                        ? 'bg-surface-inverse text-surface-body'
                        : 'bg-surface-body text-text-dim hover:bg-surface-raised hover:text-text-primary'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className="block text-[10px] font-bold uppercase tracking-[0.3em] mb-2 leading-none">
                          {item.label}
                        </span>
                        <span className={`block text-[9px] font-bold uppercase tracking-widest ${isActive ? 'opacity-50' : 'text-text-dim'}`}>
                          {item.description}
                        </span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <main className="flex-1 min-w-0 reveal-text stagger-2">
            <div className="bg-surface-raised border border-line-soft p-12">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Settings;
