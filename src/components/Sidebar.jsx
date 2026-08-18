import { createElement, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    ArrowRightStartOnRectangleIcon,
    BookOpenIcon,
    CalendarDaysIcon,
    ChevronDoubleLeftIcon,
    ChevronDoubleRightIcon,
    Cog6ToothIcon,
    CalculatorIcon,
    DocumentTextIcon,
    EllipsisVerticalIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useLayout } from '../contexts/LayoutContext';
import { usePinnedNavItems, RESOURCE_SHORTCUTS } from '../lib/usePinnedNavItems';
import { STUDY_NAV_ITEMS, MONEY_NAV_ITEM } from '../config/navigation';
import UserAvatar from './UserAvatar';

export default function Sidebar() {
    const location = useLocation();
    const { user, logout } = useAuth();
    const {
        sidebarCollapsed: collapsed,
        toggleSidebar,
        sidebarWidth,
        resizeSidebar,
        sidebarWidthBounds,
    } = useLayout();
    const sidebarRef = useRef(null);
    const [isResizing, setIsResizing] = useState(false);
    const [isDropTarget, setIsDropTarget] = useState(false);
    const [shortcutNotice, setShortcutNotice] = useState('');
    const { pinnedItems, pin, unpin } = usePinnedNavItems();

    const shortcutIcons = {
        book: BookOpenIcon,
        document: DocumentTextIcon,
        calendar: CalendarDaysIcon,
        calculator: CalculatorIcon,
        notes: DocumentTextIcon,
    };

    const isActive = (path, end = false) => end
        ? location.pathname === path
        : location.pathname === path || location.pathname.startsWith(`${path}/`);

    const rowClass = (active) => `focus-ring group relative flex min-h-11 items-center gap-3 text-sm font-medium transition-[color,background-color,transform] duration-150 ${
        collapsed
            ? 'mx-auto aspect-square h-11 w-11 justify-center rounded-full p-0 press'
            : 'rounded-lg px-3 py-2 press'
    } ${
        active
            ? `${collapsed ? 'bg-accent-soft' : ''} font-bold text-accent`
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
        const step = event.shiftKey ? 24 : 8;
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

    const renderLink = (item) => {
        const { path, label, end = false } = item;
        const active = isActive(path, end);
        return (
            <Link
                key={path}
                to={path}
                title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
                aria-current={active ? 'page' : undefined}
                className={rowClass(active)}
            >
                {active && !collapsed && <span className="absolute -left-5 inset-y-1.5 w-0.5 rounded-r-full bg-accent" aria-hidden="true" />}
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
            </Link>
        );
    };

    const handleDrop = (event) => {
        event.preventDefault();
        const id = event.dataTransfer.getData('application/x-caplet-shortcut') || event.dataTransfer.getData('text/plain');
        const result = pin(id);
        setIsDropTarget(false);
        if (result === 'invalid') {
            // Nothing was added — never announce success for an unknown drop.
            setShortcutNotice('');
            return;
        }
        const item = RESOURCE_SHORTCUTS.find((shortcut) => shortcut.id === id);
        setShortcutNotice(result === 'duplicate'
            ? `${item.label} is already in the sidebar.`
            : `${item.label} added to the sidebar.`);
    };

    return (
        <aside
            ref={sidebarRef}
            aria-label="Sidebar navigation"
            onDragEnter={(event) => { event.preventDefault(); setIsDropTarget(true); }}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setIsDropTarget(true); }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsDropTarget(false); }}
            onDrop={handleDrop}
            className={`relative sticky top-0 hidden h-screen shrink-0 border-r bg-surface-body lg:flex ${isDropTarget ? 'border-accent bg-accent-soft/30' : 'border-line-soft'} ${isResizing ? 'select-none' : 'transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]'}`}
            style={{ width: collapsed ? 76 : sidebarWidth }}
        >
            <div className={`flex h-full min-w-0 flex-1 flex-col py-5 ${collapsed ? 'px-2.5' : 'px-5'}`}>
                <Link
                    to="/dashboard"
                    aria-label="Caplet dashboard"
                    className={`flex min-h-14 items-center gap-2.5 rounded-lg transition-colors hover:bg-surface-soft ${collapsed ? 'mx-auto aspect-square h-12 min-h-0 w-12 justify-center p-0' : 'px-1.5'}`}
                >
                    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-line-soft bg-surface-raised">
                        <img src="/logo.png" alt="" className="h-full w-full object-cover" />
                    </span>
                    {!collapsed && <span className="font-display text-xl font-extrabold tracking-[-0.03em] text-text-primary">Caplet</span>}
                </Link>

                <nav aria-label="Primary navigation" className="mt-8 flex flex-col gap-1">
                    {STUDY_NAV_ITEMS.map(renderLink)}
                </nav>

                {pinnedItems.length > 0 && (
                    <nav aria-label="Pinned shortcuts" className="mt-5 border-t border-line-soft pt-4">
                        {!collapsed && <p className="mb-2 px-3 text-xs font-bold text-text-dim">Shortcuts</p>}
                        <div className="flex flex-col gap-1">
                            {pinnedItems.map((item) => {
                                const active = isActive(item.path);
                                const Icon = shortcutIcons[item.icon];
                                return (
                                    <div key={item.id} className="group/shortcut relative flex items-center">
                                        <Link to={item.path} title={collapsed ? item.label : undefined} aria-label={item.label} aria-current={active ? 'page' : undefined} className={`${rowClass(active)} min-w-0 flex-1`}>
                                            {active && !collapsed && <span className="absolute -left-5 inset-y-1.5 w-0.5 rounded-r-full bg-accent" aria-hidden="true" />}
                                            {createElement(Icon, { className: 'h-5 w-5 shrink-0', 'aria-hidden': true })}
                                            {!collapsed && <span className="min-w-0 flex-1 truncate">{item.navLabel || item.label}</span>}
                                        </Link>
                                        {!collapsed && (
                                            <button type="button" onClick={() => unpin(item.id)} aria-label={`Remove ${item.label} from sidebar`} title="Remove shortcut" className="focus-ring absolute right-1 grid h-8 w-8 place-items-center rounded-md text-text-dim opacity-0 transition-opacity hover:bg-surface-soft hover:text-text-primary focus:opacity-100 group-hover/shortcut:opacity-100">
                                                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </nav>
                )}

                {isDropTarget && !collapsed && <p className="mt-4 rounded-lg border border-dashed border-accent px-3 py-2 text-center text-xs font-bold text-accent">Drop to add shortcut</p>}
                <p className="sr-only" aria-live="polite">{shortcutNotice}</p>

                <div className="mt-auto flex flex-col gap-1">
                    <button
                        type="button"
                        onClick={toggleSidebar}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className={rowClass(false)}
                    >
                        {collapsed
                            ? <ChevronDoubleRightIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                            : <ChevronDoubleLeftIcon className="h-5 w-5 shrink-0" aria-hidden="true" />}
                        {!collapsed && <span className="min-w-0 flex-1 text-left">Collapse</span>}
                    </button>

                    <div className="my-3 border-t border-line-soft" />

                    {renderLink(MONEY_NAV_ITEM)}
                    {renderLink({ path: '/settings', label: 'Settings', icon: Cog6ToothIcon, end: false })}

                    <div className="my-3 border-t border-line-soft" />

                    {/* Account footer — the vertical rail is the only chrome on
                        desktop, so it must carry a sign-out of its own. */}
                    <div className={`flex items-center gap-2.5 ${collapsed ? 'flex-col' : 'px-1.5'}`}>
                        <UserAvatar user={user} size="sm" showStatus={false} />
                        {!collapsed && (
                            <span className="min-w-0 flex-1 truncate text-xs font-bold text-text-primary">
                                {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Account'}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => logout?.()}
                            aria-label="Sign out"
                            title="Sign out"
                            className="focus-ring press grid h-9 w-9 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-error hover:text-text-error"
                        >
                            <ArrowRightStartOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>
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
                    className="group absolute right-0 top-1/2 z-30 hidden h-28 w-5 -translate-y-1/2 translate-x-1/2 cursor-col-resize items-center justify-center lg:flex"
                    title="Drag to resize sidebar"
                >
                    <span className="grid h-14 w-5 place-items-center rounded-full border border-line-soft bg-surface-raised text-text-dim shadow-card transition-colors group-hover:border-accent/40 group-hover:text-accent group-focus-visible:border-accent group-focus-visible:text-accent">
                        <EllipsisVerticalIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                </div>
            )}
        </aside>
    );
}
