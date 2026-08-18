import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AcademicCapIcon,
  ChartBarSquareIcon,
  EllipsisHorizontalCircleIcon,
  HomeIcon,
  LockClosedIcon,
  WrenchScrewdriverIcon,
  BookOpenIcon,
  BookmarkSquareIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';
import { useLayout } from '../contexts/LayoutContext';
import { availableMoneyNavigation, isProductNavItemActive } from '../config/productNavigation';

const icons = {
  Overview: HomeIcon,
  Learn: BookOpenIcon,
  Economy: ChartBarSquareIcon,
  Tools: WrenchScrewdriverIcon,
  Resources: BookmarkSquareIcon,
  'My Money': LockClosedIcon,
};

// At most 5 columns fit legibly on a small phone: Study + 3 sections + More.
const MAX_PRIMARY_ITEMS = 3;

export default function MoneyMobileNav() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { loading: featureFlagsLoading, isEnabled } = useFeatureFlags();
  const { lastStudyRoute = '/dashboard' } = useLayout();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = availableMoneyNavigation({ isAuthenticated, featureFlagsLoading, isFeatureEnabled: isEnabled });
  // On mobile this bar is the ONLY nav in money mode (the hamburger is
  // suppressed), so it must carry the way back to the main app.
  // ProductModeRouteSync flips the mode automatically once the route changes.
  const studyPath = isAuthenticated ? (lastStudyRoute || '/dashboard') : '/library';

  // Study + up to 4 sections fits without an overflow menu; beyond that the
  // labels shrink into illegibility, so the rest moves behind "More".
  const hasOverflow = items.length > MAX_PRIMARY_ITEMS + 1;
  const primaryItems = hasOverflow ? items.slice(0, MAX_PRIMARY_ITEMS) : items;
  const overflowItems = hasOverflow ? items.slice(MAX_PRIMARY_ITEMS) : [];
  const overflowActive = overflowItems.some((item) => isProductNavItemActive(item, location));
  const columns = primaryItems.length + 1 + (hasOverflow ? 1 : 0);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [moreOpen]);

  const itemClass = (active) => `focus-ring press flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-[10px] font-bold transition-colors ${
    active ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-soft hover:text-text-primary'
  }`;

  return (
    <nav
      aria-label="Money navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line-soft bg-surface-raised/95 px-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden"
    >
      {moreOpen && overflowItems.length > 0 && (
        <div
          id="money-nav-overflow"
          className="absolute bottom-full right-1.5 mb-2 w-48 overflow-hidden rounded-xl border border-line-soft bg-surface-raised py-1 shadow-pop animate-rise"
        >
          {overflowItems.map((item) => {
            const Icon = icons[item.label];
            const active = isProductNavItemActive(item, location);
            return (
              <Link
                key={item.label}
                to={item.path}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                onClick={() => setMoreOpen(false)}
                className={`focus-ring flex min-h-11 items-center gap-2.5 px-3 text-xs font-bold transition-colors ${
                  active ? 'bg-accent-soft text-accent' : 'text-text-primary hover:bg-surface-soft'
                }`}
              >
                {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      <div
        className="mx-auto grid max-w-xl gap-0.5"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        <Link to={studyPath} aria-label="Back to Study" className={itemClass(false)}>
          <AcademicCapIcon className="h-4 w-4" aria-hidden="true" />
          <span className="w-full truncate text-center">Study</span>
        </Link>
        {primaryItems.map((item) => {
          const Icon = icons[item.label];
          const active = isProductNavItemActive(item, location);
          return (
            <Link
              key={item.label}
              to={item.path}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={itemClass(active)}
            >
              {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
              <span className="w-full truncate text-center">{item.label}</span>
            </Link>
          );
        })}
        {hasOverflow && (
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-label="More Money sections"
            aria-expanded={moreOpen}
            aria-controls="money-nav-overflow"
            aria-haspopup="true"
            className={itemClass(overflowActive || moreOpen)}
          >
            <EllipsisHorizontalCircleIcon className="h-4 w-4" aria-hidden="true" />
            <span className="w-full truncate text-center">More</span>
          </button>
        )}
      </div>
    </nav>
  );
}
