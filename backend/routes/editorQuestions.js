const crypto = require('crypto');
const express = require('express');
const { Op } = require('sequelize');
const { resolveEditorWorkspaceId } = require('../middleware/editorAuth');
const { resolveReviewerUser } = require('../middleware/editorAuth');
const { validateQuestion } = require('../services/questionValidation');
const { ensureEconomicsQuestionBank } = require('../services/questionBankService');

const router = express.Router();

router.use(async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    req.workspaceId = await resolveEditorWorkspaceId(token);
    return next();
  } catch (error) {
    return res.status(error.status || 401).json({ message: error.message || 'Editor access code required' });
  }
});

const plain = (row) => row?.toJSON ? row.toJSON() : row;
const uniqueIds = (values) => [...new Set((Array.isArray(values) ? values : []).filter(Boolean).map(String))];
const TRANSITIONS = {
  draft: ['in_review', 'archived'],
  in_review: ['draft', 'approved'],
  approved: ['draft', 'published'],
  published: ['superseded', 'archived'],
  superseded: ['archived'],
  archived: [],
};
const EDITABLE = [
  'subject', 'syllabusVersion', 'prompt', 'responseType', 'options', 'answerKey',
  'explanation', 'difficulty', 'marks', 'expectedMinutes', 'commandVerb', 'rubric',
  'modelAnswer', 'misconceptions', 'source', 'metadata',
];

function requestedSourceKey(value, fallback) {
  const normalized = String(value || '').trim().slice(0, 255);
  return normalized || fallback;
}

async function validateOutcomeIds(outcomeIds) {
  const { CurriculumOutcome } = require('../models');
  const ids = uniqueIds(outcomeIds);
  if (!ids.length) return ids;
  const count = await CurriculumOutcome.count({ where: { id: { [Op.in]: ids }, isActive: true } });
  if (count !== ids.length) {
    const error = new Error('One or more curriculum outcomes are invalid or inactive.');
    error.status = 400;
    throw error;
  }
  return ids;
}

async function replaceMappings(questionId, outcomeIds, transaction) {
  const { QuestionOutcome } = require('../models');
  const ids = await validateOutcomeIds(outcomeIds);
  await QuestionOutcome.destroy({ where: { questionId }, transaction });
  if (ids.length) {
    await QuestionOutcome.bulkCreate(ids.map((outcomeId, index) => ({
      questionId,
      outcomeId,
      isPrimary: index === 0,
      weight: index === 0 ? 1 : 0.75,
      metadata: {},
    })), { transaction });
  }
  return ids;
}

async function serializeQuestions(rows, workspaceId = null) {
  const { CurriculumOutcome, QuestionOutcome } = require('../models');
  const questionIds = rows.map((row) => row.id);
  const mappings = questionIds.length ? await QuestionOutcome.findAll({ where: { questionId: { [Op.in]: questionIds } } }) : [];
  const outcomeIds = [...new Set(mappings.map((row) => String(row.outcomeId)))];
  const outcomes = outcomeIds.length ? await CurriculumOutcome.findAll({ where: { id: { [Op.in]: outcomeIds } } }) : [];
  const outcomeById = new Map(outcomes.map((row) => [String(row.id), plain(row)]));
  const mapped = new Map();
  mappings.forEach((mapping) => {
    const list = mapped.get(String(mapping.questionId)) || [];
    const outcome = outcomeById.get(String(mapping.outcomeId));
    if (outcome) list.push(outcome);
    mapped.set(String(mapping.questionId), list);
  });
  return rows.map((row) => {
    const item = plain(row);
    const readOnly = !item.editorWorkspaceId || String(item.editorWorkspaceId) !== String(workspaceId);
    delete item.editorWorkspaceId;
    return { ...item, readOnly, outcomes: mapped.get(String(row.id)) || [], outcomeIds: (mapped.get(String(row.id)) || []).map((outcome) => outcome.id) };
  });
}

async function recordRevision(question, workspaceId, changeSummary, transaction) {
  const { ContentRevision } = require('../models');
  return ContentRevision.create({
    entityType: 'question',
    entityId: String(question.id),
    version: Number(question.version || 1),
    snapshot: plain(question),
    workspaceId,
    changeSummary,
  }, { transaction });
}

router.get('/questions', async (req, res, next) => {
  try {
    const { Question, QuestionOutcome } = require('../models');
    const subject = String(req.query.subject || 'economics').toLowerCase();
    if (subject === 'economics') await ensureEconomicsQuestionBank();
    const where = {
      subject,
      [Op.and]: [{ [Op.or]: [{ editorWorkspaceId: null }, { editorWorkspaceId: req.workspaceId }] }],
    };
    if (req.query.status) where.lifecycleStatus = String(req.query.status);
    if (req.query.search) where.prompt = { [Op.like]: `%${String(req.query.search).slice(0, 200)}%` };
    if (req.query.outcomeId) {
      const mappings = await QuestionOutcome.findAll({ where: { outcomeId: req.query.outcomeId }, attributes: ['questionId'] });
      where.id = { [Op.in]: mappings.map((row) => row.questionId) };
    }
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 100));
    const questions = await Question.findAll({ where, order: [['updatedAt', 'DESC']], limit });
    res.json({ questions: await serializeQuestions(questions, req.workspaceId) });
  } catch (error) {
    next(error);
  }
});

router.post('/questions', async (req, res, next) => {
  try {
    const { Question, sequelize } = require('../models');
    const outcomeIds = await validateOutcomeIds(req.body?.outcomeIds);
    const payload = EDITABLE.reduce((result, field) => {
      if (req.body?.[field] !== undefined) result[field] = req.body[field];
      return result;
    }, {});
    const validation = validateQuestion({ ...payload, outcomeIds });
    if (!validation.ok) return res.status(422).json({ message: 'Resolve question checks first.', validation });
    const question = await sequelize.transaction(async (transaction) => {
      const created = await Question.create({
        ...payload,
        subject: String(payload.subject || 'economics').toLowerCase(),
        questionKey: crypto.randomUUID(),
        editorWorkspaceId: req.workspaceId,
        sourceKey: requestedSourceKey(req.body?.sourceKey, `editor:${req.workspaceId}:${crypto.randomUUID()}`),
        lifecycleStatus: 'draft',
        version: 1,
        metadata: { ...(payload.metadata || {}), editorWorkspaceId: req.workspaceId },
      }, { transaction });
      await replaceMappings(created.id, outcomeIds, transaction);
      await recordRevision(created, req.workspaceId, 'Question created', transaction);
      return created;
    });
    const [serialized] = await serializeQuestions([question], req.workspaceId);
    res.status(201).json({ question: serialized, validation });
  } catch (error) {
    next(error);
  }
});

router.put('/questions/:id', async (req, res, next) => {
  try {
    const { Question, QuestionOutcome, sequelize } = require('../models');
    const original = await Question.findOne({ where: { id: req.params.id, editorWorkspaceId: req.workspaceId } });
    if (!original) return res.status(404).json({ message: 'Question not found.' });
    if (['superseded', 'archived'].includes(original.lifecycleStatus)) return res.status(409).json({ message: 'Archived question versions cannot be edited.' });
    const existingMappings = await QuestionOutcome.findAll({ where: { questionId: original.id } });
    const outcomeIds = await validateOutcomeIds(req.body?.outcomeIds ?? existingMappings.map((row) => row.outcomeId));
    const payload = EDITABLE.reduce((result, field) => {
      if (req.body?.[field] !== undefined) result[field] = req.body[field];
      return result;
    }, {});
    const merged = { ...plain(original), ...payload, outcomeIds };
    const validation = validateQuestion(merged);
    if (!validation.ok) return res.status(422).json({ message: 'Resolve question checks first.', validation });

    const question = await sequelize.transaction(async (transaction) => {
      if (original.lifecycleStatus === 'published') {
        const existingNext = await Question.findOne({ where: { previousVersionId: original.id }, transaction });
        if (existingNext) {
          const error = new Error('A newer draft already exists for this question.');
          error.status = 409;
          throw error;
        }
        const copy = EDITABLE.reduce((result, field) => ({ ...result, [field]: merged[field] }), {});
        const created = await Question.create({
          ...copy,
          questionKey: original.questionKey,
          sourceKey: `editor:${req.workspaceId}:${crypto.randomUUID()}`,
          version: Number(original.version || 1) + 1,
          previousVersionId: original.id,
          editorWorkspaceId: req.workspaceId,
          lifecycleStatus: 'draft',
          publishedAt: null,
          reviewedAt: null,
          metadata: { ...(copy.metadata || {}), editorWorkspaceId: req.workspaceId },
        }, { transaction });
        await replaceMappings(created.id, outcomeIds, transaction);
        await recordRevision(created, req.workspaceId, 'New question version created', transaction);
        return created;
      }
      await original.update({
        ...payload,
        ...(req.body?.sourceKey !== undefined ? { sourceKey: requestedSourceKey(req.body.sourceKey, original.sourceKey) } : {}),
      }, { transaction });
      await replaceMappings(original.id, outcomeIds, transaction);
      await recordRevision(original, req.workspaceId, req.body?.changeSummary || 'Question updated', transaction);
      return original;
    });
    const [serialized] = await serializeQuestions([question], req.workspaceId);
    res.json({ question: serialized, validation, createdNewVersion: String(question.id) !== String(original.id) });
  } catch (error) {
    next(error);
  }
});

router.post('/questions/:id/lifecycle', async (req, res, next) => {
  try {
    const { Question, QuestionOutcome, sequelize } = require('../models');
    const question = await Question.findOne({ where: { id: req.params.id, editorWorkspaceId: req.workspaceId } });
    if (!question) return res.status(404).json({ message: 'Question not found.' });
    const status = String(req.body?.status || '');
    if (!(TRANSITIONS[question.lifecycleStatus] || []).includes(status)) return res.status(409).json({ message: `Cannot move a question from ${question.lifecycleStatus} to ${status}.` });
    const mappings = await QuestionOutcome.findAll({ where: { questionId: question.id } });
    const reviewTime = status === 'approved' ? new Date() : question.reviewedAt;
    const validation = validateQuestion({ ...plain(question), lifecycleStatus: status, reviewedAt: reviewTime, outcomeIds: mappings.map((row) => row.outcomeId) });
    if (['in_review', 'approved', 'published'].includes(status) && !validation.ok) return res.status(422).json({ message: 'Resolve question checks first.', validation });
    const reviewer = status === 'approved' ? await resolveReviewerUser(req) : null;
    const reviewerName = reviewer ? [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ').slice(0, 120) : '';
    if (status === 'approved' && req.body?.humanReviewed !== true) {
      return res.status(422).json({ message: 'Confirm the signed-in reviewer completed the quality review.' });
    }
    await sequelize.transaction(async (transaction) => {
      await question.update({
        lifecycleStatus: status,
        reviewedAt: ['approved', 'published'].includes(status) ? reviewTime : question.reviewedAt,
        publishedAt: status === 'published' ? new Date() : question.publishedAt,
        reviewedBy: status === 'approved' ? reviewer.id : question.reviewedBy,
        metadata: status === 'approved' ? {
          ...(question.metadata || {}),
          reviewAttribution: { reviewerName, reviewerUserId: reviewer.id, workspaceId: req.workspaceId, reviewedAt: reviewTime.toISOString() },
        } : question.metadata,
      }, { transaction });
      if (status === 'published' && question.previousVersionId) {
        await Question.update({ lifecycleStatus: 'superseded' }, { where: { id: question.previousVersionId }, transaction });
      }
      await recordRevision(question, req.workspaceId, `Lifecycle: ${status}`, transaction);
    });
    const [serialized] = await serializeQuestions([question], req.workspaceId);
    res.json({ question: serialized, validation });
  } catch (error) {
    next(error);
  }
});

router.get('/questions/:id/history', async (req, res, next) => {
  try {
    const { ContentRevision, Question } = require('../models');
    const question = await Question.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [{ editorWorkspaceId: null }, { editorWorkspaceId: req.workspaceId }],
      },
    });
    if (!question) return res.status(404).json({ message: 'Question not found.' });
    const versions = await Question.findAll({
      where: {
        questionKey: question.questionKey,
        editorWorkspaceId: question.editorWorkspaceId || null,
      },
      order: [['version', 'DESC']],
    });
    const revisions = await ContentRevision.findAll({
      where: { entityType: 'question', entityId: { [Op.in]: versions.map((row) => String(row.id)) } },
      order: [['createdAt', 'DESC']],
    });
    res.json({ versions: await serializeQuestions(versions, req.workspaceId), revisions });
  } catch (error) {
    next(error);
  }
});

router.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if ((error.status || 500) >= 500) console.error('Editor question bank error:', error);
  res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not complete the question-bank request.' });
});

module.exports = router;
