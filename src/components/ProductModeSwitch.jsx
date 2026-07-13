import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLayout } from '../contexts/LayoutContext';

export default function ProductModeSwitch({ collapsed = false, className = '' }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
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
    navigate(mode === 'money' ? (lastMoneyRoute || '/money') : (studyDestination || studyFallback));
  };

  return (
    <div
      role="group"
      aria-label="Product mode"
      className={`${collapsed ? 'flex flex-col' : 'inline-flex'} rounded-2xl bg-surface-soft p-1 ${className}`}
    >
      {[
        { value: 'study', label: 'Study' },
        { value: 'money', label: 'Money' },
      ].map((mode) => {
        const selected = productMode === mode.value;
        return (
          <button
            key={mode.value}
            type="button"
            aria-pressed={selected}
            onClick={() => selectMode(mode.value)}
            className={`min-h-11 rounded-xl px-3 text-xs font-extrabold tracking-[0.04em] transition-colors ${
              selected
                ? 'bg-surface-raised text-accent shadow-[0_8px_20px_-16px_rgba(20,20,18,0.45)]'
                : 'text-text-muted hover:bg-surface-raised/60 hover:text-text-primary'
            } ${collapsed ? 'w-full px-1 text-[11px]' : ''}`}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
