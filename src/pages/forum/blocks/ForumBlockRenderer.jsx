import ForumContent from '../ForumContent';
import ForumTableBlock from './ForumTableBlock';
import ForumEmbedIframe from './ForumEmbedIframe';
import { Forum3DModelBlockLazy, ForumChartBlockLazy } from './lazyBlocks';

/**
 * Renders one content block. Every branch is plain JSX (text nodes, mapped
 * data, typed attributes) — nothing here ever calls dangerouslySetInnerHTML
 * or interpolates a client string into an iframe `src` directly; embed URLs
 * were already fully reconstructed and allowlist-checked server-side.
 */
function Block({ block }) {
  switch (block.type) {
    case 'text':
      return <ForumContent>{block.data.markdown}</ForumContent>;
    case 'math':
      return <ForumContent className="text-center text-lg">{`$$${block.data.latex}$$`}</ForumContent>;
    case 'code':
      return (
        <div className="forum-card overflow-hidden p-0">
          {block.data.language && block.data.language !== 'text' && (
            <div className="forum-meta border-b border-line-soft px-3 py-1.5">{block.data.language}</div>
          )}
          <pre className="overflow-x-auto bg-surface-soft p-4 text-sm">
            <code className="font-mono text-text-primary">{block.data.code}</code>
          </pre>
        </div>
      );
    case 'image':
      return (
        <img
          src={block.data.url}
          alt={block.data.alt || ''}
          className="max-h-[480px] w-auto max-w-full rounded-2xl border border-line-soft"
        />
      );
    case 'chart':
      return <ForumChartBlockLazy data={block.data} />;
    case 'table':
      return <ForumTableBlock data={block.data} />;
    case 'graph':
      return <ForumEmbedIframe src={block.data.url} label="Desmos graph" aspect="4 / 3" />;
    case 'geogebra':
      return <ForumEmbedIframe src={block.data.url} label="GeoGebra" aspect="4 / 3" />;
    case 'embed':
      return <ForumEmbedIframe src={`https://www.youtube-nocookie.com/embed/${block.data.videoId}`} label="YouTube video" aspect="16 / 9" />;
    case 'model3d':
      return <Forum3DModelBlockLazy data={block.data} />;
    default:
      return null;
  }
}

/** Renders an ordered list of content blocks, falling back to a plain-text/markdown string for legacy content (no blocks). */
export default function ForumBlockRenderer({ blocks, fallbackText, className = '' }) {
  if (Array.isArray(blocks) && blocks.length > 0) {
    return (
      <div className={`flex flex-col gap-4 ${className}`}>
        {blocks.map((block) => <Block key={block.id} block={block} />)}
      </div>
    );
  }
  if (fallbackText) return <ForumContent className={className}>{fallbackText}</ForumContent>;
  return null;
}
