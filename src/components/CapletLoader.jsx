import { useEffect, useState } from 'react';

/**
 * Branded loading state: logo with a gentle 3D-style twist.
 * Use instead of raw border spinners (which can look like an empty square).
 *
 * Reduced motion: the global `prefers-reduced-motion` rule in index.css zeroes
 * every animation-duration and explicitly kills `.animate-pulse`, so the CSS
 * twist and the pulsing caption both disappear — which would leave this loader
 * as a completely static logo with no sign that anything is happening. So when
 * the user asks for reduced motion we drop the CSS animations entirely and
 * drive an opacity-only heartbeat from state instead (no transform, no travel,
 * nothing the reduced-motion rule is trying to suppress), and always surface a
 * literal "Loading…" line so the affordance survives even with JS timers
 * throttled in a background tab.
 */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  ));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event) => setReduced(event.matches);
    setReduced(query.matches);
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    }
    query.addListener(onChange);
    return () => query.removeListener(onChange);
  }, []);

  return reduced;
}

export default function CapletLoader({ message, className = '' }) {
  const reducedMotion = usePrefersReducedMotion();
  const [beat, setBeat] = useState(false);

  useEffect(() => {
    if (!reducedMotion) return undefined;
    const timer = window.setInterval(() => setBeat((current) => !current), 900);
    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message || 'Loading'}
      className={`flex flex-col items-center justify-center gap-5 ${className}`}
    >
      <div className="relative w-14 h-14 [perspective:480px]">
        <img
          src="/logo.png"
          alt=""
          width={56}
          height={56}
          className={`w-14 h-14 object-contain rounded-full shadow-sm ${reducedMotion ? '' : 'animate-caplet-logo-twist will-change-transform'}`}
          style={reducedMotion ? { opacity: beat ? 0.5 : 1 } : undefined}
          aria-hidden
        />
      </div>
      {message ? (
        <p className={`text-center text-base font-serif italic text-text-primary dark:text-text-muted max-w-xs ${reducedMotion ? '' : 'animate-pulse'}`}>
          {message}
        </p>
      ) : null}
      {reducedMotion ? (
        <p
          className="text-center text-xs font-bold uppercase tracking-[0.14em] text-text-dim"
          style={{ opacity: beat ? 0.55 : 1 }}
        >
          Loading…
        </p>
      ) : null}
    </div>
  );
}
