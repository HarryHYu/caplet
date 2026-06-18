import { buildAvatarUrl } from '../lib/avatar';

/**
 * Renders a user's avatar from their config, with an optional level badge.
 *
 * Props:
 * - config: avatar config object (falls back to default)
 * - size: pixel size (default 80)
 * - level: number; shown as a badge when showLevel is true
 * - showLevel: boolean
 */
export default function Avatar({ config, size = 80, level, showLevel = false, className = '' }) {
  const url = buildAvatarUrl(config, { size: size * 2 });
  return (
    <div className={`relative inline-block shrink-0 ${className}`} style={{ width: size, height: size }}>
      <img
        src={url}
        alt="Avatar"
        width={size}
        height={size}
        loading="lazy"
        className="rounded-full bg-surface-raised border border-line-soft object-cover"
        style={{ width: size, height: size }}
      />
      {showLevel && level != null && (
        <span
          className="absolute -bottom-1 -right-1 rounded-full bg-accent text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border-2 border-surface-body leading-none"
          aria-label={`Level ${level}`}
        >
          Lv {level}
        </span>
      )}
    </div>
  );
}
