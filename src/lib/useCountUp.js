import { useEffect, useRef, useState } from 'react';

/**
 * Animates a displayed number from its previous value to `value` whenever
 * `value` changes, easing out over `duration` ms. Used for the "points
 * ticking up" feel on live-quiz score reveals.
 */
export default function useCountUp(value, duration = 700) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    const to = typeof value === 'number' ? value : 0;
    if (from === to) return undefined;

    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3; // ease-out cubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return display;
}
