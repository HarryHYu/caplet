import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLayout } from '../contexts/LayoutContext';
import ProductModeSwitch from './ProductModeSwitch';
import { isProductNavItemActive, moneyNavigation } from '../config/productNavigation';

// `mobileOnly` is set when the vertical rail owns navigation on large screens —
// the top bar then only appears on mobile, so the two never overlap.
const Navbar = ({ mobileOnly = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);
  const [showTryMenu, setShowTryMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { loading: featureFlagsLoading, isEnabled } = useFeatureFlags();
  const { isDark, toggleTheme } = useTheme();
  const { toggleNavMode, productMode = 'study' } = useLayout();
  const effectiveProductMode = productMode;
  const menuRef = useRef(null);
  const navMenuRef = useRef(null);
  const tryMenuRef = useRef(null);
  const userButtonRef = useRef(null);
  const navButtonRef = useRef(null);
  const tryButtonRef = useRef(null);
  const mobileButtonRef = useRef(null);

  useEffect(() => {
    setIsOpen(false);
    setShowUserMenu(false);
    setShowNavMenu(false);
    setShowTryMenu(false);
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
      if (navMenuRef.current && !navMenuRef.current.contains(e.target)) {
        setShowNavMenu(false);
      }
      if (tryMenuRef.current && !tryMenuRef.current.contains(e.target)) {
        setShowTryMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (isOpen) mobileButtonRef.current?.focus();
      else if (showUserMenu) userButtonRef.current?.focus();
      else if (showNavMenu) navButtonRef.current?.focus();
      else if (showTryMenu) tryButtonRef.current?.focus();
      setShowUserMenu(false);
      setShowNavMenu(false);
      setShowTryMenu(false);
      setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, showNavMenu, showTryMenu, showUserMenu]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  const studyCoreItems = [
    { path: '/dashboard', label: 'Dashboard', privateOnly: true },
    { path: '/library', label: 'Library' },
  ];

  const studyMoreItems = [
    { path: '/study-plan', label: 'Study Plan', privateOnly: true },
    { path: '/practice', label: 'Practice', privateOnly: true },
    { path: '/mastery', label: 'Mastery', privateOnly: true },
    { path: '/courses', label: 'Curriculum', tourId: 'nav-curriculum' },
    { path: '/classes', label: 'Classes', tourId: 'nav-academy' },
    { path: '/edutools', label: 'Education Tools', tourId: 'nav-edutools' },
  ];

  // Things a visitor can "try" without picking a section — grouped into their own
  // toggle so the top bar stays uncluttered.
  const tryItems = [
    { path: '/demo', label: 'Demo' },
    { path: '/play', label: 'Caplet Live' },
  ];

  const visibleItems = (items) => items.filter((item) => {
    if (item.flagKey && (featureFlagsLoading || !isEnabled(item.flagKey))) return false;
    if (isAuthenticated) return !item.publicOnly;
    return !item.privateOnly;
  });
  const visibleCoreItems = effectiveProductMode === 'money' ? visibleItems(moneyNavigation) : visibleItems(studyCoreItems);
  const visibleMoreItems = effectiveProductMode === 'money' ? [] : visibleItems(studyMoreItems);
  const navItems = [...visibleCoreItems, ...visibleMoreItems];

  const homePath = effectiveProductMode === 'money' ? '/money' : isAuthenticated ? '/dashboard' : '/';
  const isHome = location.pathname === '/';
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };
  const isItemActive = (item) => effectiveProductMode === 'money'
    ? isProductNavItemActive(item, location)
    : isActive(item.path);

  const hidePaths = ['/login', '/register', '/play'];
  if (hidePaths.includes(location.pathname)) return null;
  if (location.pathname.startsWith('/guardian-consent/')) return null;
  if (location.pathname.startsWith('/live/host')) return null;

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || user.firstName?.[0]?.toUpperCase() || 'U'
    : 'U';

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-shadow duration-300 bg-surface-body text-text-primary ${
        mobileOnly ? 'lg:hidden' : ''
      } ${
        scrolled ? 'shadow-[0_6px_24px_-16px_rgba(0,0,0,0.4)]' : ''
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
        <div className="h-14 md:h-16 flex items-center justify-between gap-4">

          <div className="flex min-w-0 items-center gap-2 md:gap-4">
            {/* Logo */}
            <Link to={homePath} className="flex items-center gap-2 group relative z-10 shrink-0">
              <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-surface-soft ring-1 ring-line-soft transition-all duration-300 group-hover:scale-105 group-hover:ring-accent">
                <img
                  src="/logo.png"
                  alt="Caplet logo"
                  className="h-full w-full scale-105 rounded-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <span className="hidden text-lg font-bricolage font-extrabold tracking-[-0.02em] text-text-primary transition-colors duration-300 group-hover:text-accent sm:inline md:text-xl">
                Caplet.
              </span>
            </Link>
            <ProductModeSwitch className="shrink-0" />
          </div>

          {/* Right cluster — folded nav toggles pinned to the far right, then actions */}
          <div className="flex items-center gap-2 md:gap-3">

          {/* Desktop nav — core destinations stay visible; secondary areas use disclosures. */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {visibleCoreItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                {...(item.tourId ? { 'data-tour-id': item.tourId } : {})}
                aria-current={isItemActive(item) ? 'page' : undefined}
                className={`min-h-11 inline-flex items-center px-3 rounded-lg text-sm font-bold tracking-[0.04em] transition-colors ${
                  isItemActive(item) ? 'text-accent bg-accent-soft' : 'text-text-muted hover:text-text-primary hover:bg-surface-soft'
                }`}
              >
                {item.label}
              </Link>
            ))}

            {/* More menu */}
            {visibleMoreItems.length > 0 && <div className="relative" ref={navMenuRef}>
              <button
                ref={navButtonRef}
                type="button"
                onClick={() => { setShowNavMenu((v) => !v); setShowTryMenu(false); }}
                aria-expanded={showNavMenu}
                aria-haspopup="true"
                aria-controls="more-navigation"
                className={`min-h-11 flex items-center gap-2 px-3 rounded-lg text-sm font-bold tracking-[0.06em] whitespace-nowrap transition-all duration-200 ${
                  showNavMenu || visibleMoreItems.some((i) => isActive(i.path))
                    ? 'text-accent bg-accent-soft'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-soft'
                }`}
              >
                More
                <svg className={`w-3 h-3 shrink-0 transition-transform duration-200 ${showNavMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showNavMenu && (
                <div id="more-navigation" className="absolute top-full left-0 mt-2 w-56 bg-surface-raised border border-line-soft rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {visibleMoreItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        {...(item.tourId ? { 'data-tour-id': item.tourId } : {})}
                        className={`flex items-center px-3 py-2.5 text-sm font-bold tracking-[0.04em] transition-colors ${
                          active ? 'text-accent bg-accent-soft' : 'text-text-primary hover:bg-surface-soft'
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>}

            {/* Try menu — demo & live, no account needed */}
            {effectiveProductMode === 'study' && <div className="relative" ref={tryMenuRef}>
              <button
                ref={tryButtonRef}
                type="button"
                onClick={() => { setShowTryMenu((v) => !v); setShowNavMenu(false); }}
                aria-expanded={showTryMenu}
                aria-haspopup="true"
                aria-controls="try-navigation"
                className={`min-h-11 flex items-center gap-2 px-3 rounded-lg text-sm font-bold tracking-[0.06em] transition-all duration-200 ${
                  showTryMenu || tryItems.some((i) => isActive(i.path))
                    ? 'text-accent bg-accent-soft'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-soft'
                }`}
              >
                Try
                <svg className={`w-3 h-3 transition-transform duration-200 ${showTryMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showTryMenu && (
                <div id="try-navigation" className="absolute top-full left-0 mt-2 w-52 bg-surface-raised border border-line-soft rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {tryItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center px-3 py-2.5 text-sm font-bold tracking-[0.04em] transition-colors ${
                          active ? 'text-accent bg-accent-soft' : 'text-text-primary hover:bg-surface-soft'
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5 md:gap-2 relative z-10 shrink-0">
            {/* Switch the whole app to the vertical side rail (signed-in only) */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={toggleNavMode}
                className="hidden h-11 w-11 items-center justify-center rounded-full text-text-muted transition-all duration-200 hover:bg-surface-soft hover:text-text-primary active:scale-95 lg:flex"
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
              className="w-11 h-11 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-surface-soft transition-all duration-200 active:scale-95"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
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
                  ref={userButtonRef}
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                  aria-controls="account-navigation"
                  className={`flex h-11 w-11 items-center justify-center gap-2 rounded-full border p-1.5 transition-all duration-200 active:scale-95 sm:w-auto sm:justify-start sm:pr-3 ${
                    showUserMenu
                      ? 'border-accent bg-accent-soft'
                      : 'border-line-soft hover:border-text-dim hover:bg-surface-soft'
                  }`}
                >
                  {/* Avatar circle */}
                  <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold font-mono leading-none flex-shrink-0">
                    {initials}
                  </div>
                  <span className="hidden text-sm font-medium text-text-primary leading-none sm:inline">
                    {user?.firstName || 'Account'}
                  </span>
                  <svg
                    className={`hidden w-3 h-3 text-text-dim transition-transform duration-200 sm:block ${showUserMenu ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showUserMenu && (
                  <div id="account-navigation" className="absolute top-full right-0 mt-2 w-48 bg-surface-raised border border-line-soft rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
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
                className="hidden md:inline-flex items-center justify-center bg-accent hover:bg-accent-strong text-white font-bold text-xs tracking-[0.1em] px-4 py-2 rounded-lg transition-all duration-300"
              >
                Get started
              </Link>
            )}

            {/* Mobile hamburger */}
            {effectiveProductMode === 'study' && <button
              ref={mobileButtonRef}
              type="button"
              className={`relative lg:hidden h-11 w-11 rounded-full text-text-muted transition-[color,background-color,transform] duration-200 hover:bg-surface-soft hover:text-text-primary active:scale-95 ${isOpen ? 'bg-surface-soft text-text-primary' : ''}`}
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'close menu' : 'open menu'}
              aria-expanded={isOpen}
              aria-controls="mobile-navigation"
            >
              <span className={`absolute left-1/2 top-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-current transition-transform duration-300 ${isOpen ? '-translate-y-1/2 rotate-45' : '-translate-y-[7px]'}`} />
              <span className={`absolute left-1/2 top-1/2 h-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current transition-[width,opacity] duration-200 ${isOpen ? 'w-0 opacity-0' : 'w-5 opacity-100'}`} />
              <span className={`absolute left-1/2 top-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-current transition-transform duration-300 ${isOpen ? '-translate-y-1/2 -rotate-45' : 'translate-y-[5px]'}`} />
            </button>}
          </div>
          </div>
        </div>

        {/* Mobile menu */}
        {effectiveProductMode === 'study' && isOpen && (
          <div id="mobile-navigation" className="mobile-nav-panel lg:hidden max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain border-t border-line-soft px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <div className="mb-2 flex items-center justify-between px-3 py-1">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-dim">Navigate</span>
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-bold text-accent">Study</span>
            </div>
            {navItems.map((item) => {
              const active = isItemActive(item);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  {...(item.tourId ? { 'data-tour-id': item.tourId } : {})}
                  aria-current={active ? 'page' : undefined}
                  className={`mobile-nav-item mb-1 flex min-h-12 items-center justify-between rounded-2xl px-4 text-sm font-bold tracking-[0.04em] transition-[color,background-color,transform] active:scale-[0.98] ${
                    active
                      ? 'bg-accent-soft text-accent'
                      : 'text-text-primary hover:bg-surface-soft'
                  }`}
                >
                  <span>{item.label}</span>
                  {active && <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_0_4px_var(--accent-soft)]" aria-hidden="true" />}
                </Link>
              );
            })}
            <div className="my-2 border-t border-line-soft" />
            <Link
              to="/demo"
              onClick={() => setIsOpen(false)}
              className="mobile-nav-item mb-1 flex min-h-12 items-center rounded-2xl px-4 text-sm font-bold text-text-primary transition-colors hover:bg-surface-soft"
            >
              Demo
            </Link>
            <Link
              to="/play"
              onClick={() => setIsOpen(false)}
              className="mobile-nav-item mb-1 flex min-h-12 items-center rounded-2xl px-4 text-sm font-bold text-text-primary transition-colors hover:bg-surface-soft"
            >
              Caplet Live
            </Link>
            {!isAuthenticated && (
              <Link
                to="/register"
                onClick={() => setIsOpen(false)}
                className="mt-3 btn-primary min-h-12 text-sm"
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
