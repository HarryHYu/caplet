import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const menuRef = useRef(null);

  useEffect(() => {
    setIsOpen(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allNavItems = [
    { path: '/', label: 'Home', publicOnly: true },
    { path: '/dashboard', label: 'Dashboard', privateOnly: true },
    { path: '/courses', label: 'Curriculum' },
    { path: '/classes', label: 'Academy' },
    { path: '/tools', label: 'Instruments' },
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

  const hidePaths = ['/login', '/register'];
  if (hidePaths.includes(location.pathname)) return null;

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || user.firstName?.[0]?.toUpperCase() || 'U'
    : 'U';

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-surface-body/95 backdrop-blur-2xl shadow-[0_1px_0_var(--line-soft),0_4px_24px_rgba(0,0,0,0.06)]'
          : 'bg-surface-body/80 backdrop-blur-xl border-b border-line-soft'
      } text-text-primary`}
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
        <div className="h-14 md:h-[60px] flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to={homePath} className="flex items-center gap-2.5 group relative z-10 shrink-0">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden ring-1 ring-line-soft group-hover:ring-accent transition-all duration-300">
              <img
                src="/logo.png"
                alt="Caplet Logo"
                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <span className="text-lg md:text-xl font-serif italic font-bold tracking-tight text-text-primary group-hover:text-accent transition-colors duration-300">
              Caplet.
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    active
                      ? 'text-text-primary'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-soft'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-accent rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5 md:gap-2 relative z-10 shrink-0">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-soft transition-all duration-200"
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Divider */}
            <div className="hidden md:block w-px h-4 bg-line-soft mx-0.5" />

            {isAuthenticated ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-all duration-200 ${
                    showUserMenu
                      ? 'border-accent bg-accent-soft'
                      : 'border-line-soft hover:border-text-dim hover:bg-surface-soft'
                  }`}
                >
                  {/* Avatar circle */}
                  <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold font-mono leading-none flex-shrink-0">
                    {initials}
                  </div>
                  <span className="text-sm font-medium text-text-primary leading-none">
                    {user?.firstName || 'User'}
                  </span>
                  <svg
                    className={`w-3 h-3 text-text-dim transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-surface-raised border border-line-soft rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3 py-2 mb-1 border-b border-line-soft">
                      <p className="text-xs font-medium text-text-dim truncate">{user?.email || ''}</p>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-surface-soft transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 text-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </Link>
                    <div className="my-1 border-t border-line-soft" />
                    <button
                      type="button"
                      onClick={logout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/register"
                className="hidden md:inline-flex items-center justify-center bg-accent hover:bg-accent-strong text-white font-semibold text-sm px-4 py-2 rounded-lg transition-all duration-200 hover:-translate-y-px hover:shadow-md"
              >
                Get started
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-soft transition-all"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="md:hidden border-t border-line-soft py-3 flex flex-col gap-0.5">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    active
                      ? 'text-accent bg-accent-soft'
                      : 'text-text-primary hover:bg-surface-soft'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {!isAuthenticated && (
              <Link
                to="/register"
                onClick={() => setIsOpen(false)}
                className="mt-2 btn-primary text-sm"
              >
                Get started
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
