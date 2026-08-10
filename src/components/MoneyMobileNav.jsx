import { Link, useLocation } from 'react-router-dom';
import {
  AcademicCapIcon,
  ChartBarSquareIcon,
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

export default function MoneyMobileNav() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { loading: featureFlagsLoading, isEnabled } = useFeatureFlags();
  const { lastStudyRoute = '/dashboard' } = useLayout();
  const items = availableMoneyNavigation({ isAuthenticated, featureFlagsLoading, isFeatureEnabled: isEnabled });
  // On mobile this bar is the ONLY nav in money mode (the hamburger is
  // suppressed), so it must carry the way back to the main app.
  // ProductModeRouteSync flips the mode automatically once the route changes.
  const studyPath = isAuthenticated ? (lastStudyRoute || '/dashboard') : '/library';

  return (
    <nav
      aria-label="Money navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line-soft bg-surface-raised/95 px-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden"
    >
      <div
        className="mx-auto grid max-w-xl gap-0.5"
        style={{ gridTemplateColumns: `repeat(${items.length + 1}, minmax(0, 1fr))` }}
      >
        <Link
          to={studyPath}
          className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-[9px] font-bold text-text-muted transition-colors hover:bg-surface-soft hover:text-text-primary"
        >
          <AcademicCapIcon className="h-4 w-4" aria-hidden="true" />
          <span className="w-full truncate text-center">Study</span>
        </Link>
        {items.map((item) => {
          const Icon = icons[item.label];
          const active = isProductNavItemActive(item, location);
          return (
            <Link
              key={item.label}
              to={item.path}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-[9px] font-bold transition-colors ${
                active ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-soft hover:text-text-primary'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="w-full truncate text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
