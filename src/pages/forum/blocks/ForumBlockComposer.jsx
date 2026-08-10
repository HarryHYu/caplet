import {
  DocumentTextIcon, VariableIcon, CodeBracketIcon, PhotoIcon, ChartBarIcon,
  TableCellsIcon, PresentationChartLineIcon, CubeIcon, FilmIcon,
  ChevronUpIcon, ChevronDownIcon, TrashIcon,
} from '@heroicons/react/24/outline';
import {
  TextBlockEditor, MathBlockEditor, CodeBlockEditor, ImageBlockEditor, Model3DBlockEditor,
  ChartBlockEditor, TableBlockEditor, GraphBlockEditor, GeogebraBlockEditor, EmbedBlockEditor,
} from './ForumBlockEditors';

const BLOCK_DEFS = [
  { type: 'text', label: 'Text', icon: DocumentTextIcon, defaultData: { markdown: '' }, Editor: TextBlockEditor },
  { type: 'math', label: 'Math', icon: VariableIcon, defaultData: { latex: '' }, Editor: MathBlockEditor },
  { type: 'code', label: 'Code', icon: CodeBracketIcon, defaultData: { code: '', language: 'text' }, Editor: CodeBlockEditor },
  { type: 'image', label: 'Image', icon: PhotoIcon, defaultData: {}, Editor: ImageBlockEditor },
  { type: 'chart', label: 'Chart', icon: ChartBarIcon, defaultData: { chartType: 'line', series: [{ name: 'Series 1', data: [] }] }, Editor: ChartBlockEditor },
  { type: 'table', label: 'Table', icon: TableCellsIcon, defaultData: { columns: ['Column 1', 'Column 2'], rows: [] }, Editor: TableBlockEditor },
  { type: 'graph', label: 'Desmos graph', icon: PresentationChartLineIcon, defaultData: {}, Editor: GraphBlockEditor },
  { type: 'geogebra', label: 'GeoGebra', icon: PresentationChartLineIcon, defaultData: {}, Editor: GeogebraBlockEditor },
  { type: 'model3d', label: '3D model', icon: CubeIcon, defaultData: {}, Editor: Model3DBlockEditor },
  { type: 'embed', label: 'YouTube', icon: FilmIcon, defaultData: {}, Editor: EmbedBlockEditor },
];
const BLOCK_DEF_BY_TYPE = Object.fromEntries(BLOCK_DEFS.map((d) => [d.type, d]));

let idCounter = 0;
function newBlockId() {
  idCounter += 1;
  return `b${idCounter}-${Math.floor(Math.random() * 1e6)}`;
}

/**
 * Notion/Discourse-style block composer. `blocks` is the single source of
 * truth (controlled), shaped exactly like what the server accepts/returns:
 * an ordered array of { id, type, data }. Every block is edited by a typed,
 * trusted first-party editor component — there's no raw-HTML field anywhere
 * in this composer.
 */
export default function ForumBlockComposer({ blocks, onChange }) {
  const addBlock = (type) => {
    const def = BLOCK_DEF_BY_TYPE[type];
    onChange([...blocks, { id: newBlockId(), type, data: { ...def.defaultData } }]);
  };
  const updateBlock = (id, data) => onChange(blocks.map((b) => (b.id === id ? { ...b, data } : b)));
  const removeBlock = (id) => onChange(blocks.filter((b) => b.id !== id));
  const moveBlock = (id, dir) => {
    const idx = blocks.findIndex((b) => b.id === id);
    const swapWith = idx + dir;
    if (idx === -1 || swapWith < 0 || swapWith >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, i) => {
        const def = BLOCK_DEF_BY_TYPE[block.type];
        if (!def) return null;
        const Editor = def.Editor;
        const Icon = def.icon;
        return (
          <div key={block.id} className="rounded-2xl border border-line-soft p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="forum-meta flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {def.label}</span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={i === 0} onClick={() => moveBlock(block.id, -1)} className="rounded-full p-1 text-text-muted hover:bg-surface-soft disabled:opacity-30" aria-label="Move block up">
                  <ChevronUpIcon className="h-4 w-4" />
                </button>
                <button type="button" disabled={i === blocks.length - 1} onClick={() => moveBlock(block.id, 1)} className="rounded-full p-1 text-text-muted hover:bg-surface-soft disabled:opacity-30" aria-label="Move block down">
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => removeBlock(block.id)} className="rounded-full p-1 text-text-error hover:bg-surface-error" aria-label="Remove block">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <Editor data={block.data} onChange={(data) => updateBlock(block.id, data)} />
          </div>
        );
      })}

      <div className="flex flex-wrap gap-1.5">
        {BLOCK_DEFS.map((def) => {
          const Icon = def.icon;
          return (
            <button
              key={def.type}
              type="button"
              onClick={() => addBlock(def.type)}
              className="forum-pill text-text-muted transition-colors hover:bg-surface-soft hover:text-text-primary"
            >
              <Icon className="h-3.5 w-3.5" /> {def.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
