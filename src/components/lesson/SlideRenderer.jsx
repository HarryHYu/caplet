import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  AreaChart, BarChart, LineChart, ScatterChart, PieChart,
  Area, Bar, Line, Scatter, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../../services/api';
import { normalizeSlide } from '../../lib/slideSchema';
import MathText from '../MathText';
import DesmosCalculator from './DesmosCalculator';

/* ──────────────────────────────────────────────────────────────────────────
   Shared helpers
   ────────────────────────────────────────────────────────────────────────── */

function getYouTubeId(url) {
  if (!url) return '';
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
  return m ? m[1] : url;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function FeedbackBanner({ correct, explanation }) {
  return (
    <div
      className={`mt-5 p-4 rounded-xl border ${
        correct
          ? 'bg-emerald-500/[0.06] border-emerald-500/30'
          : 'bg-rose-500/[0.05] border-rose-400/30'
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-[0.2em] mb-1.5 ${
          correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
        }`}
      >
        {correct ? 'Correct' : 'Not quite'}
      </p>
      {explanation && (
        <p className="text-sm leading-relaxed text-text-primary"><MathText>{explanation}</MathText></p>
      )}
    </div>
  );
}

function Kicker({ children }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-[0.25em] mb-4">
      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Text
   ────────────────────────────────────────────────────────────────────────── */

const TEXT_TONE_STYLES = {
  neutral: '',
  info: 'border-l-4 border-l-accent/60 pl-5 md:pl-6',
  tip: 'border-l-4 border-l-emerald-400/70 pl-5 md:pl-6',
  warning: 'border-l-4 border-l-amber-500/70 pl-5 md:pl-6',
  example: 'border-l-4 border-l-violet-400/70 pl-5 md:pl-6',
  quote: 'border-l-4 border-l-line-soft pl-5 md:pl-6 italic font-serif',
};

function TextSlide({ slide }) {
  const layout = slide.layout || 'default';
  const tone = TEXT_TONE_STYLES[slide.tone] ?? '';
  const wrapper =
    layout === 'centered'
      ? 'max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center text-center'
      : layout === 'hero'
        ? 'max-w-3xl mx-auto w-full flex-1 flex flex-col justify-center'
        : 'max-w-3xl mx-auto w-full';
  const proseClass = layout === 'hero' ? 'prose-lesson prose-lesson-hero' : 'prose-lesson';
  return (
    <div className={wrapper}>
      <div className={`${proseClass} ${tone}`}>
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{slide.content || ''}</ReactMarkdown>
      </div>
      {slide.caption && (
        <p className="mt-10 pt-6 border-t border-line-soft text-sm text-text-muted italic font-serif">
          {slide.caption}
        </p>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Media (image / video / audio / embed)
   ────────────────────────────────────────────────────────────────────────── */

function MediaSlide({ slide }) {
  if (!slide.url) return null;

  const caption = slide.caption ? (
    <figcaption className="text-center text-sm font-serif italic text-text-muted">
      {slide.caption}
    </figcaption>
  ) : null;

  if (slide.source === 'video') {
    return (
      <figure className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center gap-6">
        <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-line-soft shadow-lg">
          <iframe
            src={`https://www.youtube.com/embed/${getYouTubeId(slide.url)}`}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={slide.caption || 'Video'}
          />
        </div>
        {caption}
      </figure>
    );
  }

  if (slide.source === 'audio') {
    return (
      <figure className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center gap-6">
        <div className="rounded-2xl bg-surface-soft border border-line-soft p-6">
          <audio controls src={slide.url} className="w-full" />
        </div>
        {caption}
      </figure>
    );
  }

  if (slide.source === 'embed') {
    return (
      <figure className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center gap-6">
        <div className="aspect-video bg-surface-soft rounded-2xl overflow-hidden border border-line-soft">
          <iframe src={slide.url} className="w-full h-full" title={slide.caption || 'Embed'} />
        </div>
        {caption}
      </figure>
    );
  }

  // image
  return (
    <figure className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center gap-6">
      <div className="rounded-2xl overflow-hidden bg-surface-soft border border-line-soft">
        <img src={api.getProxiedImageSrc(slide.url)} alt={slide.caption || ''} className="w-full h-auto" />
      </div>
      {caption}
    </figure>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Choice (single / multiple / true-false)
   ────────────────────────────────────────────────────────────────────────── */

function ChoiceSlide({ slide, alreadyAnswered, alreadyCorrect, onSubmit }) {
  const [selected, setSelected] = useState(() => new Set());
  const [submitted, setSubmitted] = useState(false);

  const correctSet = useMemo(() => new Set(slide.correctIndices || []), [slide.correctIndices]);
  const showFeedback = submitted || alreadyAnswered;
  const isCorrect = submitted ? setsEqual(selected, correctSet) : alreadyCorrect;
  const multi = slide.mode === 'multiple';

  const toggle = (i) => {
    if (showFeedback) return;
    setSelected((prev) => {
      const next = new Set(multi ? prev : []);
      if (multi && prev.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const submit = () => {
    const ok = setsEqual(selected, correctSet);
    setSubmitted(true);
    onSubmit(ok);
  };

  const canSubmit = selected.size > 0 && !showFeedback;

  return (
    <div className="max-w-2xl mx-auto w-full">
      <Kicker>
        {slide.mode === 'truefalse' ? 'True or False' : multi ? 'Select all that apply' : 'Quick check'}
      </Kicker>
      <h3 className="text-xl md:text-2xl font-display font-bold leading-snug text-text-primary mb-5">
        <MathText>{slide.question}</MathText>
      </h3>
      <div className="space-y-2">
        {(slide.options || []).map((option, optIdx) => {
          const chosen = selected.has(optIdx);
          const trulyCorrect = correctSet.has(optIdx);
          let classes = 'border-line-soft hover:border-accent/60 hover:bg-accent/5';
          if (showFeedback && trulyCorrect) {
            classes = 'border-emerald-500/60 bg-emerald-500/[0.07] text-text-primary';
          } else if (showFeedback && chosen && !trulyCorrect) {
            classes = 'border-rose-400/60 bg-rose-500/[0.06] text-text-primary';
          } else if (showFeedback) {
            classes = 'border-line-soft opacity-50';
          } else if (chosen) {
            classes = 'border-accent bg-accent/[0.06]';
          }
          const letter =
            slide.mode === 'truefalse'
              ? option.charAt(0).toUpperCase()
              : String.fromCharCode(65 + optIdx);
          return (
            <button
              key={optIdx}
              type="button"
              disabled={showFeedback}
              onClick={() => toggle(optIdx)}
              className={`group w-full text-left px-3.5 py-3 md:px-4 md:py-3.5 border rounded-xl transition-all duration-200 flex items-center gap-3 ${classes}`}
            >
              <span
                className={`w-8 h-8 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold tracking-wide ${
                  showFeedback && trulyCorrect
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                    : showFeedback && chosen && !trulyCorrect
                      ? 'border-rose-400 text-rose-500 bg-rose-500/10'
                      : chosen
                        ? 'border-accent text-accent bg-accent/10'
                        : 'border-line-soft text-text-dim group-hover:border-accent group-hover:text-accent'
                }`}
              >
                {letter}
              </span>
              <span className="text-[14px] md:text-[15px] flex-1 leading-snug"><MathText>{option}</MathText></span>
              {showFeedback && trulyCorrect && <CheckIcon />}
              {showFeedback && chosen && !trulyCorrect && <XIcon />}
            </button>
          );
        })}
      </div>

      {!showFeedback && canSubmit && (
        <button type="button" onClick={submit} className="btn-primary w-full mt-4 py-3">
          Submit Answer
        </button>
      )}

      {showFeedback && <FeedbackBanner correct={isCorrect} explanation={slide.explanation} />}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Fill in the blanks
   ────────────────────────────────────────────────────────────────────────── */

function parseFillBlankTemplate(template) {
  // Splits "There are {{0}} bones in {{1}}" into
  // [{text: "There are "}, {blank: 0}, {text: " bones in "}, {blank: 1}]
  const parts = [];
  const regex = /\{\{(\d+)\}\}/g;
  let last = 0;
  let m;
  while ((m = regex.exec(template)) !== null) {
    if (m.index > last) parts.push({ text: template.slice(last, m.index) });
    parts.push({ blank: Number(m[1]) });
    last = m.index + m[0].length;
  }
  if (last < template.length) parts.push({ text: template.slice(last) });
  return parts;
}

function FillBlankSlide({ slide, alreadyAnswered, alreadyCorrect, onSubmit }) {
  const [answers, setAnswers] = useState(() => new Array(slide.blanks.length).fill(''));
  const [submitted, setSubmitted] = useState(false);
  const showFeedback = submitted || alreadyAnswered;

  const parts = useMemo(() => parseFillBlankTemplate(slide.template || ''), [slide.template]);

  const isBlankCorrect = (i) => {
    const b = slide.blanks[i];
    if (!b) return false;
    const given = answers[i] || '';
    return b.answers.some((ans) => {
      if (b.caseSensitive) return ans.trim() === given.trim();
      return ans.trim().toLowerCase() === given.trim().toLowerCase();
    });
  };

  const allCorrect = slide.blanks.every((_, i) => isBlankCorrect(i));
  const isCorrect = submitted ? allCorrect : alreadyCorrect;

  const submit = () => {
    setSubmitted(true);
    onSubmit(allCorrect);
  };

  const canSubmit = answers.every((a) => a && a.trim()) && !showFeedback;

  return (
    <div className="max-w-2xl mx-auto w-full">
      <Kicker>Fill the blanks</Kicker>
      <div className="text-lg md:text-xl leading-loose text-text-primary font-serif mb-5">
        {parts.map((p, i) => {
          if (p.text) return <MathText key={i}>{p.text}</MathText>;
          const idx = p.blank;
          const blank = slide.blanks[idx];
          if (!blank) return null;
          const correct = isBlankCorrect(idx);
          const stateClasses = showFeedback
            ? correct
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
              : 'border-rose-400 text-rose-500 bg-rose-500/10'
            : 'border-accent/40 focus:border-accent focus:ring-2 focus:ring-accent/20';

          if (slide.mode === 'dropdown' && blank.options?.length) {
            return (
              <select
                key={i}
                value={answers[idx]}
                disabled={showFeedback}
                onChange={(e) =>
                  setAnswers((prev) => {
                    const n = [...prev];
                    n[idx] = e.target.value;
                    return n;
                  })
                }
                className={`mx-1 inline-block px-2 py-1 rounded-md border bg-surface-raised font-sans text-base outline-none transition-colors ${stateClasses}`}
              >
                <option value="">—</option>
                {blank.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            );
          }

          return (
            <input
              key={i}
              type="text"
              value={answers[idx]}
              disabled={showFeedback}
              onChange={(e) =>
                setAnswers((prev) => {
                  const n = [...prev];
                  n[idx] = e.target.value;
                  return n;
                })
              }
              className={`mx-1 inline-block px-2 py-1 rounded-md border bg-surface-raised font-sans text-base outline-none transition-colors w-32 ${stateClasses}`}
              aria-label={`Blank ${idx + 1}`}
            />
          );
        })}
      </div>

      {showFeedback && !allCorrect && (
        <div className="text-sm text-text-muted mb-4">
          <p className="font-bold uppercase tracking-[0.2em] text-[10px] mb-1.5 text-rose-500">Answers</p>
          <ul className="space-y-0.5">
            {slide.blanks.map((b, i) => (
              <li key={i}>
                <span className="font-mono text-text-dim mr-2">{i + 1}.</span>
                {b.answers.join(' / ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!showFeedback && canSubmit && (
        <button type="button" onClick={submit} className="btn-primary w-full mt-4 py-3">
          Check Answers
        </button>
      )}

      {showFeedback && <FeedbackBanner correct={isCorrect} explanation={slide.explanation} />}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Cards (carousel / grid / flip)
   ────────────────────────────────────────────────────────────────────────── */

function CardsSlide({ slide }) {
  const cards = slide.cards || [];
  if (slide.mode === 'carousel') return <CardsCarousel cards={cards} caption={slide.caption} />;
  return <CardsGrid cards={cards} columns={slide.columns} caption={slide.caption} flip={slide.mode === 'flip'} />;
}

function CardsCarousel({ cards, caption }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[i];
  if (!card) return null;
  const total = cards.length;
  const flippable = !!card.back;

  return (
    // flex-1 + min-h-0 keeps the whole component inside the slide boundary.
    // The card fills remaining vertical space rather than using a fixed aspect ratio.
    <div className="flex-1 min-h-0 flex flex-col gap-4 max-w-2xl mx-auto w-full">
      <Kicker>Flashcards · {i + 1} / {total}</Kicker>

      {/* Card fills all remaining space */}
      <button
        type="button"
        onClick={() => flippable && setFlipped((v) => !v)}
        className={`group relative flex-1 min-h-0 rounded-2xl border border-line-soft bg-surface-raised shadow-lg flex flex-col items-center justify-center px-8 py-8 text-center transition-all ${
          flippable ? 'cursor-pointer hover:border-accent/60' : ''
        }`}
      >
        {card.image && (
          <img
            src={api.getProxiedImageSrc(card.image)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-15 rounded-2xl"
          />
        )}
        <div className="relative max-w-lg">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-3">
            {flipped ? 'Back' : 'Front'}
          </p>
          <div className="text-xl md:text-2xl font-display leading-snug text-text-primary">
            <MathText>{flipped ? card.back : card.front}</MathText>
          </div>
          {flippable && (
            <p className="mt-6 text-[10px] uppercase tracking-[0.25em] text-text-dim">
              Click to flip
            </p>
          )}
        </div>
      </button>

      {/* Nav row — fixed height, never grows */}
      <div className="shrink-0 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => { setI(Math.max(0, i - 1)); setFlipped(false); }}
          disabled={i === 0}
          className="px-4 py-2 rounded-full border border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim disabled:opacity-30 text-[11px] font-bold uppercase tracking-[0.2em]"
        >
          ← Prev
        </button>
        <div className="flex items-center gap-1.5">
          {cards.map((_, k) => (
            <button
              key={k}
              type="button"
              onClick={() => { setI(k); setFlipped(false); }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${k === i ? 'bg-accent scale-125' : 'bg-line-soft hover:bg-text-dim'}`}
              aria-label={`Card ${k + 1}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => { setI(Math.min(total - 1, i + 1)); setFlipped(false); }}
          disabled={i === total - 1}
          className="px-4 py-2 rounded-full border border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim disabled:opacity-30 text-[11px] font-bold uppercase tracking-[0.2em]"
        >
          Next →
        </button>
      </div>
      {caption && (
        <p className="shrink-0 text-center text-sm font-serif italic text-text-muted">{caption}</p>
      )}
    </div>
  );
}

function FlipCard({ card }) {
  const [flipped, setFlipped] = useState(false);
  const flippable = !!card.back;
  return (
    <button
      type="button"
      onClick={() => flippable && setFlipped((v) => !v)}
      className={`group min-h-[180px] rounded-2xl border border-line-soft bg-surface-raised p-5 text-left flex flex-col transition-all ${
        flippable ? 'cursor-pointer hover:border-accent/60 hover:-translate-y-0.5' : ''
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-2">
        {flipped ? 'Back' : 'Front'}
      </p>
      <div className="flex-1 flex items-center text-base md:text-lg font-display text-text-primary">
        <MathText>{flipped ? card.back : card.front}</MathText>
      </div>
      {flippable && (
        <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-text-dim">Tap to flip</p>
      )}
    </button>
  );
}

function CardsGrid({ cards, columns, caption, flip }) {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  }[columns] || 'grid-cols-1 sm:grid-cols-2';

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
      <div className={`grid ${gridClass} gap-3 md:gap-4`}>
        {cards.map((c, i) =>
          flip ? (
            <FlipCard key={i} card={c} />
          ) : (
            <div
              key={i}
              className="rounded-2xl border border-line-soft bg-surface-raised p-5 flex flex-col gap-2"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
                {String(i + 1).padStart(2, '0')}
              </p>
              <p className="text-base md:text-lg font-display text-text-primary"><MathText>{c.front}</MathText></p>
              {c.back && <p className="text-sm text-text-muted leading-relaxed"><MathText>{c.back}</MathText></p>}
            </div>
          ),
        )}
      </div>
      {caption && (
        <p className="text-center text-sm font-serif italic text-text-muted">{caption}</p>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Match
   ────────────────────────────────────────────────────────────────────────── */

function MatchSlide({ slide, alreadyAnswered, alreadyCorrect, onSubmit }) {
  const pairs = slide.pairs || [];
  // rightCol[rowIdx] = which pair index's right text is currently in that row
  const [rightCol, setRightCol] = useState(() => {
    let s = shuffle(pairs.map((_, i) => i));
    let safety = 0;
    while (s.every((v, i) => v === i) && pairs.length > 1 && safety < 8) {
      s = shuffle(pairs.map((_, i) => i));
      safety++;
    }
    return s;
  });
  const [dragging, setDragging] = useState(null); // row index being dragged
  const [dragOver, setDragOver] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const showFeedback = submitted || alreadyAnswered;

  const allCorrect = rightCol.every((pairIdx, rowIdx) => pairIdx === rowIdx);
  const isCorrect = submitted ? allCorrect : alreadyCorrect;

  const onDragStart = (row) => setDragging(row);
  const onDragEnd = () => { setDragging(null); setDragOver(null); };
  const onDragOverRow = (e, row) => { e.preventDefault(); setDragOver(row); };
  const onDropRow = (toRow) => {
    if (dragging == null || dragging === toRow || showFeedback) return;
    setRightCol((prev) => {
      const next = [...prev];
      [next[dragging], next[toRow]] = [next[toRow], next[dragging]];
      return next;
    });
    setDragging(null);
    setDragOver(null);
  };

  const submit = () => { setSubmitted(true); onSubmit(allCorrect); };

  return (
    <div className="max-w-3xl mx-auto w-full">
      <Kicker>Match</Kicker>
      {!showFeedback && (
        <p className="text-sm text-text-muted mb-4">Drag the right column to align each item with its match.</p>
      )}

      <div className="space-y-2">
        {pairs.map((p, rowIdx) => {
          const rightPairIdx = rightCol[rowIdx];
          const correct = rightPairIdx === rowIdx;
          const isDraggingThisRow = dragging === rowIdx;
          const isOverThisRow = dragOver === rowIdx && dragging !== rowIdx;

          let leftCls = 'border-line-soft bg-surface-raised';
          let rightCls = 'border-line-soft bg-surface-raised';

          if (showFeedback && correct) {
            leftCls = 'border-emerald-500/60 bg-emerald-500/[0.07]';
            rightCls = 'border-emerald-500/60 bg-emerald-500/[0.07]';
          } else if (showFeedback && !correct) {
            leftCls = 'border-rose-400/60 bg-rose-500/[0.06]';
            rightCls = 'border-rose-400/60 bg-rose-500/[0.06]';
          } else if (isDraggingThisRow) {
            rightCls = 'border-accent/50 bg-accent/10 opacity-50';
          } else if (isOverThisRow) {
            rightCls = 'border-accent bg-accent/[0.06] scale-[1.01]';
          }

          return (
            <div key={rowIdx} className="flex items-stretch gap-2 md:gap-3">
              {/* Left — fixed */}
              <div className={`flex-1 flex items-center gap-2 px-4 py-3 border rounded-xl transition-all ${leftCls}`}>
                <span className="text-[10px] font-mono text-text-dim shrink-0">{String.fromCharCode(65 + rowIdx)}.</span>
                <span className="text-sm md:text-base"><MathText>{p.left}</MathText></span>
              </div>

              {/* Right — draggable */}
              <div
                draggable={!showFeedback}
                onDragStart={() => onDragStart(rowIdx)}
                onDragEnd={onDragEnd}
                onDragOver={(e) => onDragOverRow(e, rowIdx)}
                onDrop={() => onDropRow(rowIdx)}
                className={`flex-1 flex items-center gap-2 px-4 py-3 border rounded-xl transition-all select-none ${rightCls} ${
                  showFeedback ? '' : 'cursor-grab active:cursor-grabbing hover:border-accent/50'
                }`}
              >
                {!showFeedback && (
                  <span className="text-text-dim/40 shrink-0">⠿</span>
                )}
                <span className="flex-1 text-sm md:text-base"><MathText>{pairs[rightPairIdx].right}</MathText></span>
                {showFeedback && (correct ? <CheckIcon /> : <XIcon />)}
              </div>
            </div>
          );
        })}
      </div>

      {!showFeedback && (
        <button type="button" onClick={submit} className="btn-primary w-full mt-5 py-3">
          Check Matches
        </button>
      )}
      {showFeedback && <FeedbackBanner correct={isCorrect} explanation={slide.explanation} />}
      {slide.caption && <p className="mt-4 text-sm font-serif italic text-text-muted">{slide.caption}</p>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Order
   ────────────────────────────────────────────────────────────────────────── */

function OrderSlide({ slide, alreadyAnswered, alreadyCorrect, onSubmit }) {
  const items = slide.items || [];
  const correctOrder = slide.correctOrder || items.map((_, i) => i);
  const [order, setOrder] = useState(() => {
    let shuffled = shuffle(items.map((_, i) => i));
    let safety = 0;
    while (arraysEqual(shuffled, correctOrder) && items.length > 1 && safety < 8) {
      shuffled = shuffle(items.map((_, i) => i));
      safety++;
    }
    return shuffled;
  });
  const [dragging, setDragging] = useState(null); // position index being dragged
  const [dragOver, setDragOver] = useState(null); // position index being hovered over
  const [submitted, setSubmitted] = useState(false);
  const showFeedback = submitted || alreadyAnswered;

  const onDragStart = (pos) => setDragging(pos);
  const onDragEnd = () => { setDragging(null); setDragOver(null); };
  const onDragOverItem = (e, pos) => { e.preventDefault(); setDragOver(pos); };

  const onDropItem = (toPos) => {
    if (dragging == null || dragging === toPos || showFeedback) return;
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragging, 1);
      next.splice(toPos, 0, moved);
      return next;
    });
    setDragging(null);
    setDragOver(null);
  };

  const allCorrect = arraysEqual(order, correctOrder);
  const isCorrect = submitted ? allCorrect : alreadyCorrect;
  const submit = () => { setSubmitted(true); onSubmit(allCorrect); };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <Kicker>Put in order</Kicker>
      {slide.prompt && (
        <h3 className="text-lg md:text-xl font-display leading-snug text-text-primary mb-4">
          {slide.prompt}
        </h3>
      )}
      {!showFeedback && (
        <p className="text-sm text-text-muted mb-4">Drag the rows into the correct order.</p>
      )}
      <ul className="space-y-2">
        {order.map((itemIdx, pos) => {
          const inRightSpot = correctOrder[pos] === itemIdx;
          const isDragging = dragging === pos;
          const isOver = dragOver === pos && dragging !== pos;
          let cls = 'border-line-soft bg-surface-raised';
          if (showFeedback && inRightSpot) cls = 'border-emerald-500/60 bg-emerald-500/[0.07]';
          else if (showFeedback) cls = 'border-rose-400/60 bg-rose-500/[0.06]';
          else if (isDragging) cls = 'border-accent bg-accent/10 opacity-50';
          else if (isOver) cls = 'border-accent bg-accent/[0.04] scale-[1.01]';

          return (
            <li
              key={itemIdx}
              draggable={!showFeedback}
              onDragStart={() => onDragStart(pos)}
              onDragEnd={onDragEnd}
              onDragOver={(e) => onDragOverItem(e, pos)}
              onDrop={() => onDropItem(pos)}
              className={`flex items-center gap-3 px-4 py-3 border rounded-xl transition-all select-none ${cls} ${
                showFeedback ? '' : 'cursor-grab active:cursor-grabbing'
              }`}
            >
              {!showFeedback && (
                <span className="text-text-dim/50 shrink-0 text-base leading-none">⠿</span>
              )}
              <span className="text-[10px] font-mono text-text-dim w-5 shrink-0">{pos + 1}.</span>
              <span className="flex-1 text-sm md:text-base"><MathText>{items[itemIdx]}</MathText></span>
              {showFeedback && (
                inRightSpot ? <CheckIcon /> : <XIcon />
              )}
            </li>
          );
        })}
      </ul>

      {!showFeedback && (
        <button type="button" onClick={submit} className="btn-primary w-full mt-5 py-3">
          Check Order
        </button>
      )}
      {showFeedback && !allCorrect && (
        <div className="mt-4 text-sm text-text-muted">
          <p className="font-bold uppercase tracking-[0.2em] text-[10px] mb-1.5 text-rose-500">Correct order</p>
          <ol className="list-decimal list-inside space-y-0.5">
            {correctOrder.map((i) => <li key={i}>{items[i]}</li>)}
          </ol>
        </div>
      )}
      {showFeedback && <FeedbackBanner correct={isCorrect} explanation={slide.explanation} />}
      {slide.caption && <p className="mt-4 text-sm font-serif italic text-text-muted">{slide.caption}</p>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Table
   ────────────────────────────────────────────────────────────────────────── */

function TableSlide({ slide }) {
  const rows = slide.rows || [];
  const headerRow = slide.headers === 'row' || slide.headers === 'both';
  const headerCol = slide.headers === 'column' || slide.headers === 'both';
  const align = slide.align || [];

  return (
    <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col justify-center gap-6">
      <div className="overflow-x-auto rounded-2xl border border-line-soft">
        <table className="w-full text-sm md:text-base">
          <tbody>
            {rows.map((row, ri) => {
              const isHeaderRow = headerRow && ri === 0;
              return (
                <tr
                  key={ri}
                  className={`${isHeaderRow ? 'bg-surface-soft' : ri % 2 ? 'bg-surface-soft/40' : ''}`}
                >
                  {row.map((cell, ci) => {
                    const isHeader = isHeaderRow || (headerCol && ci === 0);
                    const a = align[ci] || 'left';
                    const Tag = isHeader ? 'th' : 'td';
                    return (
                      <Tag
                        key={ci}
                        className={`px-4 py-3 border-b border-line-soft last:border-b-0 align-top ${
                          isHeader ? 'font-bold uppercase tracking-[0.15em] text-[11px] text-text-dim' : ''
                        } text-${a}`}
                      >
                        <div className="prose-lesson prose-lesson-compact">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{cell}</ReactMarkdown>
                        </div>
                      </Tag>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {slide.caption && (
        <p className="text-center text-sm font-serif italic text-text-muted">{slide.caption}</p>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Divider
   ────────────────────────────────────────────────────────────────────────── */

function DividerSlide({ slide }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 max-w-2xl mx-auto w-full">
      <span className="w-16 h-px bg-accent" />
      <h2 className="text-3xl md:text-5xl font-display font-bold leading-tight text-text-primary">
        {slide.title}
      </h2>
      {slide.subtitle && (
        <p className="text-base md:text-lg font-serif italic text-text-muted max-w-xl">
          {slide.subtitle}
        </p>
      )}
      <span className="w-16 h-px bg-accent" />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Icons
   ────────────────────────────────────────────────────────────────────────── */

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Dispatcher
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Renders a single slide (any canonical or legacy type).
 *
 * Props:
 *   slide              - raw slide object from the lesson
 *   alreadyAnswered    - true if this slide already has a quizScores entry
 *   alreadyCorrect     - boolean value of the previously stored quizScore
 *   onSubmit(correct)  - called when an interactive slide is submitted
 *
 * The renderer is stateless from the parent's perspective; each interactive
 * sub-slide owns its own scratch state. Mount/unmount is driven by the parent
 * via a `key` on the wrapping element so navigating between slides resets state.
 */
export default function SlideRenderer({ slide, alreadyAnswered = false, alreadyCorrect = false, onSubmit }) {
  const normalized = useMemo(() => normalizeSlide(slide), [slide]);
  if (!normalized) return null;

  const noop = () => {};
  const handleSubmit = onSubmit || noop;

  switch (normalized.type) {
    case 'text':
      return <TextSlide slide={normalized} />;
    case 'media':
      return <MediaSlide slide={normalized} />;
    case 'choice':
      return (
        <ChoiceSlide
          slide={normalized}
          alreadyAnswered={alreadyAnswered}
          alreadyCorrect={alreadyCorrect}
          onSubmit={handleSubmit}
        />
      );
    case 'fillblank':
      return (
        <FillBlankSlide
          slide={normalized}
          alreadyAnswered={alreadyAnswered}
          alreadyCorrect={alreadyCorrect}
          onSubmit={handleSubmit}
        />
      );
    case 'cards':
      return <CardsSlide slide={normalized} />;
    case 'match':
      return (
        <MatchSlide
          slide={normalized}
          alreadyAnswered={alreadyAnswered}
          alreadyCorrect={alreadyCorrect}
          onSubmit={handleSubmit}
        />
      );
    case 'order':
      return (
        <OrderSlide
          slide={normalized}
          alreadyAnswered={alreadyAnswered}
          alreadyCorrect={alreadyCorrect}
          onSubmit={handleSubmit}
        />
      );
    case 'table':
      return <TableSlide slide={normalized} />;
    case 'divider':
      return <DividerSlide slide={normalized} />;
    case 'chart':
      return <ChartSlide slide={normalized} />;
    case 'diagram':
      return <DiagramSlide slide={normalized} />;
    case 'embed':
      return <EmbedSlide slide={normalized} />;
    case 'hotspot':
      return (
        <HotspotSlide
          slide={normalized}
          alreadyAnswered={alreadyAnswered}
          alreadyCorrect={alreadyCorrect}
          onSubmit={handleSubmit}
        />
      );
    case 'timeline':
      return (
        <TimelineSlide
          slide={normalized}
          alreadyAnswered={alreadyAnswered}
          alreadyCorrect={alreadyCorrect}
          onSubmit={handleSubmit}
        />
      );
    case 'desmos':
      return <DesmosSlide slide={normalized} />;
    default:
      return <UnsupportedSlide slide={normalized} />;
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   Chart
   ────────────────────────────────────────────────────────────────────────── */

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function ChartSlide({ slide }) {
  const { chartType, title, data, xLabel, yLabel, caption } = slide;

  const chartContent = () => {
    if (chartType === 'pie') {
      return (
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="75%" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      );
    }
    if (chartType === 'scatter') {
      return (
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line-soft)" />
          <XAxis dataKey="x" name={xLabel || 'X'} tick={{ fontSize: 12 }} label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5, fontSize: 12 } : undefined} />
          <YAxis dataKey="y" name={yLabel || 'Y'} tick={{ fontSize: 12 }} label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fontSize: 12 } : undefined} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} fill={CHART_COLORS[0]} />
        </ScatterChart>
      );
    }
    const ChartComp = chartType === 'line' ? LineChart : chartType === 'area' ? AreaChart : BarChart;
    const DataComp = chartType === 'line' ? Line : chartType === 'area' ? Area : Bar;
    const extraProps = chartType === 'area'
      ? { fill: CHART_COLORS[0], fillOpacity: 0.2, stroke: CHART_COLORS[0] }
      : chartType === 'line'
        ? { stroke: CHART_COLORS[0], strokeWidth: 2, dot: { r: 4 } }
        : { fill: CHART_COLORS[0], radius: [4, 4, 0, 0] };
    return (
      <ChartComp data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line-soft)" />
        <XAxis dataKey="x" tick={{ fontSize: 12 }} label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5, fontSize: 12 } : undefined} />
        <YAxis tick={{ fontSize: 12 }} label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fontSize: 12 } : undefined} />
        <Tooltip />
        <DataComp dataKey="y" {...extraProps} />
      </ChartComp>
    );
  };

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-4">
      {title && <h3 className="text-lg md:text-xl font-display font-semibold text-text-primary">{title}</h3>}
      <div className="rounded-2xl border border-line-soft bg-surface-raised p-4 md:p-6">
        <ResponsiveContainer width="100%" height={320}>
          {chartContent()}
        </ResponsiveContainer>
      </div>
      {caption && <p className="text-center text-sm font-serif italic text-text-muted">{caption}</p>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Diagram (Mermaid)
   ────────────────────────────────────────────────────────────────────────── */

// Module-level SVG cache so revisiting a diagram is instant (no re-render).
const diagramSvgCache = new Map();

function DiagramSlide({ slide }) {
  const ref = useRef(null);
  const [status, setStatus] = useState(() =>
    diagramSvgCache.has(slide.code) ? 'done' : 'loading',
  );
  const [error, setError] = useState(null);
  const id = useRef(`mmd-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    if (!slide.code?.trim()) return;

    // Already cached — inject immediately without re-running Mermaid.
    if (diagramSvgCache.has(slide.code)) {
      if (ref.current) ref.current.innerHTML = diagramSvgCache.get(slide.code);
      setStatus('done');
      return;
    }

    let mounted = true;
    setStatus('loading');
    setError(null);

    import('mermaid').then((m) => {
      const mermaid = m.default;
      mermaid.initialize({ startOnLoad: false, theme: 'neutral', fontFamily: 'inherit', fontSize: 15 });
      return mermaid.render(id, slide.code.trim());
    }).then(({ svg }) => {
      if (!mounted) return;
      diagramSvgCache.set(slide.code, svg);
      if (ref.current) ref.current.innerHTML = svg;
      setStatus('done');
    }).catch((err) => {
      if (mounted) { setError(err?.message || 'Diagram syntax error'); setStatus('error'); }
    });

    return () => { mounted = false; };
  }, [slide.code, id]);

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-4">
      <Kicker>Diagram</Kicker>
      <div className="rounded-2xl border border-line-soft bg-surface-raised p-4 md:p-8 overflow-x-auto min-h-[180px] flex items-center justify-center">
        {error ? (
          <p className="text-sm text-rose-500 font-mono">{error}</p>
        ) : status === 'loading' ? (
          <div className="flex flex-col items-center gap-3 text-text-dim">
            <span className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-[11px] uppercase tracking-[0.2em] font-bold">Rendering diagram…</span>
          </div>
        ) : (
          <div ref={ref} className="w-full flex justify-center [&_svg]:max-w-full" />
        )}
      </div>
      {slide.caption && <p className="text-center text-sm font-serif italic text-text-muted">{slide.caption}</p>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Embed (Desmos, PhET, GeoGebra, or any iframe-able URL)
   ────────────────────────────────────────────────────────────────────────── */

const ASPECT_CLASSES = {
  '16:9': 'aspect-video',
  '4:3':  'aspect-[4/3]',
  '1:1':  'aspect-square',
  'tall': 'aspect-[9/16] max-h-[80vh]',
};

function EmbedSlide({ slide }) {
  const aspectClass = ASPECT_CLASSES[slide.aspect] || 'aspect-video';
  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">
      {slide.title && <Kicker>{slide.title}</Kicker>}
      <div className={`w-full ${aspectClass} rounded-2xl overflow-hidden border border-line-soft shadow-sm`}>
        <iframe
          src={slide.url}
          title={slide.title || 'Interactive content'}
          className="w-full h-full"
          allow="fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
      {slide.caption && <p className="text-center text-sm font-serif italic text-text-muted">{slide.caption}</p>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Hotspot — click the correct region on an image
   ────────────────────────────────────────────────────────────────────────── */

function HotspotSlide({ slide, alreadyAnswered, alreadyCorrect, onSubmit }) {
  const [selected, setSelected] = useState(null); // region id
  const [submitted, setSubmitted] = useState(false);
  const showFeedback = submitted || alreadyAnswered;

  const handleClick = (region) => {
    if (showFeedback) return;
    setSelected(region.id);
  };

  const submit = () => {
    if (selected == null) return;
    const region = slide.regions.find((r) => r.id === selected);
    const correct = region?.correct === true;
    setSubmitted(true);
    onSubmit(correct);
  };

  const isCorrect = submitted
    ? slide.regions.find((r) => r.id === selected)?.correct === true
    : alreadyCorrect;

  return (
    <div className="max-w-3xl mx-auto w-full">
      <Kicker>Hotspot</Kicker>
      <h3 className="text-lg md:text-xl font-display leading-snug text-text-primary mb-4">
        {slide.question}
      </h3>

      <div className="relative w-full rounded-2xl overflow-hidden border border-line-soft select-none">
        <img
          src={api.getProxiedImageSrc(slide.image)}
          alt="Hotspot activity"
          className="w-full h-auto block"
          draggable={false}
        />
        {slide.regions.map((region) => {
          const isSelected = selected === region.id;
          const isThisCorrect = region.correct;
          let borderCls = 'border-white/50 hover:border-accent hover:bg-accent/10';
          if (showFeedback && isSelected && isThisCorrect) borderCls = 'border-emerald-400 bg-emerald-400/20';
          else if (showFeedback && isSelected && !isThisCorrect) borderCls = 'border-rose-400 bg-rose-400/20';
          else if (showFeedback && isThisCorrect) borderCls = 'border-emerald-400/70 bg-emerald-400/10';
          else if (isSelected) borderCls = 'border-accent bg-accent/10';

          return (
            <button
              key={region.id}
              type="button"
              onClick={() => handleClick(region)}
              style={{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.w}%`, height: `${region.h}%` }}
              className={`absolute border-2 rounded-lg transition-all cursor-pointer ${borderCls}`}
              title={showFeedback ? region.label : undefined}
            >
              {showFeedback && isThisCorrect && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">✓</span>
              )}
              {showFeedback && isSelected && !isThisCorrect && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">✗</span>
              )}
            </button>
          );
        })}
      </div>

      {!showFeedback && (
        <button
          type="button"
          onClick={submit}
          disabled={selected == null}
          className="btn-primary w-full mt-5 py-3 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {selected == null ? 'Click a region to select' : 'Submit Answer'}
        </button>
      )}
      {showFeedback && <FeedbackBanner correct={isCorrect} explanation={slide.explanation} />}
      {slide.caption && <p className="mt-4 text-sm font-serif italic text-text-muted">{slide.caption}</p>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Timeline — drag events into chronological order
   ────────────────────────────────────────────────────────────────────────── */

function TimelineSlide({ slide, alreadyAnswered, alreadyCorrect, onSubmit }) {
  const events = slide.events || [];
  const correctOrder = events.map((_, i) => i); // stored order IS correct order

  const [order, setOrder] = useState(() => {
    let s = shuffle(events.map((_, i) => i));
    let safety = 0;
    while (arraysEqual(s, correctOrder) && events.length > 1 && safety < 8) {
      s = shuffle(events.map((_, i) => i));
      safety++;
    }
    return s;
  });
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const showFeedback = submitted || alreadyAnswered;

  const onDragStart = (pos) => setDragging(pos);
  const onDragEnd = () => { setDragging(null); setDragOver(null); };
  const onDragOverItem = (e, pos) => { e.preventDefault(); setDragOver(pos); };
  const onDropItem = (toPos) => {
    if (dragging == null || dragging === toPos || showFeedback) return;
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragging, 1);
      next.splice(toPos, 0, moved);
      return next;
    });
    setDragging(null);
    setDragOver(null);
  };

  const allCorrect = arraysEqual(order, correctOrder);
  const isCorrect = submitted ? allCorrect : alreadyCorrect;
  const submit = () => { setSubmitted(true); onSubmit(allCorrect); };

  return (
    <div className="max-w-4xl mx-auto w-full">
      <Kicker>Timeline</Kicker>
      {slide.prompt && (
        <h3 className="text-lg md:text-xl font-display leading-snug text-text-primary mb-4">{slide.prompt}</h3>
      )}
      {!showFeedback && (
        <p className="text-sm text-text-muted mb-5">Drag the events into the correct chronological order.</p>
      )}

      {/* Horizontal scrollable timeline */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-start gap-0 min-w-max">
          {order.map((eventIdx, pos) => {
            const event = events[eventIdx];
            const inRightSpot = correctOrder[pos] === eventIdx;
            const isDraggingThis = dragging === pos;
            const isOver = dragOver === pos && dragging !== pos;

            let cardCls = 'border-line-soft bg-surface-raised';
            if (showFeedback && inRightSpot) cardCls = 'border-emerald-500/60 bg-emerald-500/[0.07]';
            else if (showFeedback) cardCls = 'border-rose-400/60 bg-rose-500/[0.06]';
            else if (isDraggingThis) cardCls = 'border-accent bg-accent/10 opacity-50';
            else if (isOver) cardCls = 'border-accent bg-accent/[0.05] scale-105';

            return (
              <div
                key={eventIdx}
                className="flex flex-col items-center"
                style={{ width: '160px' }}
              >
                {/* Card */}
                <div
                  draggable={!showFeedback}
                  onDragStart={() => onDragStart(pos)}
                  onDragEnd={onDragEnd}
                  onDragOver={(e) => onDragOverItem(e, pos)}
                  onDrop={() => onDropItem(pos)}
                  className={`w-36 min-h-[90px] rounded-xl border p-3 text-center transition-all select-none ${cardCls} ${showFeedback ? '' : 'cursor-grab active:cursor-grabbing hover:border-accent/50'}`}
                >
                  {!showFeedback && <span className="block text-text-dim/30 text-xs mb-1">⠿</span>}
                  <p className="text-sm font-medium text-text-primary leading-snug"><MathText>{event.label}</MathText></p>
                  {showFeedback && event.year && (
                    <p className={`mt-1.5 text-[11px] font-mono font-bold ${inRightSpot ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                      {event.year}
                    </p>
                  )}
                </div>

                {/* Connector line + position number */}
                <div className="flex items-center w-full mt-2">
                  <div className="flex-1 h-px bg-line-soft" />
                  <span className="w-6 h-6 rounded-full border border-line-soft bg-surface-raised text-[10px] font-mono text-text-dim flex items-center justify-center shrink-0">
                    {pos + 1}
                  </span>
                  <div className="flex-1 h-px bg-line-soft" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!showFeedback && (
        <button type="button" onClick={submit} className="btn-primary w-full mt-5 py-3">
          Check Order
        </button>
      )}
      {showFeedback && !allCorrect && (
        <div className="mt-4 text-sm text-text-muted">
          <p className="font-bold uppercase tracking-[0.2em] text-[10px] mb-2 text-rose-500">Correct order</p>
          <ol className="flex flex-wrap gap-2">
            {correctOrder.map((i) => (
              <li key={i} className="px-2 py-1 rounded-lg bg-surface-raised border border-line-soft text-xs">
                {i + 1}. {events[i].label}{events[i].year ? ` (${events[i].year})` : ''}
              </li>
            ))}
          </ol>
        </div>
      )}
      {showFeedback && <FeedbackBanner correct={isCorrect} explanation={slide.explanation} />}
      {slide.caption && <p className="mt-4 text-sm font-serif italic text-text-muted">{slide.caption}</p>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Desmos
   ────────────────────────────────────────────────────────────────────────── */

function DesmosSlide({ slide }) {
  return (
    <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col gap-4">
      {slide.title && (
        <h3 className="text-lg md:text-xl font-display font-semibold text-text-primary">{slide.title}</h3>
      )}
      <div className="flex-1 min-h-0 rounded-2xl border border-line-soft overflow-hidden" style={{ minHeight: '420px' }}>
        <DesmosCalculator
          mode="graphing"
          expressions={slide.expressions || []}
          bounds={slide.bounds || undefined}
          className="h-full"
        />
      </div>
      {slide.caption && (
        <p className="text-center text-sm font-serif italic text-text-muted">{slide.caption}</p>
      )}
    </div>
  );
}

function UnsupportedSlide({ slide }) {
  return (
    <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col items-center justify-center text-center gap-6">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-[0.25em]">
        {slide.type || 'slide'}
      </div>
      {slide.content ? (
        <div className="prose-lesson text-left w-full">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{String(slide.content)}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-text-muted font-serif italic text-lg">
          This slide type isn't available in the player yet.
        </p>
      )}
    </div>
  );
}
