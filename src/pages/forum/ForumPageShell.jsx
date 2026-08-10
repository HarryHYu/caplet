/**
 * Reddit's 3-column layout: fixed-width left nav, fluid center feed,
 * fixed-width right context rail. Both rails collapse below `lg` so the
 * feed stays the only thing on mobile, matching Reddit's own responsive
 * behavior rather than squeezing three columns onto a phone.
 */
export default function ForumPageShell({ left, right, children }) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
      {left && <div className="hidden lg:block">{left}</div>}
      <div className="min-w-0">{children}</div>
      {right && <div className="hidden lg:block">{right}</div>}
    </div>
  );
}
