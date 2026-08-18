import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { STUDY_NAV_ITEMS, MONEY_NAV_ITEM } from '../config/navigation';
import UserAvatar from './UserAvatar';

const hiddenPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/play'];

// Shared study set (config/navigation.js) plus the Money workspace entry, so
// tablet users see exactly what the sidebar and phone hamburger expose.
const navItems = [...STUDY_NAV_ITEMS, MONEY_NAV_ITEM];

const isActivePath = (pathname, path) => path === '/dashboard'
    ? pathname === path
    : pathname === path || pathname.startsWith(`${path}/`);

/**
 * Signed-in tablet navigation. It owns the dashboard's workspace controls
 * independently of the visitor-facing tablet header and the desktop chrome.
 */
export default function TabletDashboardNavbar() {
    const location = useLocation();
    const { user, logout, isAuthenticated } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef(null);
    const userButtonRef = useRef(null);

    useEffect(() => {
        setShowUserMenu(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) setShowUserMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key !== 'Escape' || !showUserMenu) return;
            setShowUserMenu(false);
            userButtonRef.current?.focus();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [showUserMenu]);

    if (!isAuthenticated || hiddenPaths.includes(location.pathname)) return null;
    if (location.pathname.startsWith('/guardian-consent/') || location.pathname.startsWith('/live/host')) return null;

    return (
        <header
            data-testid="tablet-dashboard-navbar"
            className="fixed inset-x-0 top-0 z-50 hidden bg-surface-body text-text-primary shadow-pop md:block lg:hidden"
        >
            <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-4 md:px-6">
                <Link to="/dashboard" className="focus-ring group flex shrink-0 items-center gap-2 rounded-lg" aria-label="Caplet dashboard">
                    <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-surface-soft ring-1 ring-line-soft transition-transform duration-300 group-hover:scale-105">
                        <img src="/logo.png" alt="Caplet logo" className="h-full w-full scale-105 rounded-full object-cover" />
                    </span>
                    <span className="font-bricolage text-lg font-extrabold tracking-[-0.02em] text-text-primary">Caplet</span>
                </Link>

                <nav aria-label="Dashboard navigation" className="nav-scrollbar-hidden flex min-w-0 items-center gap-1 overflow-x-auto">
                    {navItems.map((item) => {
                        const active = isActivePath(location.pathname, item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                aria-current={active ? 'page' : undefined}
                                className={`focus-ring press inline-flex min-h-9 shrink-0 items-center rounded-lg px-2 text-xs font-bold tracking-[0.02em] transition-colors ${
                                    active ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-soft hover:text-text-primary'
                                }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                    <div className="relative" ref={menuRef}>
                        <button
                            ref={userButtonRef}
                            type="button"
                            onClick={() => setShowUserMenu((open) => !open)}
                            aria-expanded={showUserMenu}
                            aria-haspopup="true"
                            aria-controls="tablet-account-navigation"
                            aria-label={`${user?.firstName || 'Account'} menu`}
                            className={`focus-ring flex h-9 w-9 items-center justify-center rounded-full border p-1 transition-colors ${
                                showUserMenu ? 'border-accent bg-accent-soft' : 'border-line-soft hover:border-text-dim hover:bg-surface-soft'
                            }`}
                        >
                            <UserAvatar user={user} size="sm" showStatus={false} />
                        </button>

                        {showUserMenu && (
                            <div id="tablet-account-navigation" className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-xl border border-line-soft bg-surface-raised py-1 shadow-pop animate-pop">
                                <Link to="/settings" onClick={() => setShowUserMenu(false)} className="focus-ring block px-3 py-1.5 text-xs text-text-primary transition-colors hover:bg-surface-soft">Settings</Link>
                                <div className="my-1 border-t border-line-soft" />
                                <button type="button" onClick={logout} className="focus-ring w-full px-3 py-1.5 text-left text-xs text-text-error transition-colors hover:bg-surface-error">Sign out</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
