import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLayout } from '../contexts/LayoutContext';

// `mobileOnly` is set when the vertical rail owns navigation on large screens —
// the top bar then only appears on mobile, so the two never overlap.
const Navbar = ({ mobileOnly = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showExplore, setShowExplore] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { toggleNavMode } = useLayout();
  const menuRef = useRef(null);
  const exploreRef = useRef(null);

  useEffect(() => {
    setIsOpen(false);
    setShowUserMenu(false);
    setShowExplore(false);
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
      if (exploreRef.current && !exploreRef.current.contains(e.target)) {
        setShowExplore(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // The three destinations that live under the single "Explore" dropdown.
  const exploreItems = [
    { path: '/courses', label: 'Curriculum', tourId: 'nav-curriculum' },
    { path: '/classes', label: 'Academy', tourId: 'nav-academy' },
    { path: '/tools', label: 'Instruments', tourId: 'nav-instruments' },
  ];

  const homePath = isAuthenticated ? '/dashboard' : '/';
  const isHome = location.pathname === '/';
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };
  const exploreActive = exploreItems.some((item) => isActive(item.path));

  const hidePaths = ['/login', '/register', '/play'];
  if (hidePaths.includes(location.pathname)) return null;
  if (location.pathname.startsWith('/live/host')) return null;

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || user.firstName?.[0]?.toUpperCase() || 'U'
    : 'U';

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-shadow duration-300 bg-surface-body/90 backdrop-blur-md text-text-primary ${
        mobileOnly ? 'lg:hidden' : ''
      } ${
        scrolled ? 'shadow-[0_6px_24px_-16px_rgba(0,0,0,0.4)]' : ''
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
        <div className="h-14 md:h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to={homePath} className="flex items-center gap-2 group relative z-10 shrink-0">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full overflow-hidden ring-1 ring-line-soft group-hover:ring-accent transition-all duration-300">
              <img
                src="/logo.png"
                alt="Caplet logo"
                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <span className="text-lg md:text-xl font-bricolage font-extrabold tracking-[-0.02em] text-text-primary group-hover:text-accent transition-colors duration-300">
              Caplet.
            </span>
          </Link>

          {/* Desktop nav — pushed to the right, next to the action cluster */}
          <nav className="hidden md:flex items-center gap-1 ml-auto">
            {isAuthenticated && (
              <Link
                to="/dashboard"
                className={`relative px-3 py-2 rounded-lg text-sm font-bold tracking-[0.06em] transition-all duration-200 ${
                  isActive('/dashboard')
                    ? 'text-accent bg-accent-soft'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-soft'
                }`}
              >
                Dashboard
              </Link>
            )}

            {/* Single "Explore" button grouping Curriculum, Academy, Instruments */}
            <div className="relative" ref={exploreRef}>
              <button
                type="button"
                onClick={() => setShowExplore((v) => !v)}
                aria-expanded={showExplore}
                aria-haspopup="true"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold tracking-[0.06em] transition-all duration-200 ${
                  exploreActive
                    ? 'text-accent bg-accent-soft'
                    : showExplore
                    ? 'text-text-primary bg-surface-soft'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-soft'
                }`}
              >
                Explore
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${showExplore ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showExplore && (
                <div className="absolute top-full left-0 mt-2 w-52 bg-surface-raised border border-line-soft rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {exploreItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setShowExplore(false)}
                        {...(item.tourId ? { 'data-tour-id': item.tourId } : {})}
                        className={`block px-4 py-2.5 text-sm font-bold tracking-[0.04em] transition-colors ${
                          active
                            ? 'text-accent bg-accent-soft'
                            : 'text-text-primary hover:bg-surface-soft'
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
 
          {/* Actions */}
          <div className="flex items-center gap-1.5 md:gap-2 relative z-10 shrink-0">
            {/* Join a live (Kahoot-style) session — no account needed */}
            <Link
              to="/play"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-[0.06em] text-text-muted hover:text-accent hover:bg-surface-soft transition-all duration-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Join Live
            </Link>

            {/* Switch the whole app to the vertical side rail (signed-in only) */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={toggleNavMode}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-soft transition-all duration-200"
                aria-label="Switch to side bar navigation"
                title="Use side bar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16" />
                </svg>
              </button>
            )}

            {/* Theme toggle — hidden on the single-colour welcome page */}
            {!isHome && (
            <button
              type="button"
              onClick={toggleTheme}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-soft transition-all duration-200"
              aria-label="toggle dark mode"
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
            )}

 
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
                    {user?.firstName || 'Account'}
                  </span>
                  <svg
                    className={`w-3 h-3 text-text-dim transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
 
                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-2 w-52 bg-surface-raised border border-line-soft rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-4 py-2 mb-1 border-b border-line-soft">
                      <p className="text-xs font-medium text-text-dim truncate">{user?.email || ''}</p>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold tracking-[0.04em] text-text-primary hover:bg-surface-soft transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 text-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </Link>
                    <Link
                      to="/demo"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold tracking-[0.04em] text-text-primary hover:bg-surface-soft transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 text-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.869v6.262a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                      </svg>
                      Product demo
                    </Link>
                    <div className="my-1 border-t border-line-soft" />
                    <button
                      type="button"
                      onClick={logout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold tracking-[0.04em] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
                className="hidden md:inline-flex items-center justify-center bg-accent hover:bg-accent-strong text-white font-bold text-xs tracking-[0.1em] px-4 py-2 rounded-lg transition-all duration-300"
              >
                Get started
              </Link>
            )}
 
            {/* Mobile hamburger */}
            <button
              type="button"
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-soft transition-all"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'close menu' : 'open menu'}
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
            {(isAuthenticated
              ? [{ path: '/dashboard', label: 'Dashboard' }, ...exploreItems]
              : exploreItems
            ).map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  {...(item.tourId ? { 'data-tour-id': item.tourId } : {})}
                  className={`px-3 py-2.5 text-xs font-bold tracking-[0.1em] transition-colors ${
                    active
                      ? 'text-accent bg-accent-soft rounded-none'
                      : 'text-text-primary hover:bg-surface-soft rounded-none'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              to="/play"
              onClick={() => setIsOpen(false)}
              className="px-3 py-2.5 text-xs font-bold tracking-[0.1em] text-text-primary hover:bg-surface-soft transition-colors"
            >
              Join Live
            </Link>
            {!isAuthenticated && (
              <Link
                to="/register"
                onClick={() => setIsOpen(false)}
                className="mt-2 btn-primary text-sm rounded-none"
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
