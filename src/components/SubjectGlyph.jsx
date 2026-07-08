/**
 * Glyph frame for HSC subject icons — thin marker-weight strokes to match the
 * hand-drawn system. Pass a subject's paths (from data/hscSubjects) as children.
 */
export default function Glyph({ children, className = 'h-6 w-6' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
