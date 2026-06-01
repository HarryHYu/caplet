/**
 * DesmosCalculator
 *
 * Renders either a GraphingCalculator or ScientificCalculator using the
 * Desmos JS API. The `mode` prop controls which one is active.
 *
 * Props:
 *   mode          'graphing' | 'scientific'   (default 'graphing')
 *   expressions   Array of { id, latex, color?, hidden? } to pre-load (graphing only)
 *   bounds        { left, right, top, bottom } viewport (graphing only)
 *   options       Extra Desmos constructor options
 *   className     CSS class on the outer wrapper
 *   onReady       Called with the calculator instance once it's initialised
 */
import { useEffect, useRef, useState } from 'react';
import { loadDesmos } from '../../lib/desmos';

export default function DesmosCalculator({
  mode = 'graphing',
  expressions = [],
  bounds = null,
  options = {},
  className = '',
  onReady = null,
}) {
  const containerRef = useRef(null);
  const calcRef = useRef(null);
  // Persist state per mode so switching back restores work in progress.
  const savedStates = useRef({ graphing: null, scientific: null });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    loadDesmos()
      .then((Desmos) => {
        if (cancelled || !containerRef.current) return;

        // Clear any stale DOM from a previous instance before mounting a new one.
        containerRef.current.innerHTML = '';

        let calc;
        if (mode === 'scientific') {
          try {
            calc = Desmos.ScientificCalculator(containerRef.current, {
              border: false,
              keypad: true,
              ...options,
            });
          } catch {
            // Demo key may not have scientific enabled — fall back gracefully.
            calc = Desmos.GraphingCalculator(containerRef.current, {
              border: false, expressions: true, keypad: true,
              zoomButtons: true, settingsMenu: true, ...options,
            });
          }
        } else {
          calc = Desmos.GraphingCalculator(containerRef.current, {
            border: false, expressions: true, keypad: true,
            zoomButtons: true, settingsMenu: true, ...options,
          });
          // Restore previous session if the user has been here before,
          // otherwise load the teacher-defined expressions.
          if (savedStates.current.graphing) {
            calc.setState(savedStates.current.graphing);
          } else {
            if (expressions.length > 0) calc.setExpressions(expressions);
            if (bounds) calc.setMathBounds(bounds);
          }
        }

        // Restore scientific session if available.
        if (mode === 'scientific' && savedStates.current.scientific) {
          try { calc.setState(savedStates.current.scientific); } catch { /* incompatible state, ignore */ }
        }

        calcRef.current = calc;
        setLoading(false);
        onReady?.(calc);
      })
      .catch((err) => {
        if (!cancelled) { setError(err.message); setLoading(false); }
      });

    return () => {
      cancelled = true;
      // Snapshot state before destroying so we can restore it on next visit.
      if (calcRef.current) {
        try {
          savedStates.current[mode] = calcRef.current.getState();
        } catch { /* ignore if getState fails */ }
        calcRef.current.destroy();
        calcRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Update expressions reactively without full re-init.
  useEffect(() => {
    const calc = calcRef.current;
    if (!calc || mode !== 'graphing') return;
    calc.setExpressions(expressions);
    if (bounds) calc.setMathBounds(bounds);
  }, [expressions, bounds, mode]);

  return (
    <div className={`relative flex flex-col ${className}`}>
      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-raised z-10">
          <span className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-text-dim">
            Loading calculator…
          </span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-raised z-10">
          <p className="text-sm text-rose-500 text-center px-4">{error}</p>
        </div>
      )}
      <div ref={containerRef} className="flex-1 w-full" />
    </div>
  );
}
