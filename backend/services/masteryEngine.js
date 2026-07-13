const DAY_MS = 24 * 60 * 60 * 1000;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function asDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function evidenceReliability(item) {
  const method = String(item.markingMethod || '').toLowerCase();
  const assessment = String(item.assessmentType || '').toLowerCase();
  const difficulty = String(item.difficulty || '').toLowerCase();
  let weight = method === 'human' ? 1.25 : method === 'deterministic' ? 1.1 : method === 'heuristic' ? 0.2 : 0.9;
  if (item.metadata?.confidence === 'low') weight -= 0.35;
  if (assessment.includes('diagnostic') || assessment.includes('exam')) weight += 0.15;
  if (difficulty.includes('transfer') || item.metadata?.transfer === true) weight += 0.2;
  return clamp(weight, 0.15, 1.6);
}

function isVerifiedEvidence(item) {
  return ['human', 'deterministic'].includes(String(item.markingMethod || '').toLowerCase());
}

/**
 * Explainable, deterministic mastery estimate. It deliberately favours recent,
 * independently demonstrated evidence without hiding product decisions inside
 * an opaque model that cannot yet be validated against enough learner data.
 */
function calculateMastery(evidence = [], now = new Date()) {
  const valid = evidence
    .filter((item) => Number(item.maxScore) > 0 && asDate(item.occurredAt || item.createdAt))
    .sort((a, b) => asDate(a.occurredAt || a.createdAt) - asDate(b.occurredAt || b.createdAt));

  if (!valid.length) {
    return {
      probability: 0.2,
      evidenceCount: 0,
      lastDemonstratedAt: null,
      retentionStrength: 0,
      confidence: 'low',
      misconceptions: [],
      nextReviewAt: now,
      mastered: false,
      distinctDays: 0,
    };
  }

  let weightedScore = 0.4; // two low-confidence prior observations at 20%
  let totalWeight = 2;
  const dayKeys = new Set();
  const verifiedDayKeys = new Set();
  const misconceptionCounts = new Map();
  let verifiedTransferSuccess = false;
  let verifiedEvidenceCount = 0;
  let lastDemonstratedAt = null;

  for (const item of valid) {
    const occurredAt = asDate(item.occurredAt || item.createdAt);
    const ageDays = Math.max(0, (now - occurredAt) / DAY_MS);
    const recency = Math.pow(0.5, ageDays / 45);
    const reliability = evidenceReliability(item);
    const weight = Math.max(0.15, recency * reliability);
    const normalized = clamp(
      Number.isFinite(Number(item.normalizedScore))
        ? Number(item.normalizedScore)
        : Number(item.score) / Number(item.maxScore),
    );
    weightedScore += normalized * weight;
    totalWeight += weight;
    dayKeys.add(occurredAt.toISOString().slice(0, 10));
    const verified = isVerifiedEvidence(item);
    if (verified) {
      verifiedEvidenceCount += 1;
      verifiedDayKeys.add(occurredAt.toISOString().slice(0, 10));
    }
    if (!lastDemonstratedAt || occurredAt > lastDemonstratedAt) lastDemonstratedAt = occurredAt;
    if (verified && normalized >= 0.75 && (item.metadata?.transfer === true || String(item.difficulty).toLowerCase().includes('transfer'))) {
      verifiedTransferSuccess = true;
    }
    const codes = Array.isArray(item.misconceptionCodes) ? item.misconceptionCodes : [];
    for (const code of codes) misconceptionCounts.set(code, (misconceptionCounts.get(code) || 0) + 1);
  }

  const probability = Number(clamp(weightedScore / totalWeight).toFixed(4));
  const distinctDays = dayKeys.size;
  const verifiedDistinctDays = verifiedDayKeys.size;
  const evidenceCount = valid.length;
  const confidence = verifiedEvidenceCount >= 5 && verifiedDistinctDays >= 3
    ? 'high'
    : verifiedEvidenceCount >= 2 && verifiedDistinctDays >= 2 ? 'medium' : 'low';
  const retentionStrength = Number(clamp(
    (Math.min(verifiedDistinctDays, 5) / 5) * 0.45
      + (Math.min(verifiedEvidenceCount, 8) / 8) * 0.25
      + probability * 0.3,
  ).toFixed(4));
  const mastered = probability >= 0.8 && verifiedDistinctDays >= 2 && verifiedTransferSuccess;
  const intervalDays = mastered ? 14 : probability >= 0.7 ? 7 : probability >= 0.5 ? 3 : 1;
  const nextReviewAt = new Date((lastDemonstratedAt || now).getTime() + intervalDays * DAY_MS);
  const misconceptions = [...misconceptionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([code, count]) => ({ code, count }));

  return {
    probability,
    evidenceCount,
    lastDemonstratedAt,
    retentionStrength,
    confidence,
    misconceptions,
    nextReviewAt,
    mastered,
    distinctDays,
    verifiedDistinctDays,
    verifiedEvidenceCount,
  };
}

async function refreshMastery(userId, outcomeId, options = {}) {
  const { LearningEvidence, MasteryState } = require('../models');
  const evidence = await LearningEvidence.findAll({
    where: { userId, outcomeId },
    order: [['occurredAt', 'ASC']],
    transaction: options.transaction,
  });
  const rows = evidence.map((item) => item.toJSON ? item.toJSON() : item);
  const supersededIds = new Set(rows.filter((item) => item.revisionOfId).map((item) => String(item.revisionOfId)));
  const current = rows.filter((item) => !supersededIds.has(String(item.id)));
  const result = calculateMastery(current, options.now || new Date());
  const values = {
    userId,
    outcomeId,
    probability: result.probability,
    evidenceCount: result.evidenceCount,
    lastDemonstratedAt: result.lastDemonstratedAt,
    retentionStrength: result.retentionStrength,
    confidence: result.confidence,
    misconceptions: result.misconceptions,
    nextReviewAt: result.nextReviewAt,
    version: 1,
    metadata: {
      mastered: result.mastered,
      distinctDays: result.distinctDays,
      verifiedDistinctDays: result.verifiedDistinctDays,
      verifiedEvidenceCount: result.verifiedEvidenceCount,
      calculatedAt: (options.now || new Date()).toISOString(),
      algorithm: 'explainable-v1',
    },
  };
  const [state, created] = await MasteryState.findOrCreate({
    where: { userId, outcomeId },
    defaults: values,
    transaction: options.transaction,
  });
  if (!created) await state.update({ ...values, version: Number(state.version || 0) + 1 }, { transaction: options.transaction });
  return state;
}

async function refreshMasteryForEvidence(evidence, options = {}) {
  return refreshMastery(evidence.userId, evidence.outcomeId, options);
}

module.exports = {
  DAY_MS,
  calculateMastery,
  evidenceReliability,
  isVerifiedEvidence,
  refreshMastery,
  refreshMasteryForEvidence,
};
