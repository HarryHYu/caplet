/**
 * Server-authoritative grading for live hosted quiz sessions.
 *
 * Solo lesson play (src/components/lesson/SlideRenderer.jsx) grades
 * client-side against a slide object that already contains the answer key —
 * fine when you're only cheating yourself. In a live multiplayer session the
 * same approach is trivially cheatable (open devtools, read the answer),
 * so grading has to happen here instead, against data the client never sees.
 *
 * Mirrors the exact correctness rules in SlideRenderer.jsx:
 *   choice:   setsEqual(selected, correctIndices)
 *   fillblank: per-blank case-(in)sensitive string match
 *   match:    right-column placement lines up with its left-column row
 *   order:    chosen sequence equals correctOrder
 *   timeline: chosen sequence equals storage order (0..n-1)
 *   hotspot:  clicked region has correct === true
 *
 * For match/order/timeline the *array order itself* is the answer (e.g. the
 * canonical `items` order for `order` slides tells you the correct sequence
 * directly), so simply deleting a `correctOrder` field isn't enough —
 * `prepareQuestion` has the server do the shuffling and keeps the
 * shown-position -> original-index mapping in the answerKey, which is never
 * sent to participants. Only `gradeResponse`, running here on the server,
 * ever sees it.
 */

const GRADABLE_TYPES = new Set(['choice', 'fillblank', 'match', 'order', 'hotspot', 'timeline']);

function isGradable(slide) {
  return !!slide && GRADABLE_TYPES.has(slide.type);
}

function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

/**
 * Fisher-Yates shuffle that also returns the shown-position -> original-index
 * mapping, so callers can grade a response described in shown-position terms.
 * `rng` is injectable (must return a float in [0,1)) so tests are deterministic.
 */
function shuffleWithMap(items, rng = Math.random) {
  const originalIndexOfShown = items.map((_, i) => i);
  for (let i = originalIndexOfShown.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [originalIndexOfShown[i], originalIndexOfShown[j]] = [originalIndexOfShown[j], originalIndexOfShown[i]];
  }
  return {
    originalIndexOfShown,
    shuffled: originalIndexOfShown.map((origIdx) => items[origIdx]),
  };
}

function isBlankCorrect(blank, given) {
  const g = (given ?? '').toString();
  return (blank?.answers || []).some((ans) => {
    if (blank.caseSensitive) return ans.trim() === g.trim();
    return ans.trim().toLowerCase() === g.trim().toLowerCase();
  });
}

/**
 * Splits a normalized slide into:
 *   - publicSlide: safe to broadcast to every participant right now
 *   - answerKey:   kept server-side only, passed back into gradeResponse
 *                  when that participant's answer comes in
 *
 * Non-gradable ("presentation") slide types pass through unchanged with a
 * null answerKey — there's nothing to hide and nothing to grade.
 */
function prepareQuestion(slide, rng = Math.random) {
  switch (slide?.type) {
    case 'choice':
      return {
        publicSlide: {
          type: 'choice',
          question: slide.question,
          options: slide.options || [],
          mode: slide.mode || 'single',
        },
        answerKey: { type: 'choice', correctIndices: slide.correctIndices || [] },
      };

    case 'fillblank': {
      const blanks = slide.blanks || [];
      return {
        publicSlide: {
          type: 'fillblank',
          template: slide.template,
          mode: slide.mode,
          blanks: blanks.map((b) => (b?.options ? { options: b.options } : {})),
        },
        answerKey: { type: 'fillblank', blanks },
      };
    }

    case 'match': {
      const pairs = slide.pairs || [];
      const { shuffled, originalIndexOfShown } = shuffleWithMap(pairs.map((p) => p.right), rng);
      return {
        publicSlide: {
          type: 'match',
          left: pairs.map((p) => p.left),
          rightOptions: shuffled,
        },
        answerKey: { type: 'match', originalIndexOfShown },
      };
    }

    case 'order': {
      const items = slide.items || [];
      const { shuffled, originalIndexOfShown } = shuffleWithMap(items, rng);
      return {
        publicSlide: {
          type: 'order',
          prompt: slide.prompt,
          items: shuffled,
        },
        answerKey: {
          type: 'order',
          originalIndexOfShown,
          correctOrder: slide.correctOrder || items.map((_, i) => i),
        },
      };
    }

    case 'timeline': {
      const events = slide.events || [];
      const { shuffled, originalIndexOfShown } = shuffleWithMap(events, rng);
      return {
        publicSlide: {
          type: 'timeline',
          prompt: slide.prompt,
          events: shuffled,
        },
        answerKey: { type: 'timeline', originalIndexOfShown },
      };
    }

    case 'hotspot': {
      const regions = slide.regions || [];
      return {
        publicSlide: {
          type: 'hotspot',
          image: slide.image,
          question: slide.question,
          regions: regions.map(({ id, label, x, y, w, h }) => ({ id, label, x, y, w, h })),
        },
        answerKey: {
          type: 'hotspot',
          correctIds: new Set(regions.filter((r) => r.correct === true).map((r) => r.id)),
        },
      };
    }

    default:
      // text / media / cards / table / divider / chart / diagram / embed / desmos —
      // nothing graded, nothing secret, pass through as-is.
      return { publicSlide: { ...slide }, answerKey: null };
  }
}

/**
 * Grades a participant's response against the server-held answerKey from
 * `prepareQuestion`. `response` shapes mirror what the equivalent
 * SlideRenderer component would have computed internally:
 *   choice:   number[]  (selected option indices)
 *   fillblank: string[] (one per blank, in template order)
 *   match:    number[]  (per left-row, the shown rightOptions index placed there)
 *   order:    number[]  (chosen sequence of shown `items` indices)
 *   timeline: number[]  (chosen sequence of shown `events` indices)
 *   hotspot:  string|number (clicked region id)
 */
function gradeResponse(answerKey, response) {
  if (!answerKey) return false;

  switch (answerKey.type) {
    case 'choice': {
      const chosen = new Set(Array.isArray(response) ? response : []);
      return setsEqual(chosen, new Set(answerKey.correctIndices));
    }

    case 'fillblank': {
      const given = Array.isArray(response) ? response : [];
      return answerKey.blanks.every((b, i) => isBlankCorrect(b, given[i]));
    }

    case 'match': {
      const placement = Array.isArray(response) ? response : [];
      if (placement.length !== answerKey.originalIndexOfShown.length) return false;
      return placement.every((shownIdx, rowIdx) => answerKey.originalIndexOfShown[shownIdx] === rowIdx);
    }

    case 'order': {
      const sequence = Array.isArray(response) ? response : [];
      const originalOrder = sequence.map((shownIdx) => answerKey.originalIndexOfShown[shownIdx]);
      return arraysEqual(originalOrder, answerKey.correctOrder);
    }

    case 'timeline': {
      const sequence = Array.isArray(response) ? response : [];
      const originalOrder = sequence.map((shownIdx) => answerKey.originalIndexOfShown[shownIdx]);
      const correctOrder = originalOrder.map((_, i) => i);
      return arraysEqual(originalOrder, correctOrder);
    }

    case 'hotspot':
      return answerKey.correctIds.has(response);

    default:
      return false;
  }
}

const MAX_POINTS = 1000;
const MIN_POINTS = 100;

/**
 * Kahoot-style speed scoring: full marks for a near-instant correct answer,
 * decaying linearly down to a floor as the window runs out. Wrong answers
 * always score zero. `elapsedMs`/`windowMs` must both come from the server's
 * own clock — never trust a client-reported elapsed time.
 */
function computePoints({ correct, elapsedMs, windowMs }) {
  if (!correct) return 0;
  if (!windowMs || windowMs <= 0) return MAX_POINTS;
  const remainingFraction = Math.max(0, Math.min(1, 1 - elapsedMs / windowMs));
  return Math.round(MIN_POINTS + (MAX_POINTS - MIN_POINTS) * remainingFraction);
}

module.exports = {
  GRADABLE_TYPES,
  isGradable,
  shuffleWithMap,
  prepareQuestion,
  gradeResponse,
  computePoints,
  MAX_POINTS,
  MIN_POINTS,
};
