/**
 * Shared sandboxed-iframe shell for every third-party embed (Desmos,
 * GeoGebra, YouTube). `src` must already be a fully-validated, allowlisted
 * embed URL reconstructed by the backend (see services/forumBlocks.js) —
 * this component never receives or trusts a raw client-supplied URL.
 *
 * sandbox intentionally omits `allow-same-origin`: the framed page runs in
 * an opaque, unique origin, so it can't read/write cookies or storage tied
 * to its real origin, can't reach our page, and can't do top-level nav.
 */
export default function ForumEmbedIframe({ src, label, aspect = '4 / 3' }) {
  if (!src) return null;
  return (
    <div className="forum-card overflow-hidden p-0">
      <div className="forum-meta border-b border-line-soft px-3 py-2">{label}</div>
      <div style={{ aspectRatio: aspect }}>
        <iframe
          src={src}
          title={label}
          loading="lazy"
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}
