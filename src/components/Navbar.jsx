import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  const allNavItems = [
    { path: '/', label: 'Home', publicOnly: true },
    { path: '/dashboard', label: 'Dashboard', privateOnly: true },
    { path: '/courses', label: 'Courses' },
    { path: '/classes', label: 'Classes' },
    { path: '/tools', label: 'Tools' },
  ];

  const navItems = allNavItems.filter((item) => {
    if (isAuthenticated) return !item.publicOnly;
    return !item.privateOnly;
  });

  const homePath = isAuthenticated ? '/dashboard' : '/';
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const getNavLinkClass = (active) =>
    `inline-flex items-center rounded-full border px-4 py-2 text-sm font-display font-semibold tracking-tight transition-all ${
      active
        ? 'border-accent/25 bg-accent/10 text-accent shadow-sm shadow-accent/5'
        : 'border-transparent text-text-muted hover:border-line-soft hover:bg-surface-soft/80 hover:text-text-primary'
    }`;

  // Hide navbar on auth pages only.
  const hidePaths = ['/login', '/register'];
  if (hidePaths.includes(location.pathname)) {
    return null;
  }

  return (
      <header className="fixed top-0 inset-x-0 z-50 bg-surface-body/90 dark:bg-surface-body/85 backdrop-blur-xl border-b border-line-soft/80 text-text-primary shadow-sm shadow-black/[0.03]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
          <div className="h-14 md:h-16 flex items-center justify-between gap-4">
            {/* Logo */}
            <Link to={homePath} className="flex items-center gap-2 group relative z-10 shrink-0">
              <img
                src="/logo.png"
                alt="Caplet Logo"
                className="w-9 h-9 md:w-10 md:h-10 object-contain transition-transform group-hover:scale-110 rounded-full overflow-hidden"
              />
              <span className="text-xl md:text-2xl font-serif italic font-bold tracking-tight">Caplet.</span>
            </Link>

            {/* Desktop links */}
            <nav className="hidden md:flex items-center gap-1.5 rounded-full border border-line-soft/80 bg-surface-raised/45 p-1 shadow-inner shadow-black/[0.02]" aria-label="Primary navigation">
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={getNavLinkClass(active)}
                    aria-current={active ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2 md:gap-3 relative z-10 shrink-0">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-soft/80 bg-surface-raised/70 text-text-muted shadow-sm shadow-black/[0.03] transition-all hover:border-accent/30 hover:bg-surface-soft hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                aria-label="Toggle dark mode"
              >
                {isDark ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {isAuthenticated ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-accent/20 bg-accent px-3.5 md:px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-white shadow-sm shadow-accent/20 transition-all hover:bg-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    aria-expanded={showUserMenu}
                    aria-haspopup="menu"
                  >
                    <span>{user?.firstName || 'User'}</span>
                    <svg className={`w-3.5 h-3.5 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showUserMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-line-soft bg-surface-raised py-2 shadow-xl" role="menu">
                      <Link
                        to="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-2.5 text-sm font-display font-medium text-text-primary transition-colors hover:bg-surface-soft"
                        role="menuitem"
                      >
                        Settings
                      </Link>
                      <button
                        type="button"
                        onClick={logout}
                        className="w-full px-4 py-2.5 text-left text-sm font-display font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                        role="menuitem"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden h-10 items-center justify-center rounded-full border border-accent/20 bg-accent px-5 text-sm font-display font-semibold text-white shadow-sm shadow-accent/20 transition-all hover:bg-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 md:inline-flex"
                >
                  Get Started
                </Link>
              )}

              {/* Mobile toggle */}
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-soft/80 bg-surface-raised/70 text-text-muted shadow-sm shadow-black/[0.03] transition-all hover:border-accent/30 hover:bg-surface-soft hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 md:hidden"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? 'Close menu' : 'Open menu'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isOpen && (
            <div className="md:hidden border-t border-line-soft/80 py-4">
              <nav className="flex flex-col gap-1.5 rounded-2xl border border-line-soft/80 bg-surface-raised/45 p-1.5 shadow-inner shadow-black/[0.02]" aria-label="Mobile primary navigation">
                {navItems.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={getNavLinkClass(active)}
                      aria-current={active ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              {!isAuthenticated && (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-accent/20 bg-accent px-6 py-3 text-center font-display font-semibold text-white shadow-sm shadow-accent/20 transition-all hover:bg-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  Get Started
                </Link>
              )}
            </div>
          )}
        </div>
      </header>
  );
};

export default Navbar;
