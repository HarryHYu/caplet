import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Settings = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    navigate('/');
    return null;
  }

  const navItems = [
    { path: '/settings/profile', label: 'Profile', description: 'Name, email, password, bio' },
    { path: '/settings/account', label: 'Account', description: 'Role, preferences' },
  ];

  return (
    <div className="min-h-screen py-24">
      <div className="container-custom">
        <div className="mb-16 animate-slide-up">
          <span className="section-kicker mb-6">User Configuration</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-black dark:text-white uppercase tracking-tighter">
            Account <br />Settings.
          </h1>
        </div>

        <div className="flex flex-col md:flex-row gap-16">
          <nav className="w-full md:w-64 flex-shrink-0 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/settings/profile'}
                    className={({ isActive }) =>
                      `block p-6 border transition-all group ${isActive
                        ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black'
                        : 'bg-white dark:bg-zinc-950 border-zinc-100 dark:border-zinc-900 text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className="block text-[10px] font-bold uppercase tracking-[0.2em] mb-1 leading-none transition-colors">
                          {item.label}
                        </span>
                        <span className={`block text-[9px] font-bold uppercase tracking-widest opacity-50 ${isActive ? 'text-white/70 dark:text-black/70' : 'text-zinc-500'}`}>
                          {item.description}
                        </span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <main className="flex-1 min-w-0 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 p-10">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Settings;
