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
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let destroyed = false;

    loadDesmos()
      .then((Desmos) => {
        if (destroyed || !containerRef.current) return;

        // Destroy any previous instance (e.g. on mode switch).
        calcRef.current?.destroy();

        const defaultGraphing = {
          border: false,
          expressions: true,
          keypad: true,
          zoomButtons: true,
          settingsMenu: true,
        };

        const defaultScientific = {
          border: false,
          keypad: true,
        };

        let calc;
        if (mode === 'scientific') {
          try {
            calc = Desmos.ScientificCalculator(containerRef.current, {
              ...defaultScientific,
              ...options,
            });
          } catch {
            // Demo key may not have scientific enabled — fall back to graphing.
            calc = Desmos.GraphingCalculator(containerRef.current, {
              ...defaultGraphing,
              ...options,
            });
          }
        } else {
          calc = Desmos.GraphingCalculator(containerRef.current, {
            ...defaultGraphing,
            ...options,
          });

          // Load pre-defined expressions.
          if (expressions.length > 0) {
            calc.setExpressions(expressions);
          }

          // Set viewport bounds.
          if (bounds) {
            calc.setMathBounds(bounds);
          }
        }

        calcRef.current = calc;
        setLoading(false);
        onReady?.(calc);
      })
      .catch((err) => {
        if (!destroyed) setError(err.message);
      });

    return () => {
      destroyed = true;
      // Don't destroy on unmount if the parent is just hiding the panel —
      // destroy is called explicitly when mode switches above.
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
