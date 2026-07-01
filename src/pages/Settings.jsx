import { useEffect } from 'react';
import { Outlet, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Settings = () => {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  // Run reveal animations once on mount (header + nav), then refresh
  // ScrollTrigger whenever the active tab changes so outlet content animates in.
  useEffect(() => {
    // Short delay so the Outlet child has rendered before we measure positions.
    const id = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 50);
    return () => clearTimeout(id);
  }, [pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { path: '/settings/profile', label: 'Profile', description: 'Name, email, password, bio' },
    { path: '/settings/financial', label: 'Financial', description: 'Income, savings, debts, and goals' },
    { path: '/settings/account', label: 'Account', description: 'Role, preferences' },
  ];

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <div className="mb-20">
          <span className="font-hand text-2xl text-accent">Your space</span>
          <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl mt-2 mb-6">
            Account settings
          </h1>
          <p className="text-xl text-text-muted max-w-xl leading-relaxed">
            Manage your profile and preferences.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-10">
          <nav className="w-full md:w-72 flex-shrink-0">
            <ul className="space-y-3">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/settings/profile'}
                    className={({ isActive }) =>
                      `block p-6 rounded-2xl transition-transform hover:-translate-y-0.5 group ${isActive
                        ? 'bg-accent text-white shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]'
                        : 'bg-surface-raised text-text-primary hover:bg-block-blue shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className="block font-display font-bold tracking-tight text-lg mb-1 leading-tight">
                          {item.label}
                        </span>
                        <span className={`block text-sm ${isActive ? 'text-white/80' : 'text-text-muted'}`}>
                          {item.description}
                        </span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <main className="flex-1 min-w-0">
            <div className="bg-surface-raised rounded-3xl p-8 md:p-12 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Settings;
