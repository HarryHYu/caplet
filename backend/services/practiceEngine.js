const { Op } = require('sequelize');
const { ensureEconomicsQuestionBank } = require('./questionBankService');
const { refreshMastery } = require('./masteryEngine');
const { getNextRecommendation } = require('./recommendationEngine');

const MODES = new Set(['diagnostic', 'daily', 'weak-topic', 'timed-exam', 'due-review', 'assigned']);
const PRACTICE_AI_WINDOW_MS = 15 * 60 * 1000;
const PRACTICE_AI_LIMIT = 20;
const practiceAIUsage = new Map();
const MODE_LIMITS = { diagnostic: 10, daily: 5, 'weak-topic': 5, 'timed-exam': 10, 'due-review': 5, assigned: 10 };

const asPlain = (value) => value?.toJSON ? value.toJSON() : value;

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Resolve assigned practice exclusively from trusted classroom records. Client
 * supplied question/class IDs are never accepted as authority.
 */
async function resolveAssignedPractice(userId, assignmentId = null) {
  const {
    Assignment,
    AssignmentSubmission,
    ClassMembership,
    OutcomeAssignmentConfig,
  } = require('../models');
  const memberships = await ClassMembership.findAll({
    where: { userId, role: 'student' },
    attributes: ['classroomId'],
  });
  const classroomIds = [...new Set(memberships.map((row) => String(row.classroomId)))];
  if (!classroomIds.length) {
    const error = new Error('No assigned practice is ready for this account.');
    error.status = 404;
    throw error;
  }
  const where = { classroomId: { [Op.in]: classroomIds } };
  if (assignmentId) where.id = assignmentId;
  const assignments = await Assignment.findAll({
    where,
    order: [['dueDate', 'ASC'], ['createdAt', 'ASC']],
  });
  if (!assignments.length) {
    const error = new Error('No assigned practice is ready for this account.');
    error.status = 404;
    throw error;
  }
  const assignmentIds = assignments.map((assignment) => assignment.id);
  const [submissions, configs] = await Promise.all([
    AssignmentSubmission.findAll({
      where: { assignmentId: { [Op.in]: assignmentIds }, studentId: userId, status: 'assigned' },
    }),
    OutcomeAssignmentConfig.findAll({ where: { assignmentId: { [Op.in]: assignmentIds } } }),
  ]);
  const submissionIds = new Set(submissions.map((row) => String(row.assignmentId)));
  const configByAssignment = new Map(configs.map((row) => [String(row.assignmentId), row]));
  const assignment = assignments.find((candidate) => {
    const id = String(candidate.id);
    const config = configByAssignment.get(id);
    if (!submissionIds.has(id) || !config) return false;
    const targets = asArray(config.targetStudentIds).map(String);
    return !targets.length || targets.includes(String(userId));
  });
  if (!assignment) {
    const error = new Error('No incomplete assigned practice is ready for this account.');
    error.status = 404;
    throw error;
  }
  const config = configByAssignment.get(String(assignment.id));
  return {
    assignment,
    config,
    assignmentId: assignment.id,
    classroomId: assignment.classroomId,
    outcomeIds: asArray(config.outcomeIds),
    questionIds: asArray(config.questionIds),
  };
}

function normaliseAnswerKey(answerKey) {
  if (answerKey == null) return null;
  if (typeof answerKey === 'string') {
    try { return JSON.parse(answerKey); } catch { return answerKey; }
  }
  return answerKey;
}

function publicQuestion(question, outcomes = []) {
  const plain = asPlain(question);
  return {
    id: plain.id,
    prompt: plain.prompt,
    responseType: plain.responseType,
    difficulty: plain.difficulty,
    marks: Number(plain.marks || 1),
    expectedMinutes: Number(plain.expectedMinutes || 2),
    commandVerb: plain.commandVerb || null,
    options: Array.isArray(plain.options) ? plain.options : [],
    outcomes: outcomes.map((outcome) => ({ id: outcome.id, code: outcome.code, title: outcome.title })),
  };
}

async function questionOutcomeMap(questionIds) {
  const { CurriculumOutcome, QuestionOutcome } = require('../models');
  const rows = await QuestionOutcome.findAll({ where: { questionId: { [Op.in]: questionIds } } });
  const outcomeIds = [...new Set(rows.map((row) => String(row.outcomeId)))];
  const outcomes = outcomeIds.length ? await CurriculumOutcome.findAll({ where: { id: { [Op.in]: outcomeIds } } }) : [];
  const byId = new Map(outcomes.map((outcome) => [String(outcome.id), asPlain(outcome)]));
  const map = new Map();
  for (const row of rows) {
    const list = map.get(String(row.questionId)) || [];
    const outcome = byId.get(String(row.outcomeId));
    if (outcome) list.push(outcome);
    map.set(String(row.questionId), list);
  }
  return map;
}

async function selectQuestions({ userId, subject = 'economics', mode = 'daily', outcomeId, questionIds = [] }) {
  const { MasteryState, Question, QuestionOutcome } = require('../models');
  if (subject === 'economics') await ensureEconomicsQuestionBank();
  const limit = MODE_LIMITS[mode] || 5;

  if (mode === 'assigned' && questionIds.length) {
    return Question.findAll({
      where: { id: { [Op.in]: questionIds }, lifecycleStatus: 'published' },
      order: [['sourceKey', 'ASC']],
      limit: Math.min(50, questionIds.length),
    });
  }

  let targetOutcomeIds = outcomeId ? [outcomeId] : [];
  if (!targetOutcomeIds.length && ['weak-topic', 'due-review'].includes(mode)) {
    const states = await MasteryState.findAll({
      where: { userId },
      order: mode === 'due-review'
        ? [['nextReviewAt', 'ASC'], ['probability', 'ASC']]
        : [['probability', 'ASC'], ['evidenceCount', 'ASC']],
      limit: 5,
    });
    targetOutcomeIds = states.map((state) => state.outcomeId);
  }

  let mappedIds = [];
  if (targetOutcomeIds.length) {
    const rows = await QuestionOutcome.findAll({
      where: { outcomeId: { [Op.in]: targetOutcomeIds } },
      attributes: ['questionId'],
    });
    mappedIds = [...new Set(rows.map((row) => row.questionId))];
  }

  const where = {
    subject,
    lifecycleStatus: 'published',
  };
  if (mappedIds.length) where.id = { [Op.in]: mappedIds };
  if (mode === 'timed-exam') where.difficulty = { [Op.in]: ['exam', 'hsc style', 'exam practice', 'external sector'] };

  const pool = await Question.findAll({ where, order: [['sourceKey', 'ASC']], limit: Math.max(limit * 8, 40) });
  if (mode !== 'diagnostic') return pool.slice(0, limit);

  // A diagnostic covers distinct outcomes before repeating any one outcome.
  const map = await questionOutcomeMap(pool.map((question) => question.id));
  const chosen = [];
  const usedOutcomes = new Set();
  for (const question of pool) {
    const outcomes = map.get(String(question.id)) || [];
    const fresh = outcomes.find((outcome) => !usedOutcomes.has(String(outcome.id)));
    if (!fresh) continue;
    chosen.push(question);
    usedOutcomes.add(String(fresh.id));
    if (chosen.length >= limit) break;
  }
  if (chosen.length < limit) {
    for (const question of pool) {
      if (!chosen.some((item) => String(item.id) === String(question.id))) chosen.push(question);
      if (chosen.length >= limit) break;
    }
  }
  return chosen;
}

async function serialiseSession(session, options = {}) {
  const { Question } = require('../models');
  const plain = asPlain(session);
  const questionIds = Array.isArray(plain.questionIds) ? plain.questionIds : [];
  const questions = questionIds.length ? await Question.findAll({ where: { id: { [Op.in]: questionIds } } }) : [];
  const byId = new Map(questions.map((question) => [String(question.id), question]));
  const ordered = questionIds.map((id) => byId.get(String(id))).filter(Boolean);
  const outcomes = await questionOutcomeMap(questionIds);
  const publicQuestions = ordered.map((question) => publicQuestion(question, outcomes.get(String(question.id)) || []));
  const currentIndex = Number(plain.currentIndex || 0);
  return {
    id: plain.id,
    mode: plain.mode,
    status: plain.status,
    subject: plain.subject,
    currentIndex,
    totalQuestions: publicQuestions.length,
    score: Number(plain.score || 0),
    maxScore: Number(plain.maxScore || 0),
    questions: options.includeAll === false ? undefined : publicQuestions,
    currentQuestion: publicQuestions[currentIndex] || null,
    answers: plain.config?.answers || [],
    completedAt: plain.completedAt || null,
    expiresAt: plain.expiresAt || null,
    startedAt: plain.startedAt || plain.createdAt,
    assignmentId: plain.assignmentId || null,
    classroomId: plain.classroomId || null,
    primaryOutcomeId: plain.primaryOutcomeId || null,
    config: {
      outcomeId: plain.config?.outcomeId || null,
      timeLimitMinutes: plain.config?.timeLimitMinutes || null,
      recommendationReason: plain.config?.recommendationReason || null,
      assignmentTitle: plain.config?.assignmentTitle || null,
      assignmentMode: plain.config?.assignmentMode || null,
    },
  };
}

async function createPracticeSession(userId, input = {}) {
  const { PracticeSession } = require('../models');
  const subject = String(input.subject || 'economics').toLowerCase();
  const mode = MODES.has(input.mode) ? input.mode : 'daily';
  const assigned = mode === 'assigned'
    ? await resolveAssignedPractice(userId, input.assignmentId || null)
    : null;
  const outcomeId = assigned?.outcomeIds?.[0] || input.outcomeId || null;
  const questions = await selectQuestions({
    userId,
    subject,
    mode,
    outcomeId,
    questionIds: assigned?.questionIds || [],
  });
  if (!questions.length) {
    const error = new Error('No published questions are available for this practice mode.');
    error.status = 404;
    throw error;
  }
  const session = await PracticeSession.create({
    userId,
    subject,
    mode,
    status: 'in_progress',
    questionIds: questions.map((question) => question.id),
    currentIndex: 0,
    score: 0,
    maxScore: questions.reduce((sum, question) => sum + Number(question.marks || 1), 0),
    config: {
      outcomeId,
      answers: [],
      timeLimitMinutes: mode === 'timed-exam' ? Number(input.timeLimitMinutes || 40) : null,
      recommendationReason: input.recommendationReason || null,
      assignmentTitle: assigned?.assignment?.title || null,
      assignmentMode: assigned?.config?.mode || null,
    },
    primaryOutcomeId: outcomeId,
    classroomId: assigned?.classroomId || null,
    assignmentId: assigned?.assignmentId || null,
    startedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  const { recordProductEvent } = require('./productEvents');
  await recordProductEvent({
    idempotencyKey: `practice-started:${session.id}`,
    type: 'practice_started',
    userId,
    practiceSessionId: session.id,
    classroomId: session.classroomId,
    outcomeId,
    feature: `practice:${mode}`,
    entityType: 'practice_session',
    entityId: session.id,
    metadata: { mode, subject, questionCount: questions.length, assignmentId: session.assignmentId || null },
  });
  return serialiseSession(session);
}

function multipleChoiceResult(question, answer) {
  const key = normaliseAnswerKey(question.answerKey);
  const options = Array.isArray(question.options) ? question.options : [];
  const submitted = typeof answer === 'object' && answer !== null
    ? answer.value ?? answer.index ?? answer.letter
    : answer;
  const expectedValues = [key?.value, key?.index, key?.letter, key].filter((value) => value !== undefined && value !== null);
  const correct = expectedValues.some((expected) => String(expected).trim().toLowerCase() === String(submitted).trim().toLowerCase())
    || (Number.isInteger(Number(submitted)) && key?.index === Number(submitted))
    || options.findIndex((value) => String(value) === String(submitted)) === key?.index;
  return { correct, score: correct ? Number(question.marks || 1) : 0 };
}

function writtenFallback(question, answer) {
  const text = String(answer || '').trim();
  const model = String(question.modelAnswer || '');
  const rubric = Array.isArray(question.rubric) ? question.rubric.join(' ') : String(question.rubric || '');
  const meaningful = (value) => new Set(value.toLowerCase().match(/[a-z][a-z-]{3,}/g) || []);
  const target = meaningful(`${model} ${rubric}`);
  const supplied = meaningful(text);
  const overlap = target.size ? [...target].filter((word) => supplied.has(word)).length / Math.min(target.size, 20) : 0;
  const lengthFactor = Math.min(1, text.split(/\s+/).filter(Boolean).length / Math.max(20, Number(question.marks || 1) * 12));
  const normalized = Math.min(0.85, overlap * 0.65 + lengthFactor * 0.35);
  const score = Math.round(normalized * Number(question.marks || 1));
  return {
    score,
    correct: normalized >= 0.7,
    confidence: 'low',
    strengths: text ? ['You made a genuine attempt and used some relevant economic language.'] : [],
    gaps: ['Automated fallback feedback is approximate; compare your answer with the model and rubric.'],
    terminology: [],
    modelAnswer: model,
    nextRecommendation: 'Add a clear cause-and-effect chain and link it directly to the command verb.',
    markingMethod: 'heuristic',
  };
}

function practiceAIQuotaAllows(userId, now = Date.now()) {
  if (!userId) return false;
  const recent = (practiceAIUsage.get(userId) || []).filter((timestamp) => now - timestamp < PRACTICE_AI_WINDOW_MS);
  if (recent.length >= PRACTICE_AI_LIMIT) {
    practiceAIUsage.set(userId, recent);
    return false;
  }
  recent.push(now);
  practiceAIUsage.set(userId, recent);
  return true;
}

async function evaluateQuestion(question, answer, { allowAI = false, userId = null } = {}) {
  if (question.responseType === 'multiple_choice') {
    const result = multipleChoiceResult(question, answer);
    return {
      ...result,
      confidence: 'high',
      strengths: result.correct ? ['You selected the correct response.'] : [],
      gaps: result.correct ? [] : ['Revisit the economic relationship tested by this question.'],
      terminology: [],
      modelAnswer: String(question.explanation || question.modelAnswer || ''),
      nextRecommendation: result.correct ? 'Try a related question at a higher level.' : 'Read the explanation, then retry this outcome.',
      markingMethod: 'deterministic',
    };
  }

  if (allowAI && process.env.OPENAI_API_KEY && question.subject === 'economics'
    && String(answer || '').trim().length >= 15 && practiceAIQuotaAllows(userId)) {
    try {
      const { markEconomicsAnswer } = require('./economicsMarker');
      const result = await markEconomicsAnswer({
        question: question.prompt,
        markValue: question.marks,
        responseType: ['short_answer', 'stimulus_response', 'extended_response'].includes(question.responseType)
          ? question.responseType
          : 'short_answer',
        studentAnswer: answer,
        focusArea: question.source?.focusTitle || question.metadata?.focusArea,
      });
      return { ...result, score: result.estimatedMark, correct: result.estimatedMark / question.marks >= 0.7, confidence: 'medium', markingMethod: 'ai' };
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') console.warn('Practice AI marking failed; using safe fallback:', error.message);
    }
  }
  return writtenFallback(question, answer);
}

function misconceptionCodes(question, evaluation) {
  if (evaluation.correct) return [];
  const configured = Array.isArray(question.misconceptions) ? question.misconceptions : [];
  if (configured.length) {
    return configured.slice(0, 3).map((item) => typeof item === 'string' ? item : item.code || item.label).filter(Boolean);
  }
  return [`${question.commandVerb || 'concept'}-needs-review`];
}

async function answerPracticeQuestion(userId, sessionId, input = {}, { allowAI = false } = {}) {
  const { LearningEvidence, PracticeSession, Question, QuestionOutcome, sequelize } = require('../models');
  const session = await PracticeSession.findOne({ where: { id: sessionId, userId } });
  if (!session) { const error = new Error('Practice session not found.'); error.status = 404; throw error; }
  if (session.status !== 'in_progress') { const error = new Error('This practice session is already complete.'); error.status = 409; throw error; }

  const questionIds = Array.isArray(session.questionIds) ? session.questionIds : [];
  const questionId = input.questionId || questionIds[Number(session.currentIndex || 0)];
  const currentIndex = Number(session.currentIndex || 0);
  const isRetry = input.retry === true && currentIndex > 0 && String(questionIds[currentIndex - 1]) === String(questionId);
  if (!isRetry && String(questionIds[currentIndex]) !== String(questionId)) {
    const error = new Error('Answer the current question before moving on.'); error.status = 409; throw error;
  }
  const question = await Question.findByPk(questionId);
  if (!question) { const error = new Error('Question not found.'); error.status = 404; throw error; }

  const config = session.config || {};
  const answers = Array.isArray(config.answers) ? config.answers : [];
  const clientKey = String(input.idempotencyKey || `${sessionId}:${questionId}:${answers.length + 1}`).slice(0, 200);
  const existingAnswer = answers.find((item) => item.idempotencyKey === clientKey);
  if (existingAnswer) {
    return { ...existingAnswer.result, session: await serialiseSession(session) };
  }

  const evaluation = await evaluateQuestion(asPlain(question), input.answer, { allowAI, userId });
  if (evaluation.markingMethod === 'ai') {
    try {
      const { recordAIInteraction } = require('./aiHistory');
      await recordAIInteraction({
        userId,
        feature: 'practice_feedback',
        modelVersion: evaluation.modelVersion,
        promptVersion: evaluation.promptVersion,
        status: 'completed',
        confidence: evaluation.confidence,
        inputSummary: question.prompt,
        outputSummary: `${evaluation.score}/${question.marks}: ${evaluation.nextRecommendation || ''}`,
        metadata: { sessionId, questionId, practiceOnly: true },
      });
    } catch (historyError) {
      console.error('Practice AI history error:', historyError.message);
    }
  }
  const mappings = await QuestionOutcome.findAll({ where: { questionId } });
  const codes = misconceptionCodes(asPlain(question), evaluation);
  const masteryUpdates = [];

  await sequelize.transaction(async (transaction) => {
    for (const mapping of mappings) {
      const evidenceKey = `${clientKey}:${mapping.outcomeId}`.slice(0, 255);
      await LearningEvidence.findOrCreate({
        where: { idempotencyKey: evidenceKey },
        defaults: {
          idempotencyKey: evidenceKey,
          userId,
          outcomeId: mapping.outcomeId,
          questionId,
          practiceSessionId: session.id,
          sourceType: 'practice_session',
          sourceId: session.id,
          attemptNumber: answers.filter((item) => String(item.questionId) === String(questionId)).length + 1,
          score: Number(evaluation.score || 0),
          maxScore: Number(question.marks || 1),
          normalizedScore: Number(question.marks || 1) ? Number(evaluation.score || 0) / Number(question.marks || 1) : 0,
          assessmentType: session.mode,
          difficulty: question.difficulty,
          timeTakenSeconds: Math.max(0, Number(input.timeTakenSeconds || 0)),
          markingMethod: evaluation.markingMethod,
          misconceptionCodes: codes,
          feedback: evaluation,
          contentVersion: String(question.version || 1),
          occurredAt: new Date(),
          revisionOfId: null,
          metadata: { transfer: String(question.difficulty).includes('exam') || question.metadata?.transfer === true, confidence: evaluation.confidence },
        },
        transaction,
      });
      const state = await refreshMastery(userId, mapping.outcomeId, { transaction });
      masteryUpdates.push(asPlain(state));
    }

    const nextIndex = isRetry ? currentIndex : currentIndex + 1;
    const answerRecord = {
      questionId,
      answer: input.answer,
      idempotencyKey: clientKey,
      score: Number(evaluation.score || 0),
      maxScore: Number(question.marks || 1),
      submittedAt: new Date().toISOString(),
      retry: isRetry,
    };
    const result = {
      correct: Boolean(evaluation.correct),
      score: answerRecord.score,
      maxScore: answerRecord.maxScore,
      feedback: {
        summary: evaluation.correct ? 'Strong evidence' : 'Keep building this outcome',
        explanation: question.explanation || evaluation.strengths?.[0] || '',
        misconception: evaluation.gaps?.[0] || null,
        improvement: evaluation.nextRecommendation || null,
        modelAnswer: evaluation.modelAnswer || question.modelAnswer || '',
        outcome: null,
        confidence: evaluation.confidence,
        practiceOnly: evaluation.markingMethod === 'ai' || evaluation.markingMethod === 'heuristic',
      },
      masteryUpdates,
    };
    answerRecord.result = result;
    const previousBest = isRetry
      ? Math.max(0, ...answers.filter((item) => String(item.questionId) === String(questionId)).map((item) => Number(item.score || 0)))
      : 0;
    const scoreIncrease = isRetry ? Math.max(0, answerRecord.score - previousBest) : answerRecord.score;
    await session.update({
      currentIndex: nextIndex,
      score: Math.min(Number(session.maxScore || 0), Number(session.score || 0) + scoreIncrease),
      config: { ...config, answers: [...answers, answerRecord] },
      lastActivityAt: new Date(),
    }, { transaction });
  });

  const updated = await PracticeSession.findByPk(session.id);
  const { recordProductEvent } = require('./productEvents');
  await recordProductEvent({
    idempotencyKey: `question-attempted:${clientKey}`,
    type: 'question_attempted',
    userId,
    practiceSessionId: session.id,
    classroomId: session.classroomId,
    outcomeId: mappings[0]?.outcomeId || null,
    feature: `practice:${session.mode}`,
    entityType: 'question',
    entityId: questionId,
    metadata: { correct: Boolean(evaluation.correct), score: evaluation.score, maxScore: question.marks, retry: isRetry, markingMethod: evaluation.markingMethod },
  });
  const serialized = await serialiseSession(updated);
  const answerRecord = updated.config.answers.find((item) => item.idempotencyKey === clientKey);
  return {
    ...answerRecord.result,
    nextQuestion: serialized.currentQuestion,
    session: serialized,
  };
}

async function completePracticeSession(userId, sessionId) {
  const {
    AssignmentSubmission,
    CurriculumOutcome,
    LearningEvidence,
    MasteryState,
    PracticeSession,
    sequelize,
  } = require('../models');
  const session = await PracticeSession.findOne({ where: { id: sessionId, userId } });
  if (!session) { const error = new Error('Practice session not found.'); error.status = 404; throw error; }
  const questionCount = asArray(session.questionIds).length;
  if (session.assignmentId && Number(session.currentIndex || 0) < questionCount) {
    const error = new Error('Answer every assigned question before submitting this work.');
    error.status = 409;
    throw error;
  }
  if (session.status === 'in_progress') {
    await sequelize.transaction(async (transaction) => {
      await session.update({
        status: 'completed',
        completedAt: new Date(),
        lastActivityAt: new Date(),
        summary: {
          score: Number(session.score || 0),
          maxScore: Number(session.maxScore || 0),
          accuracy: Number(session.maxScore || 0) ? Number(session.score || 0) / Number(session.maxScore || 1) : 0,
        },
      }, { transaction });
      if (session.assignmentId) {
        await AssignmentSubmission.update(
          { status: 'completed', submittedAt: new Date() },
          { where: { assignmentId: session.assignmentId, studentId: userId }, transaction },
        );
      }
    });
  }
  const evidence = await LearningEvidence.findAll({ where: { practiceSessionId: session.id } });
  const outcomeIds = [...new Set(evidence.map((item) => String(item.outcomeId)))];
  const [outcomes, states] = await Promise.all([
    outcomeIds.length ? CurriculumOutcome.findAll({ where: { id: { [Op.in]: outcomeIds } } }) : [],
    outcomeIds.length ? MasteryState.findAll({ where: { userId, outcomeId: { [Op.in]: outcomeIds } } }) : [],
  ]);
  const outcomeById = new Map(outcomes.map((row) => [String(row.id), asPlain(row)]));
  const masteryChanges = states.map((row) => {
    const state = asPlain(row);
    return {
      outcomeId: state.outcomeId,
      outcome: outcomeById.get(String(state.outcomeId)) || null,
      probability: Number(state.probability || 0),
      confidence: state.confidence,
      reason: 'Updated from this session’s evidence.',
    };
  });
  const recommendation = await getNextRecommendation(userId, session.subject);
  const { recordProductEvent } = require('./productEvents');
  await recordProductEvent({
    idempotencyKey: `practice-completed:${session.id}`,
    type: session.mode === 'diagnostic' ? 'diagnostic_completed' : 'practice_completed',
    userId,
    practiceSessionId: session.id,
    classroomId: session.classroomId,
    outcomeId: session.primaryOutcomeId,
    feature: `practice:${session.mode}`,
    entityType: 'practice_session',
    entityId: session.id,
    metadata: { mode: session.mode, score: session.score, maxScore: session.maxScore, evidenceCount: evidence.length, assignmentId: session.assignmentId || null },
  });
  const serialized = await serialiseSession(session);
  return {
    session: serialized,
    summary: {
      score: Number(session.score || 0),
      maxScore: Number(session.maxScore || 0),
      accuracy: Number(session.maxScore || 0) ? Math.round(Number(session.score || 0) / Number(session.maxScore) * 100) : 0,
      evidenceCreated: evidence.length,
      masteryChanges,
      nextRecommendation: recommendation,
    },
  };
}

module.exports = {
  MODES,
  answerPracticeQuestion,
  completePracticeSession,
  createPracticeSession,
  evaluateQuestion,
  evaluateQuestion,
  multipleChoiceResult,
  practiceAIQuotaAllows,
  publicQuestion,
  resolveAssignedPractice,
  selectQuestions,
  serialiseSession,
  writtenFallback,
};
