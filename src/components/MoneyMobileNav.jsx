import { Link, useLocation } from 'react-router-dom';
import {
  ChartBarSquareIcon,
  HomeIcon,
  LockClosedIcon,
  WrenchScrewdriverIcon,
  BookOpenIcon,
  BookmarkSquareIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';
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
  const items = availableMoneyNavigation({ isAuthenticated, featureFlagsLoading, isFeatureEnabled: isEnabled });

  return (
    <nav
      aria-label="Money navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line-soft bg-surface-raised/95 px-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden"
    >
      <div
        className="mx-auto grid max-w-xl gap-0.5"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
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
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
