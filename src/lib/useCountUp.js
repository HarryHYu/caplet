import { useEffect, useRef, useState } from 'react';

/**
 * Animates a displayed number from its previous value to `value` whenever
 * `value` changes, easing out over `duration` ms. Used for the "points
 * ticking up" feel on live-quiz score reveals.
 */
export default function useCountUp(value, duration = 700) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  // Tracks the number currently on screen so an interrupted animation can
  // resume from where it visibly is, instead of snapping back to the value
  // the previous run started from.
  const displayRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    const to = typeof value === 'number' ? value : 0;
    if (from === to) return undefined;

    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3; // ease-out cubic
      const next = Math.round(from + (to - from) * eased);
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      // If the value changes mid-animation, the next run starts from the
      // currently displayed number rather than the stale starting point.
      fromRef.current = displayRef.current;
    };
  }, [value, duration]);

  return display;
}
