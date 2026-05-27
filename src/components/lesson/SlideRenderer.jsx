import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../../services/api';
import { normalizeSlide } from '../../lib/slideSchema';

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
        <p className="text-sm leading-relaxed text-text-primary">{explanation}</p>
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
        <ReactMarkdown>{slide.content || ''}</ReactMarkdown>
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
        {slide.question}
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
              <span className="text-[14px] md:text-[15px] flex-1 leading-snug">{option}</span>
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
          if (p.text) return <span key={i}>{p.text}</span>;
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
    <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center gap-6">
      <Kicker>Flashcards · {i + 1} / {total}</Kicker>
      <button
        type="button"
        onClick={() => flippable && setFlipped((v) => !v)}
        className={`group relative w-full aspect-[16/10] rounded-2xl border border-line-soft bg-surface-raised shadow-lg flex items-center justify-center px-8 py-10 text-center transition-all ${
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
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-3">
            {flipped ? 'Back' : 'Front'}
          </p>
          <div className="text-xl md:text-2xl font-display leading-snug text-text-primary">
            {flipped ? card.back : card.front}
          </div>
          {flippable && (
            <p className="mt-6 text-[10px] uppercase tracking-[0.25em] text-text-dim">
              Click to flip
            </p>
          )}
        </div>
      </button>
      <div className="flex items-center justify-between gap-3">
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
            <span
              key={k}
              className={`w-1.5 h-1.5 rounded-full ${k === i ? 'bg-accent' : 'bg-line-soft'}`}
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
        <p className="text-center text-sm font-serif italic text-text-muted">{caption}</p>
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
        {flipped ? card.back : card.front}
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
              <p className="text-base md:text-lg font-display text-text-primary">{c.front}</p>
              {c.back && <p className="text-sm text-text-muted leading-relaxed">{c.back}</p>}
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rightOrder = useMemo(() => shuffle(pairs.map((_, i) => i)), [pairs.length]);
  const [pairings, setPairings] = useState({}); // { [leftIdx]: rightIdx }
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const showFeedback = submitted || alreadyAnswered;

  const handleLeft = (i) => {
    if (showFeedback) return;
    setSelectedLeft((prev) => (prev === i ? null : i));
  };

  const handleRight = (rightIdx) => {
    if (showFeedback) return;
    if (selectedLeft == null) return;
    setPairings((prev) => {
      const next = { ...prev };
      // Remove any existing assignment of this rightIdx
      Object.keys(next).forEach((k) => { if (next[k] === rightIdx) delete next[k]; });
      next[selectedLeft] = rightIdx;
      return next;
    });
    setSelectedLeft(null);
  };

  const allPaired = pairs.every((_, i) => pairings[i] != null);
  const allCorrect = pairs.every((_, i) => pairings[i] === i);
  const isCorrect = submitted ? allCorrect : alreadyCorrect;

  const submit = () => {
    setSubmitted(true);
    onSubmit(allCorrect);
  };

  return (
    <div className="max-w-3xl mx-auto w-full">
      <Kicker>Match</Kicker>
      <p className="text-sm text-text-muted mb-5">
        Click a term on the left, then click its match on the right.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
        <div className="space-y-2">
          {pairs.map((p, i) => {
            const paired = pairings[i] != null;
            const correctMatch = pairings[i] === i;
            let cls = 'border-line-soft hover:border-accent/60';
            if (selectedLeft === i) cls = 'border-accent bg-accent/[0.06]';
            else if (showFeedback && correctMatch) cls = 'border-emerald-500/60 bg-emerald-500/[0.07]';
            else if (showFeedback && paired) cls = 'border-rose-400/60 bg-rose-500/[0.06]';
            else if (paired) cls = 'border-accent/40 bg-accent/[0.03]';
            return (
              <button
                key={i}
                type="button"
                disabled={showFeedback}
                onClick={() => handleLeft(i)}
                className={`w-full text-left px-4 py-3 border rounded-xl transition-all ${cls}`}
              >
                <span className="text-[10px] font-mono text-text-dim mr-2">{String.fromCharCode(65 + i)}.</span>
                <span className="text-sm md:text-base">{p.left}</span>
                {paired && (
                  <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-accent">
                    → {pairings[i] + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {rightOrder.map((rightIdx, displayPos) => {
            const usedByLeft = Object.keys(pairings).find((k) => pairings[k] === rightIdx);
            const used = usedByLeft != null;
            const correctMatch = used && Number(usedByLeft) === rightIdx;
            let cls = 'border-line-soft hover:border-accent/60';
            if (showFeedback && used && correctMatch) cls = 'border-emerald-500/60 bg-emerald-500/[0.07]';
            else if (showFeedback && used) cls = 'border-rose-400/60 bg-rose-500/[0.06]';
            else if (used) cls = 'border-accent/40 bg-accent/[0.03]';
            else if (selectedLeft != null) cls = 'border-accent/40 hover:border-accent';
            return (
              <button
                key={rightIdx}
                type="button"
                disabled={showFeedback}
                onClick={() => handleRight(rightIdx)}
                className={`w-full text-left px-4 py-3 border rounded-xl transition-all ${cls}`}
              >
                <span className="text-[10px] font-mono text-text-dim mr-2">{displayPos + 1}.</span>
                <span className="text-sm md:text-base">{pairs[rightIdx].right}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!showFeedback && (
        <button
          type="button"
          onClick={submit}
          disabled={!allPaired}
          className="btn-primary w-full mt-5 py-3 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {allPaired ? 'Check Matches' : `Pair all ${pairs.length} items`}
        </button>
      )}

      {showFeedback && <FeedbackBanner correct={isCorrect} explanation={slide.explanation} />}
      {slide.caption && (
        <p className="mt-4 text-sm font-serif italic text-text-muted">{slide.caption}</p>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Order
   ────────────────────────────────────────────────────────────────────────── */

function OrderSlide({ slide, alreadyAnswered, alreadyCorrect, onSubmit }) {
  const items = slide.items || [];
  const correctOrder = slide.correctOrder || items.map((_, i) => i);
  // Build a shuffled starting arrangement that is guaranteed to differ from the
  // correct sequence (so the activity isn't pre-solved).
  const [order, setOrder] = useState(() => {
    let shuffled = shuffle(items.map((_, i) => i));
    let safety = 0;
    while (arraysEqual(shuffled, correctOrder) && items.length > 1 && safety < 8) {
      shuffled = shuffle(items.map((_, i) => i));
      safety++;
    }
    return shuffled;
  });
  const [submitted, setSubmitted] = useState(false);
  const showFeedback = submitted || alreadyAnswered;

  const move = (idx, dir) => {
    if (showFeedback) return;
    const j = idx + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[idx], next[j]] = [next[j], next[idx]];
    setOrder(next);
  };

  const allCorrect = arraysEqual(order, correctOrder);
  const isCorrect = submitted ? allCorrect : alreadyCorrect;

  const submit = () => {
    setSubmitted(true);
    onSubmit(allCorrect);
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <Kicker>Put in order</Kicker>
      {slide.prompt && (
        <h3 className="text-lg md:text-xl font-display leading-snug text-text-primary mb-5">
          {slide.prompt}
        </h3>
      )}
      <ul className="space-y-2">
        {order.map((itemIdx, pos) => {
          const inRightSpot = correctOrder[pos] === itemIdx;
          let cls = 'border-line-soft';
          if (showFeedback && inRightSpot) cls = 'border-emerald-500/60 bg-emerald-500/[0.07]';
          else if (showFeedback) cls = 'border-rose-400/60 bg-rose-500/[0.06]';
          return (
            <li
              key={itemIdx}
              className={`flex items-center gap-3 px-4 py-3 border rounded-xl bg-surface-raised ${cls}`}
            >
              <span className="text-[10px] font-mono text-text-dim w-5">{pos + 1}.</span>
              <span className="flex-1 text-sm md:text-base">{items[itemIdx]}</span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={pos === 0 || showFeedback}
                  onClick={() => move(pos, -1)}
                  className="w-8 h-8 rounded-full border border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={pos === order.length - 1 || showFeedback}
                  onClick={() => move(pos, 1)}
                  className="w-8 h-8 rounded-full border border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
              </div>
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
            {correctOrder.map((i) => (
              <li key={i}>{items[i]}</li>
            ))}
          </ol>
        </div>
      )}

      {showFeedback && <FeedbackBanner correct={isCorrect} explanation={slide.explanation} />}
      {slide.caption && (
        <p className="mt-4 text-sm font-serif italic text-text-muted">{slide.caption}</p>
      )}
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
                          <ReactMarkdown>{cell}</ReactMarkdown>
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
    default:
      return <UnsupportedSlide slide={normalized} />;
  }
}

function UnsupportedSlide({ slide }) {
  return (
    <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col items-center justify-center text-center gap-6">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-[0.25em]">
        {slide.type || 'slide'}
      </div>
      {slide.content ? (
        <div className="prose-lesson text-left w-full">
          <ReactMarkdown>{String(slide.content)}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-text-muted font-serif italic text-lg">
          This slide type isn't available in the player yet.
        </p>
      )}
    </div>
  );
}
