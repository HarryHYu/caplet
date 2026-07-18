import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';
import { useLayout } from '../contexts/LayoutContext';
import ProductModeSwitch from './ProductModeSwitch';
import UserAvatar from './UserAvatar';
import { availableMoneyNavigation, isProductNavItemActive } from '../config/productNavigation';
import {
    Squares2X2Icon,
    BookOpenIcon,
    CalendarDaysIcon,
    ArrowPathIcon,
    ChartBarIcon,
    BookmarkIcon,
    DocumentTextIcon,
    WrenchScrewdriverIcon,
    BookmarkSquareIcon,
    ChevronDoubleLeftIcon,
    ChevronDoubleRightIcon,
    ChartBarSquareIcon,
    LockClosedIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';

/**
 * The app's vertical navigation island — the "vertical bar" mode. When active
 * it fully replaces the top navbar on large screens, so it carries the brand,
 * primary nav, account controls, and rail collapse action. Theme and navigation
 * layout choices live in Settings → Appearance. Shown on every page (desktop
 * only; mobile still uses the top bar), so it stays consistent across the app.
 * Collapse and nav-mode state are owned by LayoutContext so they survive navigation.
 */
export default function Sidebar() {
    const location = useLocation();
    const { user, isAuthenticated } = useAuth();
    const { loading: featureFlagsLoading, isEnabled } = useFeatureFlags();
    const {
        sidebarCollapsed: collapsed,
        toggleSidebar,
        sidebarWidth,
        resizeSidebar,
        sidebarWidthBounds,
        productMode = 'study',
    } = useLayout();
    const sidebarRef = useRef(null);
    const [isResizing, setIsResizing] = useState(false);

    const isActive = (path) => {
        if (path === '/dashboard') return location.pathname === '/dashboard';
        return location.pathname === path || location.pathname.startsWith(`${path}/`);
    };

    const studyPrimaryItems = [
        { path: '/dashboard', label: 'Dashboard', icon: Squares2X2Icon },
        { path: '/study-plan', label: 'Study plan', icon: CalendarDaysIcon },
        { path: '/practice', label: 'Practice', icon: ArrowPathIcon },
        { path: '/mastery', label: 'Mastery', icon: ChartBarIcon },
        { path: '/revision', label: 'Revision', icon: BookmarkIcon },
        { path: '/essays', label: 'Essays', icon: DocumentTextIcon },
        { path: '/library', label: 'Learn', icon: BookOpenIcon },
        { path: '/classes', label: 'Classes', icon: UserGroupIcon },
    ];

    const moneyIcons = {
        Overview: Squares2X2Icon,
        Learn: BookOpenIcon,
        Economy: ChartBarSquareIcon,
        Tools: WrenchScrewdriverIcon,
        Resources: BookmarkSquareIcon,
        'My Money': LockClosedIcon,
    };
    const items = productMode === 'money'
        ? availableMoneyNavigation({ isAuthenticated, featureFlagsLoading, isFeatureEnabled: isEnabled })
            .map((item) => ({ ...item, icon: moneyIcons[item.label] }))
        : studyPrimaryItems;

    // Shared row shape so nav links, footer actions and the account row line up.
    const row = (active) =>
        `group relative flex min-h-11 items-center gap-3 transition-[color,background-color,transform,box-shadow] duration-200 ease-out ${
            collapsed ? 'mx-auto aspect-square h-9 min-h-0 w-9 shrink-0 justify-center rounded-full p-0 active:scale-95' : 'rounded-xl px-3 py-2 active:scale-[0.99]'
        } ${
            active
                ? 'bg-accent-soft text-accent'
                : 'text-text-muted hover:bg-surface-soft hover:text-text-primary'
        }`;

    const updateWidthFromPointer = (event) => {
        const rect = sidebarRef.current?.getBoundingClientRect();
        if (!rect) return;
        resizeSidebar(event.clientX - rect.left);
    };

    const handleResizeStart = (event) => {
        if (collapsed) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsResizing(true);
        updateWidthFromPointer(event);
    };

    const handleResizeEnd = (event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        setIsResizing(false);
    };

    const handleResizeKeyDown = (event) => {
        if (collapsed) return;
        const { min, max } = sidebarWidthBounds;
        const step = event.shiftKey ? 32 : 12;
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            resizeSidebar(Math.min(max, sidebarWidth + step));
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            resizeSidebar(Math.max(min, sidebarWidth - step));
        } else if (event.key === 'Home') {
            event.preventDefault();
            resizeSidebar(min);
        } else if (event.key === 'End') {
            event.preventDefault();
            resizeSidebar(max);
        }
    };

    return (
        <aside
            ref={sidebarRef}
            aria-label="Sidebar navigation"
            className={`relative sticky top-0 hidden h-screen shrink-0 p-3 lg:flex ${isResizing ? 'select-none' : 'transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]'}`}
            style={{ width: collapsed ? 96 : sidebarWidth }}
        >
            <div className={`flex h-full w-full flex-col border border-line-soft bg-surface-raised shadow-[0_28px_64px_-38px_rgba(20,20,18,0.32)] transition-[padding,border-radius] duration-300 ${collapsed ? 'rounded-3xl p-2' : 'rounded-3xl p-3'}`}>
                {/* Brand */}
                <Link
                    to={productMode === 'money' ? '/money' : '/dashboard'}
                    className={`flex min-h-12 items-center gap-2 transition-[background-color,transform] duration-200 hover:bg-surface-soft hover:scale-[1.01] ${collapsed ? 'mx-auto aspect-square h-10 min-h-0 w-10 shrink-0 justify-center rounded-full p-0' : 'rounded-xl px-1.5 py-1.5'}`}
                >
                    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-soft ring-1 ring-line-soft">
                        <img src="/logo.png" alt="Caplet" className="h-full w-full scale-105 rounded-full object-cover" />
                    </span>
                    {!collapsed && (
                        <span className="font-bricolage text-xl font-extrabold tracking-[-0.03em] text-text-primary">
                            Caplet.
                        </span>
                    )}
                </Link>

                <ProductModeSwitch collapsed={collapsed} className="mt-2 w-full" />

                <div className="my-3 border-t border-line-soft" />

                {/* Primary nav */}
                <nav aria-label="Primary navigation" className="nav-scrollbar-hidden flex flex-1 flex-col gap-1 overflow-x-clip overflow-y-auto pt-1">
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
                                aria-current={active ? 'page' : undefined}
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
                                        <span className="min-w-0 flex-1 truncate text-sm font-bold tracking-[0.01em]">
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

                {/* Account and rail controls stay quiet; theme and navigation
                    choices live in Settings → Appearance. */}
                <div className="flex flex-col gap-1">
                    {/* Account → settings, mirrors the navbar's account menu */}
                    <Link
                        to="/settings"
                        title={collapsed ? (user?.firstName || 'Account') : undefined}
                        aria-label={collapsed ? 'Settings' : undefined}
                        className={row(isActive('/settings'))}
                    >
                        <UserAvatar user={user} size="sm" showStatus={false} />
                        {!collapsed && (
                            <span className="min-w-0 flex-1 truncate text-xs font-bold text-text-primary">
                                {user?.firstName || 'Account'}
                            </span>
                        )}
                    </Link>

                    <div className="my-2 border-t border-line-soft" />

                    <button
                        type="button"
                        onClick={toggleSidebar}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className={row(false)}
                    >
                        {collapsed ? (
                            <ChevronDoubleRightIcon className="h-4 w-4 shrink-0" />
                        ) : (
                            <ChevronDoubleLeftIcon className="h-4 w-4 shrink-0" />
                        )}
                        {!collapsed && (
                            <span className="text-xs font-bold tracking-[0.02em]">Collapse</span>
                        )}
                    </button>
                </div>
            </div>
            {!collapsed && (
                <div
                    role="separator"
                    aria-label="Resize sidebar"
                    aria-orientation="vertical"
                    aria-valuemin={sidebarWidthBounds.min}
                    aria-valuemax={sidebarWidthBounds.max}
                    aria-valuenow={sidebarWidth}
                    aria-valuetext={`${sidebarWidth} pixels wide`}
                    tabIndex={0}
                    onKeyDown={handleResizeKeyDown}
                    onPointerDown={handleResizeStart}
                    onPointerMove={(event) => isResizing && updateWidthFromPointer(event)}
                    onPointerUp={handleResizeEnd}
                    onPointerCancel={handleResizeEnd}
                    className="group absolute right-0 top-1/2 z-30 hidden h-28 w-5 -translate-y-1/2 cursor-col-resize items-center justify-center lg:flex"
                    title="Drag to resize sidebar"
                >
                    <span className="h-12 w-1 rounded-full bg-line-soft transition-[height,background-color,box-shadow] duration-200 group-hover:h-20 group-hover:bg-accent/70 group-focus-visible:h-20 group-focus-visible:bg-accent group-focus-visible:shadow-[0_0_0_4px_var(--accent-soft)]" />
                </div>
            )}
        </aside>
    );
}
