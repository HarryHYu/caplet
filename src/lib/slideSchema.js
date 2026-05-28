/**
 * Frontend mirror of backend/utils/slideSchema.js — normalize only.
 * Server is the source of truth for validation; the player just needs
 * to render whatever the API returns, normalizing legacy shapes inline.
 */

export const CANONICAL_TYPES = [
  'text', 'media', 'choice', 'fillblank', 'cards', 'match', 'order', 'table', 'divider',
];

const MEDIA_SOURCES = ['image', 'video', 'audio', 'embed'];
const CHOICE_MODES = ['single', 'multiple', 'truefalse'];
const FILLBLANK_MODES = ['textbox', 'dropdown'];
const CARDS_MODES = ['carousel', 'grid', 'flip'];
const TABLE_HEADERS = ['none', 'row', 'column', 'both'];
const TEXT_LAYOUTS = ['default', 'hero', 'centered', 'callout'];
const TEXT_TONES = ['neutral', 'info', 'tip', 'warning', 'example', 'quote'];

const s = (v, d = '') => (v == null ? d : String(v));
const arr = (v) => (Array.isArray(v) ? v : []);
const bool = (v) => v === true || v === 'true';
const int = (v) => (Number.isInteger(v) ? v : null);

export function normalizeSlide(slide) {
  if (!slide || typeof slide !== 'object') return null;
  const t = String(slide.type || '').toLowerCase();

  switch (t) {
    case 'text': {
      const layout = TEXT_LAYOUTS.includes(slide.layout) ? slide.layout : 'default';
      const tone = TEXT_TONES.includes(slide.tone) ? slide.tone : 'neutral';
      return { type: 'text', content: s(slide.content), caption: slide.caption || undefined, layout, tone };
    }

    case 'media':
      return {
        type: 'media',
        source: MEDIA_SOURCES.includes(slide.source) ? slide.source : 'image',
        url: s(slide.url || slide.content),
        caption: slide.caption || undefined,
        aspect: slide.aspect || 'auto',
      };

    case 'image':
      return { type: 'media', source: 'image', url: s(slide.content || slide.url), caption: slide.caption || undefined, aspect: slide.aspect || 'auto' };
    case 'video':
      return { type: 'media', source: 'video', url: s(slide.content || slide.url), caption: slide.caption || undefined, aspect: '16:9' };
    case 'audio':
      return { type: 'media', source: 'audio', url: s(slide.content || slide.url), caption: slide.caption || undefined };

    case 'question':
    case 'choice': {
      const options = arr(slide.options).map((o) => s(o));
      const correctIndices = Array.isArray(slide.correctIndices)
        ? slide.correctIndices.filter((n) => Number.isInteger(n))
        : Number.isInteger(slide.correctIndex)
          ? [slide.correctIndex]
          : [];
      const mode = CHOICE_MODES.includes(slide.mode)
        ? slide.mode
        : correctIndices.length > 1
          ? 'multiple'
          : 'single';
      return {
        type: 'choice',
        question: s(slide.question),
        options,
        correctIndices,
        mode,
        explanation: slide.explanation || undefined,
        optionFeedback: Array.isArray(slide.optionFeedback) ? slide.optionFeedback.map(s) : undefined,
      };
    }

    case 'truefalse':
      return {
        type: 'choice',
        question: s(slide.question || slide.statement),
        options: ['True', 'False'],
        correctIndices: [bool(slide.correct) ? 0 : 1],
        mode: 'truefalse',
        explanation: slide.explanation || undefined,
      };

    case 'fillblank': {
      const rawBlanks = arr(slide.blanks);
      const isLegacyStringBlanks = rawBlanks.length > 0 && typeof rawBlanks[0] === 'string';
      let blanks;
      if (isLegacyStringBlanks) {
        const alternatives = arr(slide.alternatives);
        blanks = rawBlanks.map((primary, i) => {
          const altsForBlank = arr(alternatives[i]).map(s);
          const answers = altsForBlank.length ? altsForBlank : [s(primary)];
          if (primary && !answers.includes(s(primary))) answers.unshift(s(primary));
          return { answers };
        });
      } else {
        blanks = rawBlanks.map((b) => {
          const options = arr(b?.options).map(s);
          return {
            answers: arr(b?.answers).map(s),
            ...(options.length ? { options } : {}),
            ...(bool(b?.caseSensitive) ? { caseSensitive: true } : {}),
          };
        });
      }
      const mode = FILLBLANK_MODES.includes(slide.mode)
        ? slide.mode
        : blanks.some((b) => b.options)
          ? 'dropdown'
          : 'textbox';
      return {
        type: 'fillblank',
        template: s(slide.template),
        blanks,
        mode,
        explanation: slide.explanation || undefined,
        caption: slide.caption || undefined,
      };
    }

    case 'flashcard':
    case 'cards': {
      const mode = CARDS_MODES.includes(slide.mode)
        ? slide.mode
        : t === 'flashcard'
          ? 'carousel'
          : 'grid';
      const columns = int(slide.columns);
      return {
        type: 'cards',
        mode,
        columns: columns && columns >= 1 && columns <= 4 ? columns : 2,
        cards: arr(slide.cards).map((c) => ({
          front: s(c?.front),
          ...(c?.back ? { back: s(c.back) } : {}),
          ...(c?.image ? { image: s(c.image) } : {}),
        })),
        caption: slide.caption || undefined,
      };
    }

    case 'matching':
    case 'match':
      return {
        type: 'match',
        pairs: arr(slide.pairs).map((p) => ({ left: s(p?.left), right: s(p?.right) })),
        caption: slide.caption || undefined,
        explanation: slide.explanation || undefined,
      };

    case 'ordering':
    case 'order': {
      const items = arr(slide.items).map(s);
      const correctOrder = Array.isArray(slide.correctOrder) && slide.correctOrder.length === items.length
        ? slide.correctOrder.filter((n) => Number.isInteger(n) && n >= 0 && n < items.length)
        : items.map((_, i) => i);
      return {
        type: 'order',
        prompt: s(slide.prompt),
        items,
        correctOrder,
        caption: slide.caption || undefined,
        explanation: slide.explanation || undefined,
      };
    }

    case 'table': {
      const rows = arr(slide.rows).map((r) => arr(r).map(s));
      return {
        type: 'table',
        rows,
        headers: TABLE_HEADERS.includes(slide.headers) ? slide.headers : 'none',
        caption: slide.caption || undefined,
        align: Array.isArray(slide.align) ? slide.align.map((a) => (['left', 'center', 'right'].includes(a) ? a : 'left')) : undefined,
      };
    }

    case 'divider':
      return {
        type: 'divider',
        title: s(slide.title || slide.content),
        subtitle: slide.subtitle || undefined,
      };

    default:
      return { ...slide };
  }
}

/**
 * Returns an array of human-readable problem strings for a single slide,
 * or an empty array if the slide looks valid enough to save.
 * This is intentionally lenient — it flags obvious empty fields but doesn't
 * block saving so teachers can keep incomplete drafts.
 */
export function warnSlide(slide) {
  const n = normalizeSlide(slide);
  if (!n) return ['Not a valid slide object'];
  const w = [];
  switch (n.type) {
    case 'text':
      if (!n.content?.trim()) w.push('Text slide has no content');
      break;
    case 'media':
      if (!n.url?.trim()) w.push(`${n.source || 'media'} slide has no URL`);
      break;
    case 'choice':
      if (!n.question?.trim()) w.push('Question is blank');
      if ((n.options || []).some((o) => !o?.trim())) w.push('One or more options are blank');
      if (!n.correctIndices?.length) w.push('No correct answer marked');
      break;
    case 'fillblank':
      if (!n.template?.trim()) w.push('Template is blank');
      if (!n.blanks?.length) w.push('No blanks defined (use {{0}} in the template)');
      n.blanks?.forEach((b, i) => {
        if (!b.answers?.some((a) => a?.trim())) w.push(`Blank ${i + 1} has no answer`);
      });
      break;
    case 'cards':
      if (!n.cards?.length) w.push('No cards added');
      n.cards?.forEach((c, i) => {
        if (!c.front?.trim()) w.push(`Card ${i + 1} has no front text`);
      });
      break;
    case 'match':
      if ((n.pairs || []).length < 2) w.push('Match needs at least 2 pairs');
      n.pairs?.forEach((p, i) => {
        if (!p.left?.trim() || !p.right?.trim()) w.push(`Pair ${i + 1} is incomplete`);
      });
      break;
    case 'order':
      if ((n.items || []).length < 2) w.push('Order needs at least 2 items');
      n.items?.forEach((it, i) => {
        if (!it?.trim()) w.push(`Item ${i + 1} is blank`);
      });
      break;
    case 'table':
      if (!(n.rows || []).length) w.push('Table has no rows');
      break;
    case 'divider':
      if (!n.title?.trim()) w.push('Divider has no title');
      break;
  }
  return w;
}

/**
 * Slide types that produce a quizScores entry on completion.
 * Used to decide whether the ticker should show right/wrong colors.
 */
export const INTERACTIVE_TYPES = new Set(['choice', 'fillblank', 'match', 'order']);

/**
 * Blank starter shape for each slide type, used by the editor palette
 * when a teacher adds a new slide of that type.
 */
export const SLIDE_DEFAULTS = {
  text: () => ({ type: 'text', content: '', layout: 'default', tone: 'neutral' }),
  media: () => ({ type: 'media', source: 'image', url: '', caption: '', aspect: 'auto' }),
  choice: () => ({
    type: 'choice',
    question: '',
    options: ['', ''],
    correctIndices: [],
    mode: 'single',
    explanation: '',
  }),
  fillblank: () => ({
    type: 'fillblank',
    template: 'Fill in the blank: the answer is {{0}}.',
    blanks: [{ answers: [''] }],
    mode: 'textbox',
    explanation: '',
  }),
  cards: () => ({
    type: 'cards',
    mode: 'carousel',
    columns: 2,
    cards: [{ front: '', back: '' }],
  }),
  match: () => ({
    type: 'match',
    pairs: [{ left: '', right: '' }, { left: '', right: '' }],
  }),
  order: () => ({ type: 'order', prompt: '', items: ['', '', ''] }),
  table: () => ({ type: 'table', headers: 'row', rows: [['', ''], ['', '']] }),
  divider: () => ({ type: 'divider', title: '', subtitle: '' }),
};

/**
 * Teacher-facing palette: ordered list of slide types with a label and
 * a one-line description. Used by the AddSlidePalette in the editor.
 */
export const SLIDE_PALETTE = [
  { type: 'text',      label: 'Text',         desc: 'Reading / explanation' },
  { type: 'media',     label: 'Image / Video', desc: 'Image, YouTube, audio or embed' },
  { type: 'choice',    label: 'Choice',       desc: 'Multiple choice / select all' },
  { type: 'choice-tf', label: 'True / False', desc: 'Two-option question' },
  { type: 'fillblank', label: 'Fill blank',   desc: 'Type the missing words' },
  { type: 'cards',     label: 'Flashcards',   desc: 'Front / back study cards' },
  { type: 'match',     label: 'Match',        desc: 'Pair terms to definitions' },
  { type: 'order',     label: 'Order',        desc: 'Put items in the right order' },
  { type: 'table',     label: 'Table',        desc: 'Reference grid' },
  { type: 'divider',   label: 'Divider',      desc: 'Section break / heading' },
];

/**
 * Friendly label shown under the slide kicker.
 */
export function slideKindLabel(slide) {
  if (!slide) return 'Slide';
  switch (slide.type) {
    case 'text': return 'Reading';
    case 'media':
      if (slide.source === 'video') return 'Watch';
      if (slide.source === 'audio') return 'Listen';
      return 'Visual';
    case 'choice':
      return slide.mode === 'truefalse' ? 'True or False' : slide.mode === 'multiple' ? 'Select all' : 'Quick check';
    case 'fillblank': return 'Fill the blanks';
    case 'cards': return slide.mode === 'carousel' ? 'Flashcards' : 'Cards';
    case 'match': return 'Match';
    case 'order': return 'Put in order';
    case 'table': return 'Reference';
    case 'divider': return 'Section';
    default: return 'Slide';
  }
}
