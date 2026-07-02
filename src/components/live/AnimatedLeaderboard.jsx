import { useEffect, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import useCountUp from '../../lib/useCountUp';

function RankDelta({ delta }) {
  if (!delta) return <span className="w-8 shrink-0" />;
  const up = delta > 0;
  return (
    <span className={`w-8 shrink-0 text-[11px] font-bold flex items-center gap-0.5 ${up ? 'text-emerald-500' : 'text-rose-500'}`}>
      {up ? '▲' : '▼'}{Math.abs(delta)}
    </span>
  );
}

function StreakFlame({ streak }) {
  if (!streak || streak < 2) return null;
  return (
    <Motion.span
      key={streak}
      initial={{ scale: 0.3, opacity: 0, rotate: -15 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      className="inline-flex items-center gap-0.5 text-xs font-bold text-orange-500 shrink-0"
      title={`${streak} correct in a row`}
    >
      🔥{streak}
    </Motion.span>
  );
}

function Row({ entry, prevRank, isMe }) {
  const delta = prevRank != null ? prevRank - entry.rank : 0;
  const score = useCountUp(entry.score, 700);
  return (
    <Motion.li
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 38 }}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm ${
        isMe ? 'border-accent bg-accent/10' : 'border-line-soft bg-surface-raised'
      }`}
    >
      <span className="text-text-dim font-mono w-5 shrink-0">{entry.rank}.</span>
      <RankDelta delta={delta} />
      <span className="text-text-primary font-medium truncate flex-1">{entry.nickname}</span>
      <StreakFlame streak={entry.streak} />
      <span className="text-text-dim font-mono tabular-nums shrink-0">{score.toLocaleString()} pts</span>
    </Motion.li>
  );
}

/**
 * A ranked list that smoothly reorders itself (via framer-motion layout
 * animations) whenever `entries` changes rank order between rounds, plus
 * per-row rank-change arrows, a live streak flame, and an animated
 * count-up on each score. `entries` must already be sorted/ranked
 * (id, nickname, score, rank, streak?) — see currentLeaderboard() server-side.
 */
export default function AnimatedLeaderboard({ entries, highlightId, limit = 10 }) {
  const prevRanksRef = useRef(new Map());
  const list = (entries || []).slice(0, limit);

  useEffect(() => {
    prevRanksRef.current = new Map((entries || []).map((e) => [e.id, e.rank]));
  }, [entries]);

  return (
    <Motion.ol layout className="space-y-1.5">
      <AnimatePresence initial={false}>
        {list.map((entry) => (
          <Row key={entry.id} entry={entry} prevRank={prevRanksRef.current.get(entry.id)} isMe={entry.id === highlightId} />
        ))}
      </AnimatePresence>
    </Motion.ol>
  );
}
