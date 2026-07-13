import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLayout } from '../contexts/LayoutContext';
import api from '../services/api';
import ProductModeSwitch from './ProductModeSwitch';
import { availableMoneyNavigation, isProductNavItemActive } from '../config/productNavigation';
import {
    Squares2X2Icon,
    BookOpenIcon,
    BuildingLibraryIcon,
    AcademicCapIcon,
    WrenchScrewdriverIcon,
    ArrowPathIcon,
    DocumentTextIcon,
    CalendarDaysIcon,
    ChevronDoubleLeftIcon,
    ChevronDoubleRightIcon,
    ViewColumnsIcon,
    SunIcon,
    MoonIcon,
    ChartBarSquareIcon,
    LockClosedIcon,
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
    const { user, isAuthenticated } = useAuth();
    const { loading: featureFlagsLoading, isEnabled } = useFeatureFlags();
    const { isDark, toggleTheme } = useTheme();
    const { sidebarCollapsed: collapsed, toggleSidebar, toggleNavMode, productMode = 'study' } = useLayout();

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

    const studyItems = [
        { path: '/dashboard', label: 'Dashboard', icon: Squares2X2Icon },
        { path: '/study-plan', label: 'Study Plan', icon: CalendarDaysIcon },
        { path: '/library', label: 'Library', icon: BuildingLibraryIcon },
        { path: '/courses', label: 'Curriculum', icon: BookOpenIcon },
        { path: '/classes', label: 'Classes', icon: AcademicCapIcon },
        { path: '/revision', label: 'Revision', icon: ArrowPathIcon, badge: dueCount },
        { path: '/essays', label: 'Essays', icon: DocumentTextIcon, badge: savedCount },
    ];

    const moneyIcons = {
        Overview: Squares2X2Icon,
        Learn: BookOpenIcon,
        Economy: ChartBarSquareIcon,
        Tools: WrenchScrewdriverIcon,
        'My Money': LockClosedIcon,
    };
    const items = productMode === 'money'
        ? availableMoneyNavigation({ isAuthenticated, featureFlagsLoading, isFeatureEnabled: isEnabled })
            .map((item) => ({ ...item, icon: moneyIcons[item.label] }))
        : studyItems;

    const initials = user
        ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || user.firstName?.[0]?.toUpperCase() || 'U'
        : 'U';

    // Shared row shape so nav links, footer actions and the account row line up.
    const row = (active) =>
        `group relative flex min-h-11 items-center gap-3.5 transition-[color,background-color,transform,box-shadow] duration-200 ease-out ${
            collapsed ? 'mx-auto h-11 w-11 justify-center rounded-full p-0 active:scale-95' : 'rounded-2xl px-3 py-2.5 active:scale-[0.99]'
        } ${
            active
                ? 'bg-accent-soft text-accent shadow-[0_10px_24px_-18px_rgba(19,81,170,0.8)]'
                : 'text-text-muted hover:bg-surface-soft hover:text-text-primary'
        }`;

    return (
        <aside
            className={`hidden lg:flex shrink-0 sticky top-0 h-screen p-4 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                collapsed ? 'w-[88px]' : 'w-72'
            }`}
        >
            <div className={`flex h-full w-full flex-col bg-surface-raised shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] transition-[padding,border-radius] duration-300 ${collapsed ? 'rounded-[28px] p-2' : 'rounded-3xl p-3'}`}>
                {/* Brand */}
                <Link
                    to={productMode === 'money' ? '/money' : '/dashboard'}
                    className={`flex min-h-11 items-center gap-3 transition-transform duration-200 hover:scale-[1.02] ${collapsed ? 'mx-auto h-11 w-11 justify-center rounded-full p-0' : 'rounded-2xl px-2 py-2'}`}
                >
                    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-soft ring-1 ring-line-soft">
                        <img src="/logo.png" alt="Caplet" className="h-full w-full scale-105 rounded-full object-cover" />
                    </span>
                    {!collapsed && (
                        <span className="font-bricolage text-xl font-extrabold tracking-[-0.02em] text-text-primary">
                            Caplet.
                        </span>
                    )}
                </Link>

                <ProductModeSwitch collapsed={collapsed} className="mt-3 w-full" />

                <div className="my-3 border-t border-line-soft" />

                {/* Primary nav */}
                <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
                    {items.map((item) => {
                        const { path, label, badge } = item;
                        const active = productMode === 'money'
                            ? isProductNavItemActive(item, location)
                            : isActive(path);
                        return (
                            <Link
                                key={path}
                                to={path}
                                title={collapsed ? label : undefined}
                                className={row(active)}
                            >
                                <span className="relative grid h-5 w-5 shrink-0 place-items-center">
                                    <item.icon className={`h-5 w-5 ${active ? 'text-accent' : ''}`} aria-hidden="true" />
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
