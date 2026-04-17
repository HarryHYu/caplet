/**
 * Branded loading state: logo with a gentle 3D-style twist.
 * Use instead of raw border spinners (which can look like an empty square).
 */
export default function CapletLoader({ message, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-5 ${className}`}>
      <div className="relative w-14 h-14 [perspective:480px]">
        <img
          src="/logo.png"
          alt=""
          width={56}
          height={56}
          className="w-14 h-14 object-contain rounded-full shadow-sm animate-caplet-logo-twist will-change-transform"
          aria-hidden
        />
      </div>
      {message ? (
        <p className="text-center text-base font-serif italic text-caplet-ink dark:text-text-muted animate-pulse max-w-xs">
          {message}
        </p>
      ) : null}
    </div>
  );
}
