import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';
import { useLayout } from '../contexts/LayoutContext';
import ProductModeSwitch from './ProductModeSwitch';
import UserAvatar from './UserAvatar';
import { isProductNavItemActive, moneyNavigation } from '../config/productNavigation';

// `mobileOnly` is set when the vertical rail owns navigation on large screens —
// the top bar then only appears on mobile, so the two never overlap.
const Navbar = ({ mobileOnly = false, hideOnTablet = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { loading: featureFlagsLoading, isEnabled } = useFeatureFlags();
  const { productMode = 'study' } = useLayout();
  const effectiveProductMode = productMode;
  const menuRef = useRef(null);
  const userButtonRef = useRef(null);
  const mobileButtonRef = useRef(null);

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

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (isOpen) mobileButtonRef.current?.focus();
      else if (showUserMenu) userButtonRef.current?.focus();
      setShowUserMenu(false);
      setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, showUserMenu]);

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

  const visibleItems = (items) => items.filter((item) => {
    if (item.flagKey && (featureFlagsLoading || !isEnabled(item.flagKey))) return false;
    if (isAuthenticated) return !item.publicOnly;
    return !item.privateOnly;
  });
  const visibleCoreItems = effectiveProductMode === 'money' ? visibleItems(moneyNavigation) : visibleItems(studyCoreItems);

  const homePath = effectiveProductMode === 'money' ? '/money' : isAuthenticated ? '/dashboard' : '/';
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

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-shadow duration-300 bg-surface-body text-text-primary ${
        mobileOnly ? 'lg:hidden' : ''
      } ${
        hideOnTablet ? 'md:max-lg:hidden' : ''
      } ${
        scrolled ? 'shadow-[0_6px_24px_-16px_rgba(0,0,0,0.4)]' : ''
      }`}
    >
      <div className="mx-auto max-w-[1400px] px-3 md:px-6 lg:px-8">
        <div className="flex h-[52px] items-center justify-between gap-2 md:h-14 md:gap-3">

          <div className="flex min-w-0 items-center gap-1.5 md:gap-3">
            {/* Logo */}
            <Link to={homePath} className="flex items-center gap-2 group relative z-10 shrink-0">
              <div className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-surface-soft ring-1 ring-line-soft transition-all duration-300 group-hover:scale-105 group-hover:ring-accent">
                <img
                  src="/logo.png"
                  alt="Caplet logo"
                  className="h-full w-full scale-105 rounded-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <span className="hidden text-base font-bricolage font-extrabold tracking-[-0.02em] text-text-primary transition-colors duration-300 group-hover:text-accent sm:inline md:text-lg">
                Caplet.
              </span>
            </Link>
            <ProductModeSwitch className="shrink-0" />
          </div>

          {/* Right cluster — folded nav toggles pinned to the far right, then actions */}
          <div className="flex items-center gap-1.5 md:gap-2">

          {/* Desktop nav — keep the global study chrome intentionally small. */}
          <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-1">
            {visibleCoreItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                {...(item.tourId ? { 'data-tour-id': item.tourId } : {})}
                aria-current={isItemActive(item) ? 'page' : undefined}
                className={`inline-flex min-h-9 items-center rounded-lg px-2 text-xs font-bold tracking-[0.02em] transition-colors ${
                  isItemActive(item) ? 'text-accent bg-accent-soft' : 'text-text-muted hover:text-text-primary hover:bg-surface-soft'
                }`}
              >
                {item.label}
              </Link>
            ))}

          </nav>

          {/* Actions */}
          <div className="relative z-10 flex shrink-0 items-center gap-1 md:gap-1.5">
            {isAuthenticated ? (
              <div className="relative" ref={menuRef}>
                <button
                  ref={userButtonRef}
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                  aria-controls="account-navigation"
                  className={`flex h-9 w-9 items-center justify-center gap-1.5 rounded-full border p-1 transition-all duration-200 active:scale-95 sm:w-auto sm:justify-start sm:pr-2.5 ${
                    showUserMenu
                      ? 'border-accent bg-accent-soft'
                      : 'border-line-soft hover:border-text-dim hover:bg-surface-soft'
                  }`}
                >
                  <UserAvatar user={user} size="sm" showStatus={false} />
                  <span className="hidden text-xs font-medium leading-none text-text-primary sm:inline">
                    {user?.firstName || 'Account'}
                  </span>
                  <svg
                    className={`hidden h-2.5 w-2.5 text-text-dim transition-transform duration-200 sm:block ${showUserMenu ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showUserMenu && (
                  <div id="account-navigation" className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-xl border border-line-soft bg-surface-raised py-1 shadow-[0_8px_32px_rgba(0,0,0,0.12)] animate-in fade-in slide-in-from-top-1 duration-150">
                    <Link
                      to="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary transition-colors hover:bg-surface-soft"
                    >
                      <svg className="h-3 w-3 text-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </Link>
                    <div className="my-1 border-t border-line-soft" />
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="hidden items-center justify-center rounded-lg bg-accent px-3 py-1.5 text-[11px] font-bold tracking-[0.08em] text-white transition-all duration-300 hover:bg-accent-strong md:inline-flex"
              >
                Get started
              </Link>
            )}

            {/* Mobile hamburger */}
            {effectiveProductMode === 'study' && <button
              ref={mobileButtonRef}
              type="button"
              className={`relative h-9 w-9 rounded-full text-text-muted transition-[color,background-color,transform] duration-200 hover:bg-surface-soft hover:text-text-primary active:scale-95 lg:hidden ${isOpen ? 'bg-surface-soft text-text-primary' : ''}`}
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'close menu' : 'open menu'}
              aria-expanded={isOpen}
              aria-controls="mobile-navigation"
            >
              <span className={`absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-current transition-transform duration-300 ${isOpen ? '-translate-y-1/2 rotate-45' : '-translate-y-[6px]'}`} />
              <span className={`absolute left-1/2 top-1/2 h-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current transition-[width,opacity] duration-200 ${isOpen ? 'w-0 opacity-0' : 'w-4 opacity-100'}`} />
              <span className={`absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-current transition-transform duration-300 ${isOpen ? '-translate-y-1/2 -rotate-45' : 'translate-y-[4px]'}`} />
            </button>}
          </div>
          </div>
        </div>

        {/* Mobile menu */}
        {effectiveProductMode === 'study' && isOpen && (
          <div id="mobile-navigation" className="mobile-nav-panel max-h-[calc(100dvh-3.25rem)] overflow-y-auto overscroll-contain border-t border-line-soft px-1.5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
            <div className="mb-2 flex items-center justify-between px-3 py-1">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-dim">Navigate</span>
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-bold text-accent">Study</span>
            </div>
            {visibleCoreItems.map((item) => {
              const active = isItemActive(item);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  {...(item.tourId ? { 'data-tour-id': item.tourId } : {})}
                  aria-current={active ? 'page' : undefined}
                  className={`mobile-nav-item mb-1 flex min-h-10 items-center justify-between rounded-xl px-3 text-xs font-bold tracking-[0.02em] transition-[color,background-color,transform] active:scale-[0.98] ${
                    active
                      ? 'bg-accent-soft text-accent'
                      : 'text-text-primary hover:bg-surface-soft'
                  }`}
                >
                  <span>{item.label}</span>
                  {active && <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />}
                </Link>
              );
            })}
            {!isAuthenticated && (
              <Link
                to="/register"
                onClick={() => setIsOpen(false)}
                className="btn-primary mt-3 min-h-10 text-xs"
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
