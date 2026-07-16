const { Op } = require('sequelize');

function scoreCandidate(state, now = new Date()) {
  const probability = Number(state.probability || 0.2);
  const retention = Number(state.retentionStrength || 0);
  const dueAt = state.nextReviewAt ? new Date(state.nextReviewAt) : now;
  const overdueDays = Math.max(0, (now - dueAt) / (24 * 60 * 60 * 1000));
  const weakScore = (1 - probability) * 60;
  const overdueScore = Math.min(25, overdueDays * 4);
  const lowRetentionScore = (1 - retention) * 10;
  const lowConfidenceScore = state.confidence === 'low' ? 5 : state.confidence === 'medium' ? 2 : 0;
  return Number((weakScore + overdueScore + lowRetentionScore + lowConfidenceScore).toFixed(2));
}

function reasonFor(state, now = new Date()) {
  if (state.nextReviewAt && new Date(state.nextReviewAt) <= now) {
    return { reasonCode: 'review_due', reason: 'This outcome is due for retrieval practice.' };
  }
  if (Number(state.probability || 0) < 0.5) {
    return { reasonCode: 'weak_outcome', reason: 'Your recent evidence shows this outcome needs reinforcement.' };
  }
  if (state.confidence === 'low') {
    return { reasonCode: 'more_evidence_needed', reason: 'Caplet needs another attempt to estimate this outcome confidently.' };
  }
  return { reasonCode: 'retain_mastery', reason: 'A short practice set will help make this learning durable.' };
}

function diagnosticRecommendation(subject) {
  return {
    type: 'practice',
    mode: 'diagnostic',
    reasonCode: 'diagnostic_needed',
    reason: 'Complete a short diagnostic so Caplet can personalise your learning.',
    subject,
    outcome: null,
    resourcePath: `/practice?subject=${encodeURIComponent(subject)}&mode=diagnostic`,
    estimatedMinutes: 10,
    score: 100,
  };
}

async function getNextRecommendation(userId, subject = 'economics', options = {}) {
  const { CurriculumOutcome, MasteryState, QuestionOutcome, Question } = require('../models');
  const outcomes = await CurriculumOutcome.findAll({
    where: { subject, isActive: true },
    order: [['sortOrder', 'ASC'], ['code', 'ASC']],
  });
  if (!outcomes.length) return null;

  const outcomeIds = outcomes.map((outcome) => outcome.id);
  const states = await MasteryState.findAll({ where: { userId, outcomeId: { [Op.in]: outcomeIds } } });
  if (!states.length) return diagnosticRecommendation(subject);

  const stateByOutcome = new Map(states.map((state) => [String(state.outcomeId), state]));
  const now = options.now || new Date();
  const candidates = outcomes
    .filter((outcome) => stateByOutcome.has(String(outcome.id)))
    .map((outcome) => {
      const state = stateByOutcome.get(String(outcome.id));
      return { outcome, state, score: scoreCandidate(state, now) };
    })
    .sort((a, b) => b.score - a.score || String(a.outcome.code).localeCompare(String(b.outcome.code)));

  for (const candidate of candidates) {
    const mapped = await QuestionOutcome.findAll({ where: { outcomeId: candidate.outcome.id }, attributes: ['questionId'] });
    if (!mapped.length) continue;
    const available = await Question.count({
      where: {
        id: { [Op.in]: mapped.map((row) => row.questionId) },
        lifecycleStatus: 'published',
      },
    });
    if (!available) continue;
    const reason = reasonFor(candidate.state, now);
    const mode = reason.reasonCode === 'review_due' ? 'due-review' : 'weak-topic';
    return {
      type: 'practice',
      mode,
      ...reason,
      subject,
      outcome: {
        id: candidate.outcome.id,
        code: candidate.outcome.code,
        title: candidate.outcome.title,
      },
      resourcePath: `/practice?mode=${mode}&outcomeId=${encodeURIComponent(candidate.outcome.id)}`,
      estimatedMinutes: 10,
      score: candidate.score,
    };
  }

  return diagnosticRecommendation(subject);
}

module.exports = { diagnosticRecommendation, getNextRecommendation, reasonFor, scoreCandidate };
