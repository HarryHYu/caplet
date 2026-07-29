/**
 * services/recommendations.js — Personalised study prioritisation engine
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ALGORITHM OVERVIEW
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Exports:
 *   getRecommendations(userId, { limit })  → recommendation cards for the UI
 *   getDailyPriorities(userId)             → time-budgeted daily focus list
 *
 * Both share the same signal collection and scoring pipeline. The difference
 * is output shape: getRecommendations returns UI cards, getDailyPriorities
 * returns a sequenced task list with time estimates and difficulty hints.
 *
 * ─── SIGNAL COLLECTION ───────────────────────────────────────────────────────
 *
 *   1. KnowledgeAtoms      – every concept the student has encountered, with
 *                            mastery level (0–100) and review history
 *   2. UserSyllabusProgress – per-dot-point mastery tracked by practice volume
 *   3. SyllabusPoints       – the NSW HSC Physics syllabus (module-ordered)
 *   4. SchoolAssessments    – upcoming exams with due dates, weights, task types
 *   5. StudySessions        – recent focus timer sessions (fatigue signal)
 *   6. UserProgress         – course/lesson completion state
 *   7. Courses/Modules/Lessons – content graph for next-lesson recommendations
 *
 * ─── SCORING MODEL ───────────────────────────────────────────────────────────
 *
 *   RETENTION = f(mastery, daysSinceReview, SM2-stability)
 *
 *   SM-2 Stability (performance-weighted, not just review count):
 *     S = log1p(reviewCount) × 10 × performance_modifier
 *     performance_modifier = e^(0.4 × (accuracy – 0.55))
 *     High accuracy → stability grows fast → longer intervals before forgetting
 *     Low accuracy  → stability stays low  → needs frequent review
 *
 *   ASSESSMENT PRESSURE per assessment:
 *     pressure = daysUrgency(days) × weightMultiplier(weight%) × taskTypeMultiplier × coveragePressureBonus
 *
 *   PLATEAU FLAG: reviewCount ≥ 5 AND mastery < 55 AND age ≥ 14 days
 *     → Different intervention: "try a different angle" rather than more review
 *
 *   COVERAGE VELOCITY: uncovered_points / days_remaining
 *     critical (>3/day) → prioritise new content over review
 *     behind   (>1.5/day) → balanced
 *     ok       (<1.5/day) → can maintain spaced repetition rhythm
 *
 *   PREREQUISITE SEQUENCING: Physics M5 → M6,M7,M8
 *     If an earlier module has readiness < 50%, don't promote later modules
 *
 *   TESTING EFFECT: Concepts seen only via lesson (never quizzed) get a
 *     practice-urgency boost — reading alone does not build recall
 *
 *   FATIGUE PENALTY: Subjects studied >90 min this week → -12 pts (cooling off)
 *   INTERLEAVING BONUS: Switching subjects → +8 pts (cognitive science benefit)
 *
 *   LESSON MATCHING: every card carries lessons[] — real, uncompleted lessons
 *     content-matched to its topic (token overlap on lesson title / module /
 *     description, plus subject affinity). Strong matches for urgent topics are
 *     also promoted to navigate cards (Phase H) so the lesson feed is driven by
 *     need, not just course order.
 *
 *   ACCURACY PROFILE (per-question results from UserSyllabusProgress):
 *     - STUCK detection: ≥3 consecutive wrong answers, or <40% accuracy over
 *       4+ attempts → more quizzing isn't working; recommend re-learning via a
 *       lesson instead (plateau_break card, easy difficulty).
 *     - Accuracy-aware difficulty: cruising (≥85% accuracy) → 'hard' practice
 *       (desirable difficulties); struggling (<45%) → 'easy' to rebuild.
 *     - Subject struggle nudge: subjects with <50% overall accuracy get a
 *       small score boost — they need attention, not avoidance.
 *
 *   HABIT PROFILE (StudySession timestamps + lesson completion history):
 *     - Median session length → tasks are sized to the student's real
 *       attention span, not an idealised 90-minute block.
 *     - Peak hours: the hours holding the top ~60% of study time. Outside the
 *       window (or after a 3+ day gap) the day leads with the easiest task as
 *       a warm-up; inside it, the hardest task goes first.
 *     - Format affinity: completion rate per lesson type (video / reading /
 *       quiz / exercise) re-ranks matched lessons toward formats the student
 *       actually finishes.
 *
 * ─── OUTPUT ──────────────────────────────────────────────────────────────────
 *
 *   Each card / task has:
 *     type        – urgent_prep | review_concept | practice_weak | plateau_break |
 *                   syllabus_gap | next_lesson | strengthen | testing_effect
 *     urgency     – high | medium | low
 *     score       – 0–200 (internal sort key)
 *     title       – human-readable concept or lesson name
 *     reason      – plain-English explanation referencing real data
 *     action      – { type: 'practice'|'navigate', topic, subject, courseId, lessonId }
 *     estimatedMins – 10–45
 *     difficulty  – 'easy' | 'mixed' | 'hard'
 *     meta        – { masteryLevel, estimatedRetention, readiness, … }
 */

'use strict';

const { Op } = require('sequelize');
const UserProgress          = require('../models/UserProgress');
const Course                = require('../models/Course');
const Module                = require('../models/Module');
const Lesson                = require('../models/Lesson');
const StudySession          = require('../models/StudySession');
const SchoolAssessment      = require('../models/SchoolAssessment');
const KnowledgeAtom         = require('../models/KnowledgeAtom');
const SyllabusPoint         = require('../models/SyllabusPoint');
const UserSyllabusProgress  = require('../models/UserSyllabusProgress');
const RecommendationEvent   = require('../models/RecommendationEvent');
const { embedBatch, cosine, hasEmbeddings } = require('./embeddings');

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y) return null;
  const target = new Date(y, m - 1, d);
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function daysSince(date) {
  if (!date) return Infinity;
  return Math.max(0, (Date.now() - new Date(date).getTime()) / 86400000);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function normSubject(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\b(general|advanced|extension|standard|higher)\b\s*/g, '')
    .trim();
}

function subjectRelevance(a, b) {
  if (!a || !b) return 0;
  const na = normSubject(a), nb = normSubject(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  const wa = new Set(na.split(/\s+/));
  const overlap = nb.split(/\s+/).filter(w => w.length > 2 && wa.has(w)).length;
  return overlap > 0 ? 0.4 : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lesson ↔ topic content matching
// ─────────────────────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'the', 'and', 'with', 'from', 'into', 'that', 'this', 'your', 'for', 'are',
  'how', 'why', 'what', 'when', 'where', 'about', 'introduction', 'intro',
  'lesson', 'module', 'part', 'chapter', 'unit', 'course', 'overview',
]);

/**
 * Light suffix stripping so morphological variants land on the same token:
 * projectiles/projectile→projectil, kinematics/kinematic→kinematic,
 * acceleration/accelerate→accelerat, solving/solve→solv.
 * The output need not be a real word — only that BOTH sides of a comparison
 * stem identically. Deliberately crude; order of rules matters.
 */
function stem(word) {
  if (word.length <= 4) return word;
  let w = word;
  if (/ies$/.test(w))            w = w.replace(/ies$/, 'y');    // properties → property
  else if (/ations?$/.test(w))   w = w.replace(/ations?$/, 'at'); // acceleration(s) → accelerat
  else if (/ings?$/.test(w))     w = w.replace(/ings?$/, '');    // solving → solv
  else if (/[^s]s$/.test(w))     w = w.replace(/s$/, '');        // forces → force (mass stays)
  if (w.length > 4 && /e$/.test(w)) w = w.replace(/e$/, '');     // force → forc, solve → solv
  return w;
}

function tokenize(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !STOPWORDS.has(w))
      .map(stem),
  );
}

/** Flatten the course graph into a searchable lesson index. */
function buildLessonIndex(courses, completedLessonIds) {
  const index = [];
  for (const c of courses) {
    for (const mod of c.modules || []) {
      for (const l of mod.lessons || []) {
        index.push({
          courseId:     String(c.id),
          lessonId:     String(l.id),
          title:        l.title,
          courseTitle:  c.title,
          moduleTitle:  mod.title,
          durationMins: l.duration || null,
          lessonType:   l.lessonType || null,
          completed:    completedLessonIds.has(String(l.id)),
          titleTokens:  tokenize(l.title),
          moduleTokens: tokenize(mod.title),
          descTokens:   tokenize(l.description),
        });
      }
    }
  }
  return index;
}

// ── Semantic index (embeddings) ──────────────────────────────────────────────
// Lesson and syllabus-topic vectors, primed asynchronously in the background.
// Both catalogues are fixed sets, so priming is a one-time cost per content
// change (and the disk cache makes restarts free). Until vectors arrive —
// or when there's no API key — matching is purely lexical.

const _semantic = {
  lessonVecs: new Map(),  // lessonId -> vector
  topicVecs:  new Map(),  // lowercased topic -> vector
  primedLessons: new Set(),
  primedTopics:  new Set(),
  priming: false,
};

function lessonEmbedText(l) {
  return `${l.title}. ${l.moduleTitle}. ${l.courseTitle}. ${String(l.description || '').slice(0, 500)}`;
}

async function primeSemanticIndex(lessonIndex, syllabusPoints) {
  if (_semantic.priming || !hasEmbeddings()) return;
  _semantic.priming = true;
  try {
    const newLessons = lessonIndex.filter(l => !_semantic.primedLessons.has(l.lessonId));
    if (newLessons.length) {
      const vecs = await embedBatch(newLessons.map(lessonEmbedText));
      newLessons.forEach((l, i) => {
        _semantic.primedLessons.add(l.lessonId);
        if (vecs[i]) _semantic.lessonVecs.set(l.lessonId, vecs[i]);
      });
    }
    const topics = [...new Set(syllabusPoints.map(sp => `${sp.topic}`.toLowerCase().trim()))]
      .filter(t => t && !_semantic.primedTopics.has(t));
    if (topics.length) {
      const vecs = await embedBatch(topics);
      topics.forEach((t, i) => {
        _semantic.primedTopics.add(t);
        if (vecs[i]) _semantic.topicVecs.set(t, vecs[i]);
      });
    }
  } catch (e) {
    console.warn('[recommendations] semantic priming failed:', e.message);
  } finally {
    _semantic.priming = false;
  }
}

/**
 * Find real lessons that teach a given topic.
 *
 * Relevance = token overlap (title ×3, module ×2, description ×1)
 *           + subject affinity via course/module title (0–2)
 *           + semantic similarity when embeddings are primed (0–7).
 * The lexical two-token gate keeps out coincidental word matches, but a
 * strong semantic match (cosine ≥ 0.6) can pass it — that's how "Motion in
 * a Straight Line" finds "Displacement and Velocity Graphs" despite sharing
 * no words.
 */
function findLessonsForTopic(lessonIndex, topic, subject, { limit = 3, minScore = 3, formatAffinity = null } = {}) {
  const topicTokens = tokenize(topic);
  if (topicTokens.size === 0) return [];

  const tVec = _semantic.topicVecs.get(String(topic).toLowerCase().trim()) || null;

  const scored = [];
  for (const l of lessonIndex) {
    if (l.completed) continue;

    let score = 0;
    let hits  = 0;
    for (const t of topicTokens) {
      if (l.titleTokens.has(t))       { score += 3; hits++; }
      else if (l.moduleTokens.has(t)) { score += 2; hits++; }
      else if (l.descTokens.has(t))   { score += 1; hits++; }
    }

    // Semantic similarity, when both vectors exist
    let sim = 0;
    if (tVec) {
      const lVec = _semantic.lessonVecs.get(l.lessonId);
      if (lVec) sim = cosine(tVec, lVec);
    }

    // A single shared generic word ("motion", "energy") isn't a real match —
    // multi-word topics must overlap on at least two distinct tokens, UNLESS
    // the meaning matches strongly even though the words don't.
    const lexicalOk = hits >= Math.min(2, topicTokens.size);
    if (!lexicalOk && sim < 0.6) continue;

    if (sim >= 0.45) score += Math.round((sim - 0.4) * 20); // 0.45→1 … 0.75→7

    const subjRel = Math.max(
      subjectRelevance(l.courseTitle, subject),
      subjectRelevance(l.moduleTitle, subject),
    );
    if (subjRel >= 0.7)      score += 2;
    else if (subjRel >= 0.4) score += 1;

    // Habit signal: prefer formats this student actually finishes.
    // Never a gate — a great topical match in a "bad" format still surfaces.
    if (formatAffinity && l.lessonType && formatAffinity.has(l.lessonType)) {
      const rate = formatAffinity.get(l.lessonType);
      if (rate >= 0.7)      score += 1;
      else if (rate <= 0.3) score -= 1;
    }

    if (score >= minScore) scored.push({ l, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ l, score }) => ({
    courseId:     l.courseId,
    lessonId:     l.lessonId,
    title:        l.title,
    courseTitle:  l.courseTitle,
    moduleTitle:  l.moduleTitle,
    durationMins: l.durationMins,
    lessonType:   l.lessonType,
    matchScore:   score,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Accuracy profile — what the per-question results say about HOW they're doing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregates UserSyllabusProgress into:
 *   subjectAccuracy — Map<normSubject, 0..1> (only subjects with ≥5 attempts)
 *   stuckPoints     — dot points where practice is actively failing:
 *                     ≥3 consecutive wrong, or <40% accuracy over 4+ attempts.
 *                     These need re-teaching, not more of the same quizzing.
 */
function buildAccuracyProfile(syllabusProgress, syllabusPoints) {
  const pointById  = new Map(syllabusPoints.map(sp => [sp.id, sp]));
  const bySubject  = new Map();
  const typeBySubject = new Map(); // normSubject -> { recall: {p,c}, application: {p,c}, calculation: {p,c} }
  const stuckPoints = [];

  for (const up of syllabusProgress) {
    if (!up.practiceCount) continue;
    const sp = pointById.get(up.syllabusPointId);
    if (!sp) continue;

    const key = normSubject(sp.subject);
    if (!bySubject.has(key)) bySubject.set(key, { practice: 0, correct: 0 });
    const agg = bySubject.get(key);
    agg.practice += up.practiceCount;
    agg.correct  += up.correctCount || 0;

    // Question-type breakdown (recall / application / calculation)
    if (up.typeStats && typeof up.typeStats === 'object') {
      const tAgg = typeBySubject.get(key) || {};
      for (const [t, stats] of Object.entries(up.typeStats)) {
        if (!stats) continue;
        if (!tAgg[t]) tAgg[t] = { p: 0, c: 0 };
        tAgg[t].p += stats.p || 0;
        tAgg[t].c += stats.c || 0;
      }
      typeBySubject.set(key, tAgg);
    }

    const accuracy = (up.correctCount || 0) / up.practiceCount;
    if ((up.consecutiveWrong || 0) >= 3 || (up.practiceCount >= 4 && accuracy < 0.4)) {
      stuckPoints.push({ sp, up, accuracy });
    }
  }

  const subjectAccuracy = new Map();
  for (const [key, { practice, correct }] of bySubject) {
    if (practice >= 5) subjectAccuracy.set(key, correct / practice);
  }

  // Weakest question type per subject: needs ≥4 attempts of that type AND
  // meaningfully lower accuracy than the subject overall to be reported.
  const weakQuestionTypes = new Map(); // normSubject -> { type, accuracy }
  for (const [key, tAgg] of typeBySubject) {
    let worst = null;
    for (const [t, { p, c }] of Object.entries(tAgg)) {
      if (p < 4) continue;
      const acc = c / p;
      if (acc < 0.55 && (!worst || acc < worst.accuracy)) worst = { type: t, accuracy: acc };
    }
    if (worst) weakQuestionTypes.set(key, worst);
  }

  // Worst first — lowest accuracy with the most wasted attempts
  stuckPoints.sort((a, b) => (a.accuracy - b.accuracy) || (b.up.practiceCount - a.up.practiceCount));

  return { subjectAccuracy, stuckPoints, weakQuestionTypes };
}

/** Accuracy for one dot point's progress row, or null if too little data. */
function pointAccuracy(up) {
  if (!up || !up.practiceCount || up.practiceCount < 3) return null;
  return (up.correctCount || 0) / up.practiceCount;
}

// ─────────────────────────────────────────────────────────────────────────────
// Habit profile — when, how long, and in what format this student studies
// ─────────────────────────────────────────────────────────────────────────────

/**
 * sessions must be ordered newest-first (they are, from collectSignals).
 * Returns:
 *   medianSessionMins — their real attention span (null if no sessions)
 *   peakHours         — Set of hours covering the top ~60% of study time
 *   inPeakWindow      — is NOW one of their habitual study hours?
 *   daysSinceLastStudy — gap since the last session (null if never studied)
 *   formatAffinity    — Map<lessonType, completionRate 0..1> (≥2 starts only)
 */
function buildHabitProfile(sessions, progressRows, lessonIndex, now = new Date()) {
  const durations = sessions
    .map(s => Number(s.durationMins) || 0)
    .filter(d => d > 0)
    .sort((a, b) => a - b);
  const medianSessionMins = durations.length
    ? durations[Math.floor(durations.length / 2)]
    : null;

  // Hour-of-day histogram, weighted by minutes studied
  const hourMins = new Array(24).fill(0);
  for (const s of sessions) {
    hourMins[new Date(s.createdAt).getHours()] += Number(s.durationMins) || 0;
  }
  const totalMins  = hourMins.reduce((a, b) => a + b, 0);
  const peakHours  = new Set();
  if (totalMins > 0) {
    const ranked = hourMins
      .map((mins, h) => ({ h, mins }))
      .filter(x => x.mins > 0)
      .sort((a, b) => b.mins - a.mins);
    let acc = 0;
    for (const { h, mins } of ranked) {
      peakHours.add(h);
      acc += mins;
      if (acc >= totalMins * 0.6) break;
    }
  }
  // No history → don't penalise; assume any time is fine
  const inPeakWindow = peakHours.size === 0 || peakHours.has(now.getHours());

  const daysSinceLastStudy = sessions.length
    ? Math.floor(daysSince(sessions[0].createdAt))
    : null;

  // Format affinity: of the lesson types they start, which do they finish?
  const lessonTypeById = new Map(lessonIndex.map(l => [l.lessonId, l.lessonType]));
  const byType = new Map();
  for (const p of progressRows) {
    if (!p.lessonId) continue;
    const t = lessonTypeById.get(String(p.lessonId));
    if (!t) continue;
    if (!byType.has(t)) byType.set(t, { started: 0, completed: 0 });
    const rec = byType.get(t);
    rec.started++;
    if (p.status === 'completed') rec.completed++;
  }
  const formatAffinity = new Map();
  for (const [t, { started, completed }] of byType) {
    if (started >= 2) formatAffinity.set(t, completed / started);
  }

  return { medianSessionMins, peakHours, inPeakWindow, daysSinceLastStudy, formatAffinity };
}

// ─────────────────────────────────────────────────────────────────────────────
// Retention & Stability — SM-2 inspired
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Performance-weighted stability (days).
 *
 * Stability grows fast for high-accuracy concepts (they forget slowly),
 * stays low for struggling ones (they need frequent re-exposure).
 *
 * accuracy: REAL question accuracy (correct/attempts) when available — a much
 * better predictor of forgetting rate than the mastery bar. Falls back to the
 * masteryLevel/100 proxy when there's no attempt history.
 * base stability = 2 + log1p(reviewCount) × 10   (diminishing returns on reps)
 * performance_mod = e^(0.4 × (accuracy − 0.55))  (SM-2 inspired)
 */
function computeStability(masteryLevel, reviewCount, accuracy = null) {
  const acc       = accuracy != null ? clamp(accuracy, 0, 1) : clamp(masteryLevel / 100, 0, 1);
  const base      = 2 + Math.log1p(Math.max(0, reviewCount || 1)) * 10;
  const perfMod   = Math.exp(0.4 * (acc - 0.55));
  return Math.max(1, base * perfMod);
}

/**
 * Estimated current retention after t days of no review.
 * R = mastery × e^(−t / stability)
 */
function estimateRetention(masteryLevel, daysSinceLastReview, reviewCount = 1, accuracy = null) {
  if (!masteryLevel) return 0;
  if (!daysSinceLastReview || daysSinceLastReview <= 0) return masteryLevel;
  const S     = computeStability(masteryLevel, reviewCount, accuracy);
  const decay = Math.exp(-daysSinceLastReview / S);
  return clamp(Math.round(masteryLevel * decay), 0, 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Assessment pressure model
// ─────────────────────────────────────────────────────────────────────────────

/** Exponential urgency curve — not a step function. Returns 0–80. */
function daysUrgency(days) {
  if (days == null) return 0;
  if (days <= 0)  return 80;
  if (days <= 1)  return 72;
  if (days <= 2)  return 64;
  if (days <= 3)  return 56;
  if (days <= 5)  return 44;
  if (days <= 7)  return 34;
  if (days <= 10) return 24;
  if (days <= 14) return 16;
  if (days <= 21) return 10;
  if (days <= 30) return 6;
  return 2;
}

/** Weight multiplier: 40% exam → 1.3×, 5% quiz → 0.6×, unknown → 1.0 */
function weightMultiplier(weight) {
  if (!weight || weight <= 0) return 1.0;
  return clamp(0.5 + weight / 50, 0.5, 2.5);
}

/** Task type multiplier */
function taskTypeMultiplier(taskType) {
  const t = (taskType || '').toLowerCase();
  if (t.includes('exam'))                                         return 1.4;
  if (t.includes('in-class') || t.includes('class test'))        return 1.3;
  if (t.includes('quiz'))                                         return 1.0;
  if (t.includes('assign') || t.includes('essay') || t.includes('report')) return 0.9;
  if (t.includes('project'))                                      return 0.8;
  return 1.0;
}

/**
 * Coverage pressure: uncoveredPoints / daysRemaining → sqrt-normalised 0–40.
 * Also returns a velocityStatus: 'ok' | 'behind' | 'critical'
 */
function coveragePressure(uncoveredCount, daysRemaining) {
  if (!uncoveredCount || daysRemaining == null || daysRemaining <= 0) {
    return { bonus: 0, status: 'ok', pointsPerDay: 0 };
  }
  const rate   = uncoveredCount / Math.max(1, daysRemaining);
  const bonus  = clamp(Math.round(Math.sqrt(rate) * 12), 0, 40);
  const status = rate > 3 ? 'critical' : rate > 1.5 ? 'behind' : 'ok';
  return { bonus, status, pointsPerDay: rate };
}

// ─────────────────────────────────────────────────────────────────────────────
// Plateau detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A concept is plateaued when:
 *   - Reviewed 5+ times (they're trying)
 *   - Still below 55% mastery (not getting there)
 *   - Old enough that it's not just "new and developing" (≥ 14 days old)
 *
 * Plateaued concepts need a DIFFERENT intervention — not more of the same.
 */
function isPlateaued(atom) {
  if (!atom.reviewCount || atom.reviewCount < 5) return false;
  if (atom.masteryLevel >= 55) return false;
  const ageDays = daysSince(atom.createdAt);
  return ageDays >= 14;
}

// ─────────────────────────────────────────────────────────────────────────────
// Testing Effect
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A concept exposed only via lesson (source === 'lesson', practiceCount === 0)
 * should be quizzed ASAP — reading alone gives false confidence.
 * Returns true if the concept has never been actively quizzed.
 */
function needsTestingEffect(atom) {
  return atom.source === 'lesson' && (!atom.practiceCount || atom.practiceCount === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Session fatigue & interleaving (week-level signals)
// ─────────────────────────────────────────────────────────────────────────────

function buildSessionContext(sessions) {
  const weekMins = new Map();
  const cutoff   = Date.now() - 7 * 86400000;
  let   lastSubject = null;

  for (const s of sessions) {
    if (new Date(s.createdAt).getTime() < cutoff) continue;
    const sub = normSubject(s.label || '');
    weekMins.set(sub, (weekMins.get(sub) || 0) + (Number(s.durationMins) || 0));
    if (!lastSubject) lastSubject = sub;
  }
  return { weekMins, lastSubject };
}

function fatiguePenalty(subject, ctx) {
  const sub = normSubject(subject);
  for (const [key, mins] of ctx.weekMins) {
    if (subjectRelevance(key, sub) >= 0.7) {
      // > 90 min/week in the same subject → penalty up to -12
      return clamp(Math.round((mins / 90) * 12), 0, 12);
    }
  }
  return 0;
}

function interleavingBonus(subject, ctx) {
  if (!ctx.lastSubject) return 0;
  return subjectRelevance(normSubject(subject), ctx.lastSubject) < 0.4 ? 8 : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module prerequisite sequencing — derived from syllabus data, all subjects
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-subject module readiness (average dot-point mastery per module), plus
 * each subject's first Year-12 module — the "foundation" module the HSC year
 * builds on (e.g. Physics M5 Advanced Mechanics before M6/M7/M8).
 */
function buildModuleReadiness(syllabusPoints, syllabusMasteryMap) {
  const bySubject = new Map(); // normSubject -> Map<module, { sum, n, year }>
  for (const sp of syllabusPoints) {
    const key = normSubject(sp.subject);
    if (!bySubject.has(key)) bySubject.set(key, new Map());
    const modules = bySubject.get(key);
    if (!modules.has(sp.module)) modules.set(sp.module, { sum: 0, n: 0, year: sp.year });
    const m  = modules.get(sp.module);
    const up = syllabusMasteryMap.get(sp.id);
    m.sum += up?.masteryLevel ?? 0;
    m.n++;
  }

  const readiness = new Map(); // normSubject -> { avg: Map<module, pct>, firstY12 }
  for (const [key, modules] of bySubject) {
    const avg = new Map();
    let firstY12 = null;
    for (const [mod, { sum, n, year }] of modules) {
      avg.set(mod, Math.round(sum / Math.max(1, n)));
      if (year === 12 && (firstY12 == null || mod < firstY12)) firstY12 = mod;
    }
    readiness.set(key, { avg, firstY12 });
  }
  return readiness;
}

/**
 * Year 11 modules and each subject's first Year-12 module are always open.
 * Later Year-12 modules require the subject's foundation module at ≥ 40%
 * readiness — the data-driven generalisation of the old hardcoded
 * Physics M5 → M6/M7/M8 rule, now applied to every subject.
 */
function prereqsSatisfied(subject, module, moduleReadiness) {
  const entry = moduleReadiness.get(normSubject(subject));
  if (!entry || entry.firstY12 == null) return true;
  if (module <= entry.firstY12) return true;
  return (entry.avg.get(entry.firstY12) || 0) >= 40;
}

// ─────────────────────────────────────────────────────────────────────────────
// Difficulty hint
// ─────────────────────────────────────────────────────────────────────────────

/**
 * "Desirable difficulties" — harder retrieval produces stronger memory.
 * Once mastery > 65%, recommend harder practice to push toward fluency.
 *
 * When real question accuracy is available it takes priority over mastery:
 * a student cruising at ≥85% accuracy needs harder questions regardless of
 * where the mastery bar sits; one below 45% needs confidence rebuilt first.
 */
function difficultyHint(masteryLevel, accuracy = null) {
  if (accuracy != null) {
    if (accuracy >= 0.85 && masteryLevel >= 40) return 'hard';
    if (accuracy < 0.45) return 'easy';
  }
  if (masteryLevel >= 65) return 'hard';
  if (masteryLevel >= 40) return 'mixed';
  return 'easy';
}

// ─────────────────────────────────────────────────────────────────────────────
// Time estimation per task type
// ─────────────────────────────────────────────────────────────────────────────

function estimateMins(type, urgency) {
  const base = {
    urgent_prep:    30,
    review_concept: 12,
    practice_weak:  20,
    plateau_break:  20,
    testing_effect: 18,
    syllabus_gap:   25,
    next_lesson:    30,
    strengthen:     12,
  }[type] || 20;
  const adj = urgency === 'high' ? 5 : urgency === 'low' ? -3 : 0;
  return Math.max(10, base + adj);
}

// ─────────────────────────────────────────────────────────────────────────────
// Assessment context builder
// ─────────────────────────────────────────────────────────────────────────────

function buildAssessmentContexts(assessments, syllabusPoints, syllabusMasteryMap, atoms) {
  return assessments.map(a => {
    const days    = daysUntil(a.dueDate);
    const urgency = daysUrgency(days);
    const wm      = weightMultiplier(a.weight);
    const tm      = taskTypeMultiplier(a.taskType);

    // Relevant syllabus points
    const relSyllabus = syllabusPoints.filter(sp => subjectRelevance(sp.subject, a.subject) >= 0.7);
    const titleLower  = (a.title || '').toLowerCase();
    const moduleNums  = (titleLower.match(/module\s*\d+/g) || []).map(k => parseInt(k.replace(/\D/g, ''), 10)).filter(Boolean);
    const scopedSyllabus = moduleNums.length ? relSyllabus.filter(sp => moduleNums.includes(sp.module)) : relSyllabus;
    const totalSyllabusPoints = scopedSyllabus.length;

    const uncoveredSyllabus = scopedSyllabus.filter(sp => {
      const up = syllabusMasteryMap.get(sp.id);
      return !up || up.masteryLevel < 50;
    });

    const relAtoms   = atoms.filter(at => subjectRelevance(at.subject, a.subject) >= 0.7);
    const weakAtoms  = relAtoms.filter(at => at.masteryLevel < 60);
    const { bonus: cpBonus, status: velocityStatus, pointsPerDay } = coveragePressure(
      totalSyllabusPoints > 0 ? uncoveredSyllabus.length : weakAtoms.length,
      days,
    );

    const totalPressure = urgency * wm * tm + cpBonus;

    // Readiness (0–100, higher = more prepared)
    const readiness = totalSyllabusPoints > 0
      ? Math.round(((totalSyllabusPoints - uncoveredSyllabus.length) / Math.max(1, totalSyllabusPoints)) * 100)
      : relAtoms.length > 0
        ? Math.round((relAtoms.filter(at => at.masteryLevel >= 60).length / relAtoms.length) * 100)
        : 0;

    return {
      assessment: a,
      days,
      urgency,
      totalPressure,
      scopedSyllabus,
      uncoveredSyllabus,
      weakAtoms,
      readiness,
      velocityStatus,
      pointsPerDay,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Caches
// ─────────────────────────────────────────────────────────────────────────────

// The course catalogue (and its tokenized lesson index) is user-independent
// and changes rarely — cache it briefly so every request doesn't re-fetch and
// re-tokenize the whole content graph.
const CATALOGUE_TTL_MS = 60_000;
let _catalogueCache = { at: 0, courses: null, baseIndex: null };

async function getCatalogueCached() {
  if (_catalogueCache.courses && Date.now() - _catalogueCache.at < CATALOGUE_TTL_MS) {
    return _catalogueCache;
  }
  const courses = await Course.findAll({
    attributes: ['id', 'title'],
    include: [{
      model: Module, as: 'modules', attributes: ['id', 'title'],
      include: [{ model: Lesson, as: 'lessons', attributes: ['id', 'title', 'description', 'duration', 'lessonType'] }],
    }],
  });
  // Tokenize once with no completion info; per-user completion is layered on
  // top in collectSignals via cheap shallow copies.
  const baseIndex = buildLessonIndex(courses, new Set());
  _catalogueCache = { at: Date.now(), courses, baseIndex };
  return _catalogueCache;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main signal collection
// ─────────────────────────────────────────────────────────────────────────────

async function collectSignals(userId) {
  const now      = new Date();
  const monthAgo = new Date(now - 30 * 86400000);

  const [atoms, syllabusPoints, syllabusProgress, assessments, sessions, progressRows, catalogue, recEvents] = await Promise.all([
    KnowledgeAtom.findAll({ where: { userId }, order: [['masteryLevel', 'ASC']] }),

    SyllabusPoint.findAll({ order: [['module', 'ASC'], ['orderIndex', 'ASC']] }),

    UserSyllabusProgress.findAll({ where: { userId } }),

    SchoolAssessment.findAll({
      where: { userId, status: 'upcoming', dueDate: { [Op.gte]: new Date().toISOString().slice(0, 10) } },
      order: [['dueDate', 'ASC']],
    }),

    StudySession.findAll({
      where: { userId, createdAt: { [Op.gte]: monthAgo } },
      attributes: ['durationMins', 'createdAt', 'label'],
      order: [['createdAt', 'DESC']],
    }),

    UserProgress.findAll({
      where: { userId },
      include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }],
    }),

    getCatalogueCached(),

    RecommendationEvent.findAll({
      where: { userId, createdAt: { [Op.gte]: monthAgo } },
      attributes: ['recType', 'action'],
    }).catch(() => []), // table may not exist on first boot before migration
  ]);

  const { courses, baseIndex } = catalogue;

  // Engagement profile: for each card type, how often does this student act
  // on it when shown? Used as a bounded reweighting signal — a student who
  // always ignores spaced-review cards but acts on assessment-prep cards gets
  // more of what actually moves them.
  const engagement = new Map(); // recType -> { shown, acted }
  for (const ev of recEvents) {
    if (!engagement.has(ev.recType)) engagement.set(ev.recType, { shown: 0, acted: 0 });
    const e = engagement.get(ev.recType);
    if (ev.action === 'shown') e.shown++;
    else e.acted++;
  }

  // Build lookup maps
  const syllabusMasteryMap = new Map(syllabusProgress.map(up => [up.syllabusPointId, up]));

  // Course stats (completed lessons, pct)
  const completedLessonIds = new Set(
    progressRows.filter(p => p.lessonId && p.status === 'completed').map(p => String(p.lessonId)),
  );
  const courseStatsMap = new Map();
  for (const c of courses) {
    const allLessons = (c.modules || []).flatMap(m => m.lessons || []);
    const completed  = allLessons.filter(l => completedLessonIds.has(String(l.id))).length;
    const pct        = allLessons.length > 0 ? Math.round(completed / allLessons.length * 100) : 0;
    const prog       = progressRows.find(p => String(p.courseId) === String(c.id) && !p.lessonId);
    courseStatsMap.set(String(c.id), {
      id: String(c.id), title: c.title,
      modules: c.modules, pct, completed, total: allLessons.length,
      lastAccessedAt: prog?.lastAccessedAt || null,
    });
  }

  // Content-matching index: cached user-independent base + per-user completion
  const lessonIndex = baseIndex.map(e =>
    completedLessonIds.has(e.lessonId) ? { ...e, completed: true } : e,
  );

  // Prime semantic vectors in the background (no-op without an API key;
  // instant after the first run thanks to the disk cache). Deliberately not
  // awaited — the first request uses lexical matching, later ones semantic.
  primeSemanticIndex(baseIndex, syllabusPoints);

  // Per-subject module readiness (for prerequisite sequencing, all subjects)
  const moduleReadiness = buildModuleReadiness(syllabusPoints, syllabusMasteryMap);

  const sessionCtx      = buildSessionContext(sessions);
  const accuracyProfile = buildAccuracyProfile(syllabusProgress, syllabusPoints);
  const habitProfile    = buildHabitProfile(sessions, progressRows, lessonIndex, now);

  return {
    now, atoms, syllabusPoints, syllabusMasteryMap, assessments,
    sessions, completedLessonIds, courseStatsMap, moduleReadiness,
    sessionCtx, lessonIndex, accuracyProfile, habitProfile, engagement,
  };
}

// The Today tab fires /today and /recommendations together — share one
// signal-collection pass between them instead of hitting the DB twice.
const SIGNALS_TTL_MS = 15_000;
const _signalsCache = new Map(); // userId -> { at, promise }

function collectSignalsCached(userId) {
  const hit = _signalsCache.get(userId);
  if (hit && Date.now() - hit.at < SIGNALS_TTL_MS) return hit.promise;

  const promise = collectSignals(userId);
  _signalsCache.set(userId, { at: Date.now(), promise });
  promise.catch(() => _signalsCache.delete(userId)); // never cache failures
  if (_signalsCache.size > 500) {
    _signalsCache.delete(_signalsCache.keys().next().value);
  }
  return promise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Candidate scoring
// ─────────────────────────────────────────────────────────────────────────────

async function buildCandidates(signals) {
  const {
    now, atoms, syllabusPoints, syllabusMasteryMap, assessments,
    completedLessonIds, courseStatsMap, moduleReadiness, sessionCtx,
    lessonIndex, accuracyProfile, habitProfile,
  } = signals;

  const candidates = [];

  // Small boost for subjects the student is objectively struggling in
  // (<50% question accuracy across ≥5 attempts) — they need attention,
  // and left alone students avoid exactly these subjects.
  const subjectStruggleBoost = (subject) => {
    const acc = accuracyProfile.subjectAccuracy.get(normSubject(subject));
    return acc != null && acc < 0.5 ? 6 : 0;
  };

  // ── Phase A: Assessment-driven cards (highest priority pool) ─────────────

  const assessmentContexts = buildAssessmentContexts(assessments, syllabusPoints, syllabusMasteryMap, atoms);

  // Only include assessments ≤ 28 days away for dedicated cards
  for (const ctx of assessmentContexts.filter(c => c.days != null && c.days <= 28)) {
    const { assessment: a, days, totalPressure, scopedSyllabus, uncoveredSyllabus, weakAtoms, readiness, velocityStatus } = ctx;

    // Assessment overview card
    const readinessStr =
      readiness >= 75 ? 'on track — keep polishing'
      : readiness >= 50 ? `${readiness}% ready — plenty still to cover`
      : readiness === 0 ? 'no content covered yet — start immediately'
      : `only ${readiness}% covered — urgent attention needed`;

    const velocityNote = velocityStatus === 'critical'
      ? ` You need to cover ${ctx.pointsPerDay.toFixed(1)} new syllabus points per day — prioritise new content over review.`
      : velocityStatus === 'behind'
      ? ` Coverage pace is tight — balance new content with review.`
      : '';

    // Weakest question format for this subject (recall/application/calculation)
    const weakType = accuracyProfile.weakQuestionTypes.get(normSubject(a.subject));
    const weakTypeNote = weakType
      ? ` Your weakest format here is ${weakType.type} questions (${Math.round(weakType.accuracy * 100)}% accuracy) — practise those specifically.`
      : '';

    candidates.push({
      id: `asmt_overview_${a.id}`,
      _assessmentId: a.id,
      type: 'urgent_prep',
      score: clamp(totalPressure, 0, 200),
      title: `${a.subject} — ${a.title}`,
      subtitle: `${a.weight != null ? `${a.weight}% · ` : ''}${a.taskType || 'Assessment'}`,
      reason: (days === 0 ? 'Due today. Final revision time.' : days === 1 ? 'Due tomorrow.' : `${days} days away.`) + ` ${readinessStr}.${velocityNote}${weakTypeNote}`,
      urgency: days <= 3 ? 'high' : days <= 7 ? 'medium' : 'low',
      estimatedMins: estimateMins('urgent_prep', days <= 3 ? 'high' : 'medium'),
      difficulty: readiness < 40 ? 'easy' : 'mixed',
      action: { type: 'practice', subject: a.subject, topic: a.title, focusQuestionType: weakType?.type },
      meta: { readiness, velocityStatus, daysUntil: days, weakQuestionType: weakType?.type },
    });

    // Worst syllabus gaps for this assessment (sorted by retention gap desc)
    const sortedGaps = uncoveredSyllabus
      .map(sp => {
        const up  = syllabusMasteryMap.get(sp.id);
        const mastery   = up?.masteryLevel ?? 0;
        const dsr       = daysSince(up?.lastPracticed);
        const retention = estimateRetention(mastery, dsr, up?.practiceCount || 0, pointAccuracy(up));
        return { sp, up, mastery, retention, gap: 100 - retention };
      })
      .sort((a, b) => b.gap - a.gap);

    for (const { sp, up, mastery, retention } of sortedGaps.slice(0, 3)) {
      // Skip if this subject's foundation module isn't ready yet
      if (!prereqsSatisfied(sp.subject, sp.module, moduleReadiness)) continue;

      let score = clamp(totalPressure * 0.7 + (100 - retention) * 0.4, 0, 180);
      score -= fatiguePenalty(sp.subject, sessionCtx);
      score += interleavingBonus(sp.subject, sessionCtx);
      score += subjectStruggleBoost(sp.subject);

      candidates.push({
        id:    `asmt_gap_${a.id}_${sp.id}`,
        _assessmentId: a.id,
        type:  'syllabus_gap',
        score: clamp(score, 0, 180),
        title: sp.topic,
        subtitle: `${sp.subject} · Module ${sp.module}`,
        reason: mastery === 0
          ? `Not covered yet — this dot point is in your ${days}d exam.`
          : `Only ${mastery}% mastery (est. recall ${retention}%) — assessed in ${days}d.`,
        urgency: days <= 3 ? 'high' : days <= 7 ? 'medium' : 'low',
        estimatedMins: estimateMins('syllabus_gap', days <= 3 ? 'high' : 'medium'),
        difficulty: difficultyHint(mastery, pointAccuracy(up)),
        action: { type: 'practice', topic: sp.topic, subject: sp.subject },
        meta:  { masteryLevel: mastery, estimatedRetention: retention, code: sp.code },
      });
    }

    // Weak knowledge atoms for this assessment (non-syllabus)
    for (const at of weakAtoms.slice(0, 2)) {
      const dsr       = daysSince(at.lastReviewedAt || at.lastReviewed);
      const retention = estimateRetention(at.masteryLevel, dsr, at.reviewCount || 1);
      const plateau   = isPlateaued(at);

      let score = clamp(totalPressure * 0.6 + (100 - retention) * 0.35, 0, 160);
      score -= fatiguePenalty(at.subject, sessionCtx);
      score += interleavingBonus(at.subject, sessionCtx);

      const type    = plateau ? 'plateau_break' : 'practice_weak';
      const already = candidates.some(c => c.title === at.concept && c.subtitle?.includes(at.subject));
      if (already) continue;

      candidates.push({
        id:    `asmt_atom_${a.id}_${at.id}`,
        _assessmentId: a.id,
        type,
        score: clamp(score, 0, 160),
        title: at.concept,
        subtitle: at.subject,
        reason: plateau
          ? `You've reviewed this ${at.reviewCount}× but it's still at ${at.masteryLevel}% — try practising it differently.`
          : `${at.masteryLevel}% mastery · est. recall ${retention}% · in your ${days}d ${a.subject} exam.`,
        urgency: days <= 3 ? 'high' : days <= 7 ? 'medium' : 'low',
        estimatedMins: estimateMins(type, days <= 3 ? 'high' : 'medium'),
        difficulty: plateau ? 'mixed' : difficultyHint(at.masteryLevel),
        action: { type: 'practice', topic: at.concept, subject: at.subject },
        meta:  { masteryLevel: at.masteryLevel, estimatedRetention: retention, plateau },
      });
    }
  }

  // ── Phase A2: Stuck dot points — practice is actively failing ─────────────
  // ≥3 consecutive wrong answers (or <40% accuracy over 4+ attempts) means
  // more quizzing digs the hole deeper. Recommend re-learning the content:
  // the card is easy-difficulty and its matched lessons are the real payload.

  for (const { sp, up, accuracy } of accuracyProfile.stuckPoints.slice(0, 4)) {
    if (candidates.some(c => c.title === sp.topic)) continue;

    let score = 50 + (up.consecutiveWrong || 0) * 6 + (1 - accuracy) * 20;
    for (const ctx of assessmentContexts) {
      if (subjectRelevance(sp.subject, ctx.assessment.subject) >= 0.7) {
        score += ctx.totalPressure * 0.25; break;
      }
    }
    score -= fatiguePenalty(sp.subject, sessionCtx);
    score += interleavingBonus(sp.subject, sessionCtx);

    const accPct = Math.round(accuracy * 100);
    candidates.push({
      id:    `stuck_${sp.id}`,
      type:  'plateau_break',
      score: clamp(score, 0, 160),
      title: sp.topic,
      subtitle: `${sp.subject} · Module ${sp.module}`,
      reason: (up.consecutiveWrong || 0) >= 3
        ? `Your last ${up.consecutiveWrong} answers here were wrong (${accPct}% accuracy over ${up.practiceCount} attempts) — more quizzing isn't working. Re-learn it first, then retry.`
        : `${accPct}% accuracy over ${up.practiceCount} attempts — the foundations aren't there yet. Go back to the lesson before more practice.`,
      urgency: score >= 80 ? 'high' : 'medium',
      estimatedMins: estimateMins('plateau_break', 'medium'),
      difficulty: 'easy',
      action: { type: 'practice', topic: sp.topic, subject: sp.subject },
      meta:  { masteryLevel: up.masteryLevel ?? 0, accuracy: accPct, consecutiveWrong: up.consecutiveWrong || 0, stuck: true, code: sp.code },
    });
  }

  // ── Phase B: Spaced repetition overdue (standalone, not covered by A) ─────

  const reviewDueAtoms = atoms.filter(a => a.nextReviewAt && new Date(a.nextReviewAt) <= now);

  for (const atom of reviewDueAtoms) {
    const alreadyCovered = candidates.some(c => c.title === atom.concept);
    if (alreadyCovered) continue;

    const dsr       = daysSince(atom.lastReviewedAt || atom.lastReviewed);
    const retention = estimateRetention(atom.masteryLevel, dsr, atom.reviewCount || 1);
    const retLoss   = atom.masteryLevel - retention;
    const plateau   = isPlateaued(atom);
    const testEffect = needsTestingEffect(atom);

    const type = plateau ? 'plateau_break' : testEffect ? 'testing_effect' : 'review_concept';

    let score = 45 + retLoss * 0.6;
    // Assessment boost
    for (const ctx of assessmentContexts) {
      if (subjectRelevance(atom.subject, ctx.assessment.subject) >= 0.7) {
        score += ctx.totalPressure * 0.25;
        break;
      }
    }
    score -= fatiguePenalty(atom.subject, sessionCtx);
    score += interleavingBonus(atom.subject, sessionCtx);

    const reasonMap = {
      plateau_break:  `Reviewed ${atom.reviewCount}× but stuck at ${atom.masteryLevel}% — it needs a different approach, not more of the same.`,
      testing_effect: `You've read about this in a lesson but never quizzed yourself — reading alone doesn't build recall.`,
      review_concept: dsr > 14
        ? `Not reviewed in ${Math.floor(dsr)} days — estimated recall has dropped to ~${retention}%.`
        : `Spaced repetition due — estimated current recall ~${retention}%.`,
    };

    candidates.push({
      id:    `review_${atom.id}`,
      type,
      score: clamp(score, 0, 150),
      title: atom.concept,
      subtitle: atom.subject,
      reason:   reasonMap[type],
      urgency:  score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low',
      estimatedMins: estimateMins(type, score >= 80 ? 'high' : 'low'),
      difficulty: plateau ? 'mixed' : difficultyHint(atom.masteryLevel),
      action: { type: 'practice', topic: atom.concept, subject: atom.subject },
      meta:   { masteryLevel: atom.masteryLevel, estimatedRetention: retention, plateau },
    });
  }

  // ── Phase C: Testing effect (lesson-seen, never quizzed) ─────────────────

  const neverQuizzed = atoms.filter(at => needsTestingEffect(at) && !reviewDueAtoms.includes(at));
  for (const atom of neverQuizzed.slice(0, 5)) {
    if (candidates.some(c => c.title === atom.concept)) continue;

    const dsr       = daysSince(atom.lastReviewedAt || atom.lastReviewed);
    const retention = estimateRetention(atom.masteryLevel, dsr, 1);

    let score = 38 + (100 - retention) * 0.3;
    for (const ctx of assessmentContexts) {
      if (subjectRelevance(atom.subject, ctx.assessment.subject) >= 0.7) {
        score += ctx.totalPressure * 0.2; break;
      }
    }
    score -= fatiguePenalty(atom.subject, sessionCtx);

    candidates.push({
      id:    `test_effect_${atom.id}`,
      type:  'testing_effect',
      score: clamp(score, 0, 120),
      title: atom.concept,
      subtitle: atom.subject,
      reason: `Seen in a lesson but never tested — the testing effect: retrieving is far more powerful than re-reading.`,
      urgency: 'medium',
      estimatedMins: estimateMins('testing_effect', 'medium'),
      difficulty: 'easy',
      action: { type: 'practice', topic: atom.concept, subject: atom.subject },
      meta:   { masteryLevel: atom.masteryLevel, estimatedRetention: retention },
    });
  }

  // ── Phase D: Weak atoms not SR-due ───────────────────────────────────────

  const nonDueWeak = atoms.filter(at =>
    at.masteryLevel < 40 &&
    (!at.nextReviewAt || new Date(at.nextReviewAt) > now) &&
    !candidates.some(c => c.title === at.concept)
  );

  for (const atom of nonDueWeak.slice(0, 5)) {
    const dsr       = daysSince(atom.lastReviewedAt || atom.lastReviewed);
    const retention = estimateRetention(atom.masteryLevel, dsr, atom.reviewCount || 1);

    let score = 22 + (100 - retention) * 0.25;
    for (const ctx of assessmentContexts) {
      if (subjectRelevance(atom.subject, ctx.assessment.subject) >= 0.7) {
        score += ctx.totalPressure * 0.18; break;
      }
    }
    score -= fatiguePenalty(atom.subject, sessionCtx);
    score += interleavingBonus(atom.subject, sessionCtx);

    candidates.push({
      id:    `weak_${atom.id}`,
      type:  'practice_weak',
      score: clamp(score, 0, 100),
      title: atom.concept,
      subtitle: atom.subject,
      reason: atom.masteryLevel === 0
        ? 'Seen but never practised — easy wins available right now.'
        : `${atom.masteryLevel}% mastery (est. recall ~${retention}%) — needs drilling.`,
      urgency: score >= 55 ? 'medium' : 'low',
      estimatedMins: estimateMins('practice_weak', 'low'),
      difficulty: 'easy',
      action: { type: 'practice', topic: atom.concept, subject: atom.subject },
      meta:   { masteryLevel: atom.masteryLevel, estimatedRetention: retention },
    });
  }

  // ── Phase E: Strengthen (40–72%, not yet mastered) ───────────────────────

  const strengthen = atoms.filter(at =>
    at.masteryLevel >= 40 && at.masteryLevel < 72 &&
    (!at.nextReviewAt || new Date(at.nextReviewAt) > now) &&
    !candidates.some(c => c.title === at.concept)
  );

  for (const atom of strengthen.slice(0, 4)) {
    const dsr       = daysSince(atom.lastReviewedAt || atom.lastReviewed);
    const retention = estimateRetention(atom.masteryLevel, dsr, atom.reviewCount || 1);

    let score = 15 + (72 - atom.masteryLevel) * 0.3;
    for (const ctx of assessmentContexts) {
      if (subjectRelevance(atom.subject, ctx.assessment.subject) >= 0.7) {
        score += ctx.totalPressure * 0.12; break;
      }
    }
    score -= fatiguePenalty(atom.subject, sessionCtx);

    candidates.push({
      id:    `strengthen_${atom.id}`,
      type:  'strengthen',
      score: clamp(score, 0, 80),
      title: atom.concept,
      subtitle: atom.subject,
      reason: `${atom.masteryLevel}% mastery — ${72 - atom.masteryLevel} points from solid. Est. recall ~${retention}%. Push it over the line.`,
      urgency: 'low',
      estimatedMins: estimateMins('strengthen', 'low'),
      difficulty: difficultyHint(atom.masteryLevel),
      action: { type: 'practice', topic: atom.concept, subject: atom.subject },
      meta:   { masteryLevel: atom.masteryLevel, estimatedRetention: retention },
    });
  }

  // ── Phase F: Uncovered syllabus points (no assessment deadline) ───────────

  const assessmentCovered = new Set(candidates.filter(c => c.type === 'syllabus_gap').map(c => c.title));

  const syllabusGaps = syllabusPoints
    .filter(sp => {
      const up = syllabusMasteryMap.get(sp.id);
      return (!up || up.masteryLevel < 50) && !assessmentCovered.has(sp.topic);
    });

  // Group by module for prerequisite check
  for (const sp of syllabusGaps.slice(0, 6)) {
    if (candidates.some(c => c.title === sp.topic)) continue;
    if (!prereqsSatisfied(sp.subject, sp.module, moduleReadiness)) continue;

    const up  = syllabusMasteryMap.get(sp.id);
    const mastery = up?.masteryLevel ?? 0;
    const dsr = daysSince(up?.lastPracticed);
    const retention = estimateRetention(mastery, dsr, up?.practiceCount || 0, pointAccuracy(up));

    let score = 12 + (sp.weight === 2 ? 6 : 0) + (100 - retention) * 0.1;
    score -= fatiguePenalty(sp.subject, sessionCtx);
    score += interleavingBonus(sp.subject, sessionCtx);
    score += subjectStruggleBoost(sp.subject);

    candidates.push({
      id:    `syllabus_${sp.id}`,
      type:  'syllabus_gap',
      score: clamp(score, 0, 80),
      title: sp.topic,
      subtitle: `${sp.subject} · Module ${sp.module}${sp.inquiryQuestion ? '' : ''}`,
      reason: mastery === 0
        ? 'Not started — every uncovered dot point is a mark you can\'t earn yet.'
        : `${mastery}% mastery — needs more practice to be exam-ready.`,
      urgency: 'low',
      estimatedMins: estimateMins('syllabus_gap', 'low'),
      difficulty: difficultyHint(mastery, pointAccuracy(up)),
      action: { type: 'practice', topic: sp.topic, subject: sp.subject },
      meta:   { masteryLevel: mastery, estimatedRetention: retention, code: sp.code },
    });
  }

  // ── Phase G: Next lesson per course (in-progress first, then unstarted) ───

  // Weak-topic token pool: what the student most needs right now. Used to let
  // a genuinely relevant lesson jump the queue within a course.
  const urgentTopicTokens = new Set();
  for (const c of candidates.filter(c => c.action?.type === 'practice' && c.score >= 40)) {
    for (const t of tokenize(c.action.topic)) urgentTopicTokens.add(t);
  }

  const openCourses = [...courseStatsMap.values()]
    .filter(c => c.pct < 100 && c.total > 0)
    .sort((a, b) => {
      // In-progress courses first, then unstarted; recent activity wins ties
      if ((a.pct > 0) !== (b.pct > 0)) return a.pct > 0 ? -1 : 1;
      return daysSince(a.lastAccessedAt) - daysSince(b.lastAccessedAt);
    });

  for (const c of openCourses.slice(0, 4)) {
    // Collect uncompleted lessons in course order
    const uncompleted = [];
    for (const mod of c.modules || []) {
      for (const lesson of (mod.lessons || [])) {
        if (!completedLessonIds.has(String(lesson.id))) {
          uncompleted.push({ id: lesson.id, title: lesson.title, moduleTitle: mod.title, durationMins: lesson.duration || null });
        }
      }
    }
    if (uncompleted.length === 0) continue;
    if (candidates.some(cc => cc.id === `next_${c.id}`)) continue;

    // Default: sequential next lesson (respects course order / prerequisites).
    // Override: if one of the next few lessons directly teaches an urgent weak
    // topic, surface that one instead — need beats sequence.
    let nextLesson  = uncompleted[0];
    let topicDriven = false;
    for (const lesson of uncompleted.slice(0, 5)) {
      const tokens  = tokenize(lesson.title);
      const overlap = [...tokens].filter(t => urgentTopicTokens.has(t)).length;
      if (overlap >= 2) { nextLesson = lesson; topicDriven = true; break; }
    }

    const started = c.pct > 0;
    const dsa     = daysSince(c.lastAccessedAt);
    let score = started ? 22 : 12;
    if (topicDriven) score += 15;          // teaches something they're weak at
    if (started) {
      if (dsa < 1) score += 12;            // momentum
      else if (dsa < 3) score += 7;
      else if (dsa > 14) score += 6;       // re-engagement
    }

    for (const ctx of assessmentContexts) {
      if (subjectRelevance(c.title, ctx.assessment.subject) >= 0.7) {
        score += ctx.totalPressure * 0.15; break;
      }
    }
    score -= fatiguePenalty(c.title, sessionCtx);

    const reason = topicDriven
      ? `This lesson covers a topic you're weak in right now — highest-impact next step in ${c.title}.`
      : !started
      ? `You haven't started ${c.title} yet — the first lesson is the hardest one to begin.`
      : dsa < 1
      ? `Continue where you left off — ${c.pct}% complete, momentum is key.`
      : dsa > 14
      ? `You haven't touched this in ${Math.floor(dsa)} days — re-engagement now prevents cold restarts.`
      : `${c.pct}% complete — one more lesson keeps the streak alive.`;

    candidates.push({
      id:    `next_${c.id}`,
      type:  'next_lesson',
      score: clamp(score, 0, 100),
      title: nextLesson.title,
      subtitle: `${c.title} · ${nextLesson.moduleTitle}`,
      reason,
      urgency: 'low',
      estimatedMins: nextLesson.durationMins || estimateMins('next_lesson', 'low'),
      difficulty: 'mixed',
      action: { type: 'navigate', courseId: c.id, lessonId: String(nextLesson.id) },
      meta:   { pct: c.pct, courseTitle: c.title, topicDriven },
    });
  }

  // ── Phase H: Promote strong lesson matches for urgent topics ──────────────
  // A practice card says "you're weak at X" — if the catalogue has a lesson
  // that actually teaches X, that lesson deserves its own navigate card so the
  // lesson feed reflects need, not just course order.

  const promotedLessonIds = new Set(
    candidates.filter(c => c.action?.type === 'navigate').map(c => String(c.action.lessonId)),
  );

  const urgentPractice = candidates
    .filter(c => c.action?.type === 'practice' && c.score >= 35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  for (const parent of urgentPractice) {
    const matches = findLessonsForTopic(lessonIndex, parent.action.topic, parent.action.subject, { limit: 1, minScore: 5, formatAffinity: habitProfile.formatAffinity });
    const best = matches[0];
    if (!best || promotedLessonIds.has(best.lessonId)) continue;
    promotedLessonIds.add(best.lessonId);

    candidates.push({
      id:    `lesson_for_${parent.id}`,
      type:  'next_lesson',
      score: clamp(parent.score * 0.85, 0, 150),
      title: best.title,
      subtitle: `${best.courseTitle} · ${best.moduleTitle}`,
      reason: `Teaches "${parent.action.topic}" — ${parent.reason}`,
      urgency: parent.urgency,
      estimatedMins: best.durationMins || estimateMins('next_lesson', parent.urgency),
      difficulty: parent.difficulty,
      action: { type: 'navigate', courseId: best.courseId, lessonId: best.lessonId },
      meta:   { ...parent.meta, forTopic: parent.action.topic, matchScore: best.matchScore },
    });
  }

  // ── Attach content-matched lessons to every practice card ─────────────────
  // The Today tab shows these as "Lessons:" chips under each priority.

  for (const c of candidates) {
    if (c.action?.type !== 'practice') continue;
    c.lessons = findLessonsForTopic(lessonIndex, c.action.topic, c.action.subject, { limit: 3, formatAffinity: habitProfile.formatAffinity });
  }

  // ── Feedback reweighting (bounded bandit-lite) ────────────────────────────
  // If a card type has been shown ≥10 times, scale its score by observed
  // engagement: always-ignored types drift down 10%, acted-on types up to
  // +15%. Assessment cards are exempt — exam urgency must never be suppressed
  // by low engagement.
  const { engagement } = signals;
  for (const c of candidates) {
    if (c.type === 'urgent_prep') continue;
    const e = engagement.get(c.type);
    if (!e || e.shown < 10) continue;
    const rate = e.acted / e.shown;
    const multiplier = clamp(0.9 + rate * 0.5, 0.9, 1.15);
    c.score = clamp(c.score * multiplier, 0, 200);
    c.meta = { ...c.meta, engagementMultiplier: Math.round(multiplier * 100) / 100 };
  }

  return { candidates, assessmentContexts };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4: Rank + deduplicate + guarantee urgent assessment cards
// ─────────────────────────────────────────────────────────────────────────────

function rankAndSelect(candidates, assessmentContexts, limit) {
  candidates.sort((a, b) => b.score - a.score);

  const subjectCounts = new Map();
  const seen          = new Set();
  const results       = [];

  // Pass 1: guarantee ≥ 1 card per assessment ≤ 7 days away
  for (const ctx of assessmentContexts.filter(c => c.days != null && c.days <= 7)) {
    if (results.length >= limit) break;
    const card = candidates
      .filter(c => c._assessmentId === ctx.assessment.id && !seen.has(c.id))
      .sort((a, b) => b.score - a.score)[0];
    if (!card) continue;
    seen.add(card.id);
    results.push(card);
    const subKey = card.subtitle?.split('·')[0]?.trim() || card.type;
    subjectCounts.set(subKey, (subjectCounts.get(subKey) || 0) + 1);
  }

  // Pass 2: fill remaining with best non-duplicate, max 2 per subject
  for (const c of candidates) {
    if (results.length >= limit) break;
    if (seen.has(c.id)) continue;
    const subKey = c.subtitle?.split('·')[0]?.trim() || c.type;
    if ((subjectCounts.get(subKey) || 0) >= 2) continue;
    seen.add(c.id);
    results.push(c);
    subjectCounts.set(subKey, (subjectCounts.get(subKey) || 0) + 1);
  }

  // Strip internal fields, return clean cards
  return results.map(({ _assessmentId, ...card }) => card);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API: getRecommendations
// ─────────────────────────────────────────────────────────────────────────────

async function getRecommendations(userId, { limit = 6 } = {}) {
  try {
    const signals = await collectSignalsCached(userId);
    const { candidates, assessmentContexts } = await buildCandidates(signals);
    return rankAndSelect(candidates, assessmentContexts, limit);
  } catch (e) {
    console.error('[recommendations] getRecommendations error:', e.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-day runway — a plan across the days until the nearest assessment
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Turns "you need 2.3 points/day" into an actual schedule: front-load new
 * content while there's runway, taper into review-only for the final days
 * before the exam (cramming new content the night before doesn't stick).
 *
 * Returns null when there's no assessment 1–21 days out.
 */
function buildRunway(assessmentContexts, now) {
  const ctx = assessmentContexts
    .filter(c => c.days != null && c.days >= 1 && c.days <= 21)
    .sort((a, b) => a.days - b.days)[0];
  if (!ctx) return null;

  const daysLeft  = ctx.days;
  const uncovered = ctx.uncoveredSyllabus.length;

  // Final days are review-only: 2 review days if there's a week+, 1 if 3+.
  const reviewTail = daysLeft >= 7 ? 2 : daysLeft >= 3 ? 1 : 0;
  const contentDays = Math.max(1, daysLeft - reviewTail);
  const newPerDay   = Math.ceil(uncovered / contentDays);

  const days = [];
  let remainingNew = uncovered;
  const planDays = Math.min(daysLeft, 14);

  for (let i = 0; i < planDays; i++) {
    const date = new Date(now.getTime() + i * 86400000);
    const dateStr = date.toISOString().slice(0, 10);
    const daysToExam = daysLeft - i;

    if (daysToExam <= reviewTail) {
      days.push({
        date: dateStr, dayOffset: i, focus: 'review', newPoints: 0,
        note: daysToExam === 1
          ? 'Final review — past papers and weak-area drills only. No new content.'
          : 'Review day — consolidate everything covered, practise under time pressure.',
      });
    } else {
      const todayNew = Math.min(newPerDay, remainingNew);
      remainingNew  -= todayNew;
      days.push({
        date: dateStr, dayOffset: i,
        focus: todayNew > 2 ? 'new-content' : todayNew > 0 ? 'balanced' : 'review',
        newPoints: todayNew,
        note: todayNew > 0
          ? `Cover ${todayNew} new syllabus point${todayNew !== 1 ? 's' : ''}, then quiz what you covered.`
          : 'All content covered — rotate spaced review and practice questions.',
      });
    }
  }

  return {
    assessment: {
      subject: ctx.assessment.subject,
      title:   ctx.assessment.title,
      dueDate: ctx.assessment.dueDate,
      daysLeft,
    },
    uncoveredPoints: uncovered,
    newPointsPerDay: newPerDay,
    days,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API: getDailyPriorities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a time-budgeted daily focus list — the core of the Today tab.
 *
 * Output shape:
 * {
 *   tasks: [{ rank, type, title, subtitle, reason, urgency, estimatedMins,
 *             difficulty, action, meta }],
 *   totalEstimatedMins,
 *   budgetMins,
 *   assessmentAlert: string | null,   // e.g. "Physics exam in 3 days"
 *   coverageAlert: string | null,     // e.g. "Need to cover 2 new points/day"
 *   brainScore: number,               // overall mastery %
 *   generatedAt: ISO string,
 * }
 *
 * Called by GET /api/study/today and injected into the coach context.
 */
async function getDailyPriorities(userId, { budgetMins = 90 } = {}) {
  try {
    const signals = await collectSignalsCached(userId);
    const { candidates, assessmentContexts } = await buildCandidates(signals);

    // Build the prioritised task list, respecting time budget
    const ranked = rankAndSelect(candidates, assessmentContexts, 20);

    // ── Habit-aware sequencing ────────────────────────────────────────────
    // Score decides WHAT to study; habits decide the ORDER of the first task.
    //   - Cold start (3+ day gap) or outside their usual study hours →
    //     lead with the easiest short task as a warm-up ramp.
    //   - Inside their peak window → hardest task first, while focus is best.
    const { habitProfile } = signals;
    const coldStart = habitProfile.daysSinceLastStudy != null && habitProfile.daysSinceLastStudy >= 3;
    if (ranked.length > 1) {
      const diffRank = { easy: 0, mixed: 1, hard: 2 };
      if (coldStart || !habitProfile.inPeakWindow) {
        // Move the easiest, shortest of the top 4 tasks to the front
        const topSlice = ranked.slice(0, 4);
        const easiest = [...topSlice].sort((a, b) =>
          (diffRank[a.difficulty] ?? 1) - (diffRank[b.difficulty] ?? 1) ||
          (a.estimatedMins || 20) - (b.estimatedMins || 20),
        )[0];
        const idx = ranked.indexOf(easiest);
        if (idx > 0) { ranked.splice(idx, 1); ranked.unshift(easiest); }
      } else {
        // Peak focus: put the hardest of the top 3 first
        const topSlice = ranked.slice(0, 3);
        const hardest = [...topSlice].sort((a, b) =>
          (diffRank[b.difficulty] ?? 1) - (diffRank[a.difficulty] ?? 1) ||
          b.score - a.score,
        )[0];
        const idx = ranked.indexOf(hardest);
        if (idx > 0) { ranked.splice(idx, 1); ranked.unshift(hardest); }
      }
    }

    // Size tasks to the student's real attention span: no single task longer
    // than ~1.2× their median session (floored at 15 min so tasks stay real).
    const attentionCap = habitProfile.medianSessionMins
      ? Math.max(15, Math.round(habitProfile.medianSessionMins * 1.2))
      : null;

    const tasks   = [];
    let   usedMins = 0;

    for (const rec of ranked) {
      if (usedMins >= budgetMins || tasks.length >= 6) break;
      const mins = attentionCap
        ? Math.min(rec.estimatedMins || 20, attentionCap)
        : (rec.estimatedMins || 20);
      tasks.push({ rank: tasks.length + 1, ...rec, estimatedMins: mins });
      usedMins += mins;
    }

    // Assessment alert (nearest ≤ 14 days)
    const nearest = assessmentContexts
      .filter(c => c.days != null && c.days >= 0 && c.days <= 14)
      .sort((a, b) => a.days - b.days)[0];

    const assessmentAlert = nearest
      ? nearest.days === 0
        ? `${nearest.assessment.subject} exam is TODAY.`
        : `${nearest.assessment.subject} ${nearest.assessment.taskType || 'exam'} in ${nearest.days} day${nearest.days !== 1 ? 's' : ''}.`
      : null;

    // Coverage alert (critical or behind)
    const critCtx = assessmentContexts.find(c => c.velocityStatus === 'critical');
    const behCtx  = assessmentContexts.find(c => c.velocityStatus === 'behind');
    const coverageAlert = critCtx
      ? `Pace alert: you need to cover ${critCtx.pointsPerDay.toFixed(1)} new ${critCtx.assessment.subject} syllabus points per day before ${critCtx.assessment.title}.`
      : behCtx
      ? `Coverage is tight for ${behCtx.assessment.subject} — balance new content with review.`
      : null;

    // Overall brain score
    const { atoms } = signals;
    const brainScore = atoms.length
      ? Math.round(atoms.reduce((s, a) => s + a.masteryLevel, 0) / atoms.length)
      : 0;

    return {
      tasks,
      totalEstimatedMins: usedMins,
      budgetMins,
      assessmentAlert,
      coverageAlert,
      brainScore,
      habits: {
        medianSessionMins:  habitProfile.medianSessionMins,
        peakHours:          [...habitProfile.peakHours].sort((a, b) => a - b),
        inPeakWindow:       habitProfile.inPeakWindow,
        daysSinceLastStudy: habitProfile.daysSinceLastStudy,
        sequencing:         coldStart || !habitProfile.inPeakWindow ? 'warmup-first' : 'hardest-first',
      },
      runway: buildRunway(assessmentContexts, signals.now),
      generatedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.error('[recommendations] getDailyPriorities error:', e.message);
    return { tasks: [], totalEstimatedMins: 0, budgetMins, assessmentAlert: null, coverageAlert: null, brainScore: 0, generatedAt: new Date().toISOString() };
  }
}

module.exports = {
  getRecommendations,
  getDailyPriorities,
  // exposed for tests + the offline eval harness (scripts/eval-recommendations.js)
  _internals: {
    buildLessonIndex, findLessonsForTopic, tokenize, stem, estimateRetention, computeStability,
    buildAccuracyProfile, buildHabitProfile, difficultyHint, pointAccuracy,
    buildModuleReadiness, prereqsSatisfied, buildSessionContext, buildRunway,
    buildCandidates, rankAndSelect, _semantic,
  },
};
