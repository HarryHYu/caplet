import { lazy, Suspense } from 'react';

/**
 * Two forum block types carry the heaviest third-party payloads in the app:
 * the 3D viewer pulls `@google/model-viewer` (~1 MB) and the chart block
 * pulls Recharts (~700 kB). Both are rare block types, but a static import
 * meant EVERY forum page (thread, new-thread, mod queue) downloaded them up
 * front. Loading them on demand keeps that cost on the posts that use them.
 *
 * Each wrapper owns a local <Suspense> so a pending chunk never bubbles up to
 * the route-level boundary and blanks the page — it renders a same-size
 * placeholder instead, so nothing below shifts while the chunk arrives.
 */

const Model3DBlock = lazy(() => import('./Forum3DModelBlock'));
const ChartBlock = lazy(() => import('./ForumChartBlock'));

function BlockPlaceholder({ height, padded = false }) {
  return (
    <div className={`forum-card overflow-hidden ${padded ? 'p-4' : 'p-0'}`}>
      <div
        className="w-full rounded-xl bg-surface-soft"
        style={{ height }}
        role="status"
        aria-label="Loading block"
      />
    </div>
  );
}

export function Forum3DModelBlockLazy({ data }) {
  if (!data?.url) return null;
  return (
    <Suspense fallback={<BlockPlaceholder height={360} />}>
      <Model3DBlock data={data} />
    </Suspense>
  );
}

export function ForumChartBlockLazy({ data }) {
  if (!data?.series?.length) return null;
  return (
    <Suspense fallback={<BlockPlaceholder height={280} padded />}>
      <ChartBlock data={data} />
    </Suspense>
  );
}
