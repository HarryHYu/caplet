import { useEffect, useState } from 'react';

/**
 * The one headline-accuracy figure the essay drills share.
 *
 * Speed runs and Exam runs both end on "how much of this did you get right",
 * so they say it the same way: an SVG ring that draws itself to the score on
 * mount, with the number sitting inside it. Tokens only — the track is
 * `--line-soft` and the arc is the semantic verdict ink, so it reads correctly
 * in every palette.
 *
 * `size` is the rendered box in px; `label` names what the ring is measuring
 * for assistive tech ("Accuracy 88 percent" by default).
 */
export default function AccuracyRing({ value, size = 64, label }) {
  const R = 26;
  const C = 2 * Math.PI * R;
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const safe = Math.min(100, Math.max(0, Number(value) || 0));
  const offset = C * (1 - (drawn ? safe : 0) / 100);

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className="shrink-0"
      role="img"
      aria-label={label || `Accuracy ${value} percent`}
    >
      <circle cx="32" cy="32" r={R} fill="none" strokeWidth="5" stroke="var(--line-soft)" />
      <circle
        cx="32" cy="32" r={R} fill="none" strokeWidth="5" strokeLinecap="round"
        stroke="var(--mark-green)"
        strokeDasharray={C}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.16, 1, 0.3, 1)' }}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--text-primary)">{value}%</text>
    </svg>
  );
}
