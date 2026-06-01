/**
 * Slide schema — canonical slide types, normalizer, and validator.
 *
 * Used by:
 *   - backend/routes/editor.js (validate teacher input before save)
 *   - future POST /api/ai/generate-lesson (validate AI output)
 *
 * Old type names (image, video, audio, question, flashcard, matching,
 * ordering, truefalse) are normalized to the canonical types below so
 * existing DB content keeps rendering.
 */

const CANONICAL_TYPES = [
  'text', 'media', 'choice', 'fillblank', 'cards', 'match', 'order', 'table', 'divider',
  'chart', 'diagram', 'embed', 'hotspot', 'timeline', 'desmos',
];

const MEDIA_SOURCES = ['image', 'video', 'audio', 'embed'];
const CHOICE_MODES = ['single', 'multiple', 'truefalse'];
const FILLBLANK_MODES = ['textbox', 'dropdown'];
const CARDS_MODES = ['carousel', 'grid', 'flip'];
const TABLE_HEADERS = ['none', 'row', 'column', 'both'];
const TEXT_LAYOUTS = ['default', 'hero', 'centered', 'callout'];
const TEXT_TONES = ['neutral', 'info', 'tip', 'warning', 'example', 'quote'];
const CHART_TYPES = ['bar', 'line', 'pie', 'area', 'scatter'];
const EMBED_ASPECTS = ['16:9', '4:3', '1:1', 'tall'];

const s = (v, d = '') => (v == null ? d : String(v));
const arr = (v) => (Array.isArray(v) ? v : []);
const bool = (v) => v === true || v === 'true';
const int = (v) => (Number.isInteger(v) ? v : null);

function normalizeSlide(slide) {
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

    // Legacy media aliases
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

    case 'chart':
      return {
        type: 'chart',
        chartType: CHART_TYPES.includes(slide.chartType) ? slide.chartType : 'bar',
        title: slide.title || undefined,
        data: arr(slide.data).map((d) => ({ ...d })),
        xLabel: slide.xLabel || undefined,
        yLabel: slide.yLabel || undefined,
        caption: slide.caption || undefined,
      };

    case 'diagram':
      return {
        type: 'diagram',
        code: s(slide.code),
        caption: slide.caption || undefined,
      };

    case 'embed':
      return {
        type: 'embed',
        url: s(slide.url),
        title: slide.title || undefined,
        aspect: EMBED_ASPECTS.includes(slide.aspect) ? slide.aspect : '16:9',
        caption: slide.caption || undefined,
      };

    case 'hotspot':
      return {
        type: 'hotspot',
        image: s(slide.image || slide.url),
        question: s(slide.question),
        regions: arr(slide.regions).map((r) => ({
          id: Number(r.id ?? 0),
          label: s(r.label),
          x: Number(r.x ?? 0),
          y: Number(r.y ?? 0),
          w: Number(r.w ?? 10),
          h: Number(r.h ?? 10),
          correct: bool(r.correct),
        })),
        explanation: slide.explanation || undefined,
        caption: slide.caption || undefined,
      };

    case 'timeline': {
      const events = arr(slide.events).map((e) => ({
        label: s(e?.label),
        // Strip any stray $ signs the AI may wrap around year values
        year: e?.year != null ? s(e.year).replace(/^\$+|\$+$/g, '').trim() || undefined : undefined,
      }));
      return {
        type: 'timeline',
        prompt: slide.prompt || undefined,
        events,
        caption: slide.caption || undefined,
        explanation: slide.explanation || undefined,
      };
    }

    case 'desmos':
      return {
        type: 'desmos',
        title: slide.title || undefined,
        expressions: arr(slide.expressions).map((e) => ({
          id: s(e?.id || 'expr'),
          latex: s(e?.latex),
          ...(e?.color ? { color: s(e.color) } : {}),
          ...(e?.hidden ? { hidden: true } : {}),
        })),
        bounds: slide.bounds
          ? {
              left: Number(slide.bounds.left ?? -10),
              right: Number(slide.bounds.right ?? 10),
              bottom: Number(slide.bounds.bottom ?? -10),
              top: Number(slide.bounds.top ?? 10),
            }
          : undefined,
        caption: slide.caption || undefined,
      };

    default:
      // Unknown — pass through; player will render an "unsupported" placeholder.
      return { ...slide };
  }
}

function validateSlide(slide, index) {
  const errors = [];
  if (!slide || typeof slide !== 'object') return [`slide ${index}: not an object`];
  const n = normalizeSlide(slide);
  if (!CANONICAL_TYPES.includes(n.type)) {
    errors.push(`slide ${index}: unsupported type "${n.type}"`);
    return errors;
  }
  switch (n.type) {
    case 'text':
      if (!n.content) errors.push(`slide ${index} (text): content is required`);
      break;
    case 'media':
      if (!n.url) errors.push(`slide ${index} (media): url is required`);
      break;
    case 'choice':
      if (!n.question) errors.push(`slide ${index} (choice): question is required`);
      if (n.options.length < 2) errors.push(`slide ${index} (choice): at least 2 options required`);
      if (n.correctIndices.length === 0) errors.push(`slide ${index} (choice): at least one correct answer required`);
      n.correctIndices.forEach((i) => {
        if (i < 0 || i >= n.options.length) errors.push(`slide ${index} (choice): correct index ${i} out of range`);
      });
      break;
    case 'fillblank':
      if (!n.template) errors.push(`slide ${index} (fillblank): template is required`);
      if (!n.blanks.length) errors.push(`slide ${index} (fillblank): at least one blank required`);
      n.blanks.forEach((b, i) => {
        if (!b.answers || !b.answers.length) errors.push(`slide ${index} (fillblank): blank ${i} has no answers`);
      });
      break;
    case 'cards':
      if (!n.cards.length) errors.push(`slide ${index} (cards): at least one card required`);
      n.cards.forEach((c, i) => {
        if (!c.front) errors.push(`slide ${index} (cards): card ${i} missing front`);
      });
      break;
    case 'match':
      if (n.pairs.length < 2) errors.push(`slide ${index} (match): at least 2 pairs required`);
      n.pairs.forEach((p, i) => {
        if (!p.left || !p.right) errors.push(`slide ${index} (match): pair ${i} missing left or right`);
      });
      break;
    case 'order':
      if (n.items.length < 2) errors.push(`slide ${index} (order): at least 2 items required`);
      break;
    case 'table':
      if (!n.rows.length) errors.push(`slide ${index} (table): at least one row required`);
      break;
    case 'divider':
      if (!n.title) errors.push(`slide ${index} (divider): title is required`);
      break;
    case 'chart':
      if (!n.data?.length) errors.push(`slide ${index} (chart): data array is required`);
      break;
    case 'diagram':
      if (!n.code?.trim()) errors.push(`slide ${index} (diagram): code is required`);
      break;
    case 'embed':
      if (!n.url?.trim()) errors.push(`slide ${index} (embed): url is required`);
      break;
    case 'hotspot':
      if (!n.image?.trim()) errors.push(`slide ${index} (hotspot): image is required`);
      if (!n.question?.trim()) errors.push(`slide ${index} (hotspot): question is required`);
      if (!n.regions?.length) errors.push(`slide ${index} (hotspot): at least one region required`);
      if (!n.regions?.some((r) => r.correct)) errors.push(`slide ${index} (hotspot): at least one correct region required`);
      break;
    case 'timeline':
      if (!n.events?.length || n.events.length < 2) errors.push(`slide ${index} (timeline): at least 2 events required`);
      break;
    case 'desmos':
      // expressions are optional — a blank canvas is valid
      break;
  }
  return errors;
}

function validateSlides(slides) {
  if (!Array.isArray(slides)) return { ok: false, errors: ['slides must be an array'] };
  const errors = [];
  const normalized = [];
  slides.forEach((slide, i) => {
    const e = validateSlide(slide, i);
    if (e.length) errors.push(...e);
    normalized.push(normalizeSlide(slide));
  });
  return errors.length ? { ok: false, errors } : { ok: true, slides: normalized };
}

module.exports = {
  CANONICAL_TYPES,
  normalizeSlide,
  validateSlide,
  validateSlides,
};
