import { useEffect } from 'react';
import { motion as Motion } from 'framer-motion';
import { firePodiumBurst } from '../../lib/confetti';
import AnimatedLeaderboard from './AnimatedLeaderboard';

// Keyed by rank index (0 = 1st place), not visual left-to-right position.
const HEIGHTS = { 0: 'h-40', 1: 'h-28', 2: 'h-20' }; // 1st place gets the tallest bar
const MEDAL_COLORS = { 0: 'bg-amber-400 text-amber-950', 1: 'bg-slate-300 text-slate-900', 2: 'bg-orange-300 text-orange-950' };
const REVEAL_STEP = { 2: 0, 1: 1, 0: 2 }; // 3rd place revealed first, 1st place last — drum-roll toward the winner

/** Final-results screen: a confetti-popping top-3 podium plus the rest as an animated list. */
export default function Podium({ leaderboard, highlightId }) {
  const top3 = leaderboard.slice(0, 3);
  const order = [1, 0, 2].filter((i) => top3[i]); // silver, gold, bronze layout, left to right

  useEffect(() => {
    firePodiumBurst();
    const t = setTimeout(firePodiumBurst, 1100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div>
      <div className="flex items-end justify-center gap-4 mb-8">
        {order.map((i) => {
          const p = top3[i];
          const step = REVEAL_STEP[i];
          return (
            <div key={p.id} className="flex flex-col items-center gap-2 w-24">
              <Motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + step * 0.35 }}
                className="text-sm font-bold text-text-primary truncate max-w-full"
              >
                {p.nickname}
              </Motion.p>
              <Motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 + step * 0.35 }}
                className="text-xs text-text-dim"
              >
                {p.score.toLocaleString()} pts
              </Motion.p>
              <Motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: step * 0.35, type: 'spring', stiffness: 120, damping: 14 }}
                style={{ transformOrigin: 'bottom' }}
                className={`relative w-full rounded-t-xl flex items-center justify-center font-display font-extrabold text-lg ${HEIGHTS[i]} ${MEDAL_COLORS[i]} ${
                  i === 0 ? 'shadow-[0_0_30px_-5px_rgba(245,158,11,0.6)]' : ''
                }`}
              >
                {i === 0 && (
                  <Motion.span
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15 + step * 0.35 + 0.5 }}
                    className="absolute -top-9 text-2xl"
                  >
                    👑
                  </Motion.span>
                )}
                {i + 1}
              </Motion.div>
            </div>
          );
        })}
      </div>
      {leaderboard.length > 3 && (
        <div className="max-w-md mx-auto">
          <AnimatedLeaderboard entries={leaderboard.slice(3).map((p) => ({ ...p }))} highlightId={highlightId} limit={20} />
        </div>
      )}
    </div>
  );
}
