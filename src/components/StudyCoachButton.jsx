import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SparklesIcon } from '@heroicons/react/24/outline';

/**
 * Persistent floating launcher for the AI Study Coach.
 * Lives in AppShell so it appears on every page. Hidden for signed-out users
 * (the coach needs their progress) and on the coach page itself.
 *
 * Restyled to match the current design language — a soft accent pill with the
 * platform's rounded, lifted-shadow aesthetic — rather than the old flat look.
 */
export default function StudyCoachButton() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const hiddenOn = ['/study', '/login', '/register'];
  if (!isAuthenticated || hiddenOn.some((p) => pathname === p)) return null;

  return (
    <button
      type="button"
      onClick={() => navigate('/study')}
      aria-label="Open your AI Study Coach"
      className="group fixed bottom-6 right-6 z-[60] flex items-center gap-0 rounded-full bg-accent py-4 pl-4 pr-4 text-white shadow-[0_20px_44px_-18px_rgba(20,20,18,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:gap-2.5 hover:bg-accent-strong hover:shadow-[0_26px_54px_-16px_rgba(20,20,18,0.6)]"
    >
      <SparklesIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-extrabold tracking-wide transition-all duration-300 group-hover:max-w-[10rem]">
        Study Coach
      </span>
    </button>
  );
}
