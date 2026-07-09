import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLayout } from '../contexts/LayoutContext';
import api from '../services/api';
import {
    Squares2X2Icon,
    BookOpenIcon,
    BuildingLibraryIcon,
    AcademicCapIcon,
    WrenchScrewdriverIcon,
    ArrowPathIcon,
    DocumentTextIcon,
    ChevronDoubleLeftIcon,
    ChevronDoubleRightIcon,
    ViewColumnsIcon,
    SunIcon,
    MoonIcon,
    ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

/**
 * The app's vertical navigation island — the "vertical bar" mode. When active
 * it fully replaces the top navbar on large screens, so it carries the brand,
 * primary nav, theme toggle, the switch back to the top bar, and account
 * controls. Shown on every page (desktop only; mobile still uses the top bar),
 * so it stays consistent across the app. Collapse and nav-mode state are owned
 * by LayoutContext so they survive navigation.
 */
export default function Sidebar() {
    const location = useLocation();
    const { user, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const { sidebarCollapsed: collapsed, toggleSidebar, toggleNavMode } = useLayout();

    // Badge counts are fetched here so the rail stays accurate on every page,
    // not just the dashboard. Best-effort — the rail renders fine without them.
    const [dueCount, setDueCount] = useState(0);
    const [savedCount, setSavedCount] = useState(0);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            api.getDueReviewItems().catch(() => null),
            api.getSavedSlides().catch(() => null),
        ]).then(([dueData, savedData]) => {
            if (cancelled) return;
            setDueCount(dueData?.items?.length || 0);
            setSavedCount(savedData?.savedSlides?.length || 0);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const isActive = (path) => {
        if (path === '/dashboard') return location.pathname === '/dashboard';
        return location.pathname === path || location.pathname.startsWith(`${path}/`);
    };

    const items = [
        { path: '/dashboard', label: 'Dashboard', icon: Squares2X2Icon },
        { path: '/library', label: 'Library', icon: BuildingLibraryIcon },
        { path: '/courses', label: 'Curriculum', icon: BookOpenIcon },
        { path: '/classes', label: 'Classes', icon: AcademicCapIcon },
        { path: '/fintools', label: 'Financial Tools', icon: WrenchScrewdriverIcon },
        { path: '/revision', label: 'Revision', icon: ArrowPathIcon, badge: dueCount },
        { path: '/essays', label: 'Essays', icon: DocumentTextIcon, badge: savedCount },
    ];

    const initials = user
        ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || user.firstName?.[0]?.toUpperCase() || 'U'
        : 'U';

    // Shared row shape so nav links, footer actions and the account row line up.
    const row = (active) =>
        `group relative flex items-center gap-3.5 rounded-2xl px-3 py-2.5 transition-colors duration-200 ${
            collapsed ? 'justify-center' : ''
        } ${
            active
                ? 'bg-accent-soft text-accent'
                : 'text-text-muted hover:bg-surface-soft hover:text-text-primary'
        }`;

    return (
        <aside
            className={`hidden lg:flex shrink-0 sticky top-0 h-screen p-4 transition-[width] duration-300 ease-out ${
                collapsed ? 'w-[92px]' : 'w-72'
            }`}
        >
            <div className="flex h-full w-full flex-col rounded-3xl bg-surface-raised p-3 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                {/* Brand */}
                <Link
                    to="/dashboard"
                    className={`flex items-center gap-3 rounded-2xl px-2 py-2 ${collapsed ? 'justify-center' : ''}`}
                >
                    <img
                        src="/logo.png"
                        alt="Caplet"
                        className="h-9 w-9 shrink-0 rounded-full object-contain ring-1 ring-line-soft"
                    />
                    {!collapsed && (
                        <span className="font-bricolage text-xl font-extrabold tracking-[-0.02em] text-text-primary">
                            Caplet.
                        </span>
                    )}
                </Link>

                <div className="my-3 border-t border-line-soft" />

                {/* Primary nav */}
                <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
                    {items.map((item) => {
                        const { path, label, badge } = item;
                        const active = isActive(path);
                        return (
                            <Link
                                key={path}
                                to={path}
                                title={collapsed ? label : undefined}
                                className={row(active)}
                            >
                                <span className="relative shrink-0">
                                    <item.icon className={`w-5 h-5 ${active ? 'text-accent' : ''}`} />
                                    {badge > 0 && collapsed && (
                                        <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white">
                                            {badge > 9 ? '9+' : badge}
                                        </span>
                                    )}
                                </span>
                                {!collapsed && (
                                    <>
                                        <span className="min-w-0 flex-1 truncate text-sm font-bold tracking-[0.02em]">
                                            {label}
                                        </span>
                                        {badge > 0 && (
                                            <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold leading-none text-white">
                                                {badge > 99 ? '99+' : badge}
                                            </span>
                                        )}
                                    </>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="my-3 border-t border-line-soft" />

                {/* Footer: controls the navbar used to hold */}
                <div className="flex flex-col gap-1.5">
                    <button
                        type="button"
                        onClick={toggleTheme}
                        title={collapsed ? (isDark ? 'Light mode' : 'Dark mode') : undefined}
                        aria-label="Toggle dark mode"
                        className={row(false)}
                    >
                        {isDark ? (
                            <SunIcon className="w-5 h-5 shrink-0" />
                        ) : (
                            <MoonIcon className="w-5 h-5 shrink-0" />
                        )}
                        {!collapsed && (
                            <span className="text-sm font-bold tracking-[0.02em]">
                                {isDark ? 'Light mode' : 'Dark mode'}
                            </span>
                        )}
                    </button>

                    {/* Switch the whole app back to the horizontal top bar */}
                    <button
                        type="button"
                        onClick={toggleNavMode}
                        title={collapsed ? 'Use top bar' : undefined}
                        aria-label="Switch to top bar navigation"
                        className={row(false)}
                    >
                        <ViewColumnsIcon className="w-5 h-5 shrink-0 rotate-90" />
                        {!collapsed && (
                            <span className="text-sm font-bold tracking-[0.02em]">Use top bar</span>
                        )}
                    </button>

                    {/* Account → settings, mirrors the navbar's account menu */}
                    <Link
                        to="/settings"
                        title={collapsed ? (user?.firstName || 'Account') : undefined}
                        className={row(isActive('/settings'))}
                    >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold font-mono leading-none text-white">
                            {initials}
                        </span>
                        {!collapsed && (
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-bold text-text-primary">
                                    {user?.firstName || 'Account'}
                                </span>
                                <span className="block truncate text-xs font-medium text-text-dim">
                                    {user?.email || 'Settings'}
                                </span>
                            </span>
                        )}
                    </Link>

                    {/* Sign out — the rail's own logout, so you can leave while in side-bar mode */}
                    <button
                        type="button"
                        onClick={logout}
                        title={collapsed ? 'Sign out' : undefined}
                        aria-label="Sign out"
                        className={`group relative flex items-center gap-3.5 rounded-2xl px-3 py-2.5 text-red-500 transition-colors duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 ${collapsed ? 'justify-center' : ''}`}
                    >
                        <ArrowRightOnRectangleIcon className="w-5 h-5 shrink-0" />
                        {!collapsed && (
                            <span className="text-sm font-bold tracking-[0.02em]">Sign out</span>
                        )}
                    </button>

                    <div className="my-1 border-t border-line-soft" />

                    <button
                        type="button"
                        onClick={toggleSidebar}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className={row(false)}
                    >
                        {collapsed ? (
                            <ChevronDoubleRightIcon className="w-5 h-5 shrink-0" />
                        ) : (
                            <ChevronDoubleLeftIcon className="w-5 h-5 shrink-0" />
                        )}
                        {!collapsed && (
                            <span className="text-sm font-bold tracking-[0.02em]">Collapse</span>
                        )}
                    </button>
                </div>
            </div>
        </aside>
    );
}
