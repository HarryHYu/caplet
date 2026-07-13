const { Op } = require('sequelize');
const { refreshMastery } = require('./masteryEngine');

function asPlain(value) { return value?.toJSON ? value.toJSON() : value; }

async function outcomeIdsForContent(contentType, contentId, fallbackCodes = []) {
  const { ContentOutcome, CurriculumOutcome } = require('../models');
  const mappings = await ContentOutcome.findAll({ where: { contentType, contentId: String(contentId) } });
  if (mappings.length) return [...new Set(mappings.map((row) => row.outcomeId))];
  if (!fallbackCodes.length) return [];
  const outcomes = await CurriculumOutcome.findAll({ where: { code: { [Op.in]: fallbackCodes }, isActive: true } });
  return outcomes.map((outcome) => outcome.id);
}

async function outcomeIdsForQuestionSource(sourceKey) {
  const { Question, QuestionOutcome } = require('../models');
  if (!sourceKey) return { question: null, outcomeIds: [] };
  const question = await Question.findOne({ where: { sourceKey } });
  if (!question) return { question: null, outcomeIds: [] };
  const mappings = await QuestionOutcome.findAll({ where: { questionId: question.id } });
  return { question, outcomeIds: mappings.map((mapping) => mapping.outcomeId) };
}

async function recordEvidenceForOutcomes(input, options = {}) {
  const { LearningEvidence, sequelize } = require('../models');
  const outcomeIds = [...new Set((input.outcomeIds || []).filter(Boolean).map(String))];
  if (!outcomeIds.length) return [];
  const execute = async (transaction) => {
    const results = [];
    for (const outcomeId of outcomeIds) {
      const idempotencyKey = `${input.idempotencyKey}:${outcomeId}`.slice(0, 255);
      const [evidence, created] = await LearningEvidence.findOrCreate({
        where: { idempotencyKey },
        defaults: {
          idempotencyKey,
          userId: input.userId,
          outcomeId,
          questionId: input.questionId || null,
          sourceType: input.sourceType,
          sourceId: String(input.sourceId),
          attemptNumber: Math.max(1, Number(input.attemptNumber || 1)),
          score: Number(input.score || 0),
          maxScore: Math.max(1, Number(input.maxScore || 1)),
          normalizedScore: Math.max(0, Math.min(1, Number(input.score || 0) / Math.max(1, Number(input.maxScore || 1)))),
          assessmentType: input.assessmentType || input.sourceType,
          difficulty: input.difficulty || 'core',
          timeTakenSeconds: Math.max(0, Number(input.timeTakenSeconds || 0)),
          markingMethod: input.markingMethod || 'deterministic',
          misconceptionCodes: input.misconceptionCodes || [],
          feedback: input.feedback || {},
          contentVersion: String(input.contentVersion || 1),
          occurredAt: input.occurredAt || new Date(),
          revisionOfId: input.revisionOfId || null,
          metadata: input.metadata || {},
        },
        transaction,
      });
      const mastery = await refreshMastery(input.userId, outcomeId, { transaction });
      results.push({ evidence: asPlain(evidence), mastery: asPlain(mastery), created });
    }
    return results;
  };
  if (options.transaction) return execute(options.transaction);
  return sequelize.transaction(execute);
}

async function recordLessonScoreEvidence({ userId, lesson, score, answers, occurredAt = new Date() }) {
  const metadata = lesson.metadata || {};
  const fallbackCodes = Array.isArray(metadata.outcomeCodes) ? metadata.outcomeCodes : Array.isArray(metadata.outcomes) ? metadata.outcomes : [];
  const outcomeIds = await outcomeIdsForContent('lesson', lesson.id, fallbackCodes);
  if (!outcomeIds.length) return [];
  return recordEvidenceForOutcomes({
    idempotencyKey: `lesson:${userId}:${lesson.id}:${occurredAt.toISOString()}`,
    userId,
    outcomeIds,
    sourceType: 'lesson_score',
    sourceId: lesson.id,
    score,
    maxScore: 100,
    assessmentType: 'lesson_quiz',
    difficulty: metadata.difficulty || 'core',
    markingMethod: 'deterministic',
    feedback: { answers },
    contentVersion: metadata.version || 1,
    occurredAt,
  });
}

async function recordMarkedAttemptEvidence({ attempt, sourceKey, assessmentType = 'written_practice', metadata = {} }) {
  const { question, outcomeIds } = await outcomeIdsForQuestionSource(sourceKey);
  if (!outcomeIds.length) return [];
  return recordEvidenceForOutcomes({
    idempotencyKey: `marked-attempt:${attempt.id}`,
    userId: attempt.userId,
    outcomeIds,
    questionId: question.id,
    sourceType: 'marked_attempt',
    sourceId: attempt.id,
    score: attempt.estimatedMark,
    maxScore: attempt.markValue,
    assessmentType,
    difficulty: question.difficulty || 'exam',
    markingMethod: attempt.markingConfidence === 'low' ? 'ai_low_confidence' : 'ai',
    misconceptionCodes: (attempt.gaps || []).map((_, index) => `written-gap-${index + 1}`),
    feedback: {
      strengths: attempt.strengths,
      gaps: attempt.gaps,
      terminology: attempt.terminology,
      modelAnswer: attempt.modelAnswer,
      nextRecommendation: attempt.nextRecommendation,
    },
    contentVersion: question.version || 1,
    occurredAt: attempt.createdAt || new Date(),
    metadata: { ...metadata, confidence: attempt.markingConfidence || 'medium', promptVersion: attempt.promptVersion, modelVersion: attempt.modelVersion },
  });
}

module.exports = {
  outcomeIdsForContent,
  outcomeIdsForQuestionSource,
  recordEvidenceForOutcomes,
  recordLessonScoreEvidence,
  recordMarkedAttemptEvidence,
};
