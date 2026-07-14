import { useNavigate } from 'react-router-dom';
import { BanknotesIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';
import { useLayout } from '../contexts/LayoutContext';
import { canAccessMoneyRoute } from '../config/productNavigation';

export default function ProductModeSwitch({ collapsed = false, className = '' }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { loading: featureFlagsLoading, isEnabled } = useFeatureFlags();
  const {
    productMode = 'study',
    setProductMode,
    lastStudyRoute = '/dashboard',
    lastMoneyRoute = '/money',
  } = useLayout();
  const selectMode = (mode) => {
    if (mode === productMode) return;
    setProductMode?.(mode);
    const studyFallback = isAuthenticated ? '/dashboard' : '/library';
    const publicStudyRoute = ['/library', '/courses', '/edutools'].some(
      (prefix) => lastStudyRoute === prefix || lastStudyRoute?.startsWith(`${prefix}/`)
    );
    const studyDestination = isAuthenticated || publicStudyRoute ? lastStudyRoute : studyFallback;
    const moneyDestination = canAccessMoneyRoute(lastMoneyRoute, {
      isAuthenticated,
      featureFlagsLoading,
      isFeatureEnabled: isEnabled,
    }) ? lastMoneyRoute : '/money';
    navigate(mode === 'money' ? moneyDestination : (studyDestination || studyFallback));
  };

  return (
    <div
      role="group"
      aria-label="Product mode"
      className={`${collapsed ? 'flex flex-col items-center gap-1 bg-transparent p-0' : 'inline-flex rounded-2xl bg-surface-soft p-1'} ${className}`}
    >
      {[
        { value: 'study', label: 'Study', icon: BookOpenIcon },
        { value: 'money', label: 'Money', icon: BanknotesIcon },
      ].map((mode) => {
        const selected = productMode === mode.value;
        const ModeIcon = mode.icon;
        return (
          <button
            key={mode.value}
            type="button"
            aria-pressed={selected}
            aria-label={collapsed ? `${mode.label} mode` : undefined}
            title={collapsed ? `${mode.label} mode` : undefined}
            onClick={() => selectMode(mode.value)}
            className={`min-h-11 text-xs font-extrabold tracking-[0.04em] transition-[color,background-color,transform,box-shadow] duration-200 ${
              selected
                ? 'bg-surface-raised text-accent shadow-[0_8px_20px_-16px_rgba(20,20,18,0.45)]'
                : 'text-text-muted hover:bg-surface-raised/60 hover:text-text-primary'
            } ${collapsed ? 'aspect-square h-11 min-h-0 w-11 rounded-full p-0 text-[11px] active:scale-95' : 'rounded-xl px-3'}`}
          >
            {collapsed ? <ModeIcon className="mx-auto h-5 w-5" aria-hidden="true" /> : mode.label}
          </button>
        );
      })}
    </div>
  );
}
