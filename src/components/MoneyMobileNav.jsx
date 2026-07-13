import { Link, useLocation } from 'react-router-dom';
import {
  ChartBarSquareIcon,
  HomeIcon,
  LockClosedIcon,
  WrenchScrewdriverIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';
import { availableMoneyNavigation, isProductNavItemActive } from '../config/productNavigation';

const icons = {
  Overview: HomeIcon,
  Learn: BookOpenIcon,
  Economy: ChartBarSquareIcon,
  Tools: WrenchScrewdriverIcon,
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line-soft bg-surface-raised/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur lg:hidden"
    >
      <div
        className="mx-auto grid max-w-xl gap-1"
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
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold transition-colors ${
                active ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-soft hover:text-text-primary'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
