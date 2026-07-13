const { Op } = require('sequelize');
const { calculateMastery } = require('./masteryEngine');

const asPlain = (record) => {
  if (!record) return record;
  if (typeof record.toJSON === 'function') return record.toJSON();
  return record.dataValues ? { ...record.dataValues } : record;
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const numberOr = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const uniqueStrings = (values) => [...new Set((values || []).map(String))];

const arrayify = (value) => {
  if (value == null || value === '') return [];
  const parsed = asArray(value);
  return parsed.length ? parsed : [value];
};

const confidenceLabel = (value) => {
  if (typeof value === 'string') return value;
  const score = numberOr(value);
  if (score >= 0.75) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
};

/** Return only current immutable evidence, excluding every record superseded by a revision. */
function currentEvidence(records = []) {
  const evidence = records.map(asPlain);
  const supersededIds = new Set(
    evidence.filter((item) => item.revisionOfId).map((item) => String(item.revisionOfId)),
  );
  return evidence.filter((item) => !supersededIds.has(String(item.id)));
}

function statusForState(state, threshold) {
  if (!state || numberOr(state.evidenceCount) === 0) return 'no_evidence';
  const probability = numberOr(state.probability);
  if (probability < threshold) return 'needs_support';
  if (probability < 0.8) return 'developing';
  return 'secure';
}

function profileName(student) {
  const fullName = [student.firstName, student.lastName].filter(Boolean).join(' ').trim();
  return fullName || student.email || String(student.id);
}

/**
 * Produce every teacher insight from one consistent snapshot. Keeping this
 * transformation pure makes threshold changes and analytics regressions easy
 * to test without relying on a particular database dialect.
 */
function buildClassAnalytics({
  students = [],
  outcomes = [],
  states = [],
  evidence = [],
  threshold = 0.6,
  now = new Date(),
}) {
  const safeThreshold = Math.min(0.95, Math.max(0.2, numberOr(threshold, 0.6)));
  const studentRows = students.map(asPlain).map((student) => ({
    id: String(student.id),
    firstName: student.firstName || '',
    lastName: student.lastName || '',
    email: student.email || null,
    name: profileName(student),
  }));
  const outcomeRows = outcomes.map(asPlain).map((outcome) => ({
    id: String(outcome.id),
    code: outcome.code || '',
    title: outcome.title || outcome.description || outcome.code || String(outcome.id),
    parentId: outcome.parentId ? String(outcome.parentId) : null,
    sortOrder: numberOr(outcome.sortOrder),
  })).sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));

  const statesByStudentOutcome = new Map();
  for (const rawState of states.map(asPlain)) {
    statesByStudentOutcome.set(`${rawState.userId}:${rawState.outcomeId}`, rawState);
  }

  const cells = [];
  const individualProfiles = [];
  const studentsNeedingIntervention = [];
  const current = currentEvidence(evidence);

  for (const student of studentRows) {
    const outcomeStates = outcomeRows.map((outcome) => {
      const state = statesByStudentOutcome.get(`${student.id}:${outcome.id}`) || null;
      const probability = state ? numberOr(state.probability) : null;
      const cell = {
        studentId: student.id,
        outcomeId: outcome.id,
        probability,
        evidenceCount: state ? numberOr(state.evidenceCount) : 0,
        confidence: state?.confidence ?? 'low',
        confidenceLabel: confidenceLabel(state?.confidence),
        lastDemonstratedAt: state?.lastDemonstratedAt || null,
        nextReviewAt: state?.nextReviewAt || null,
        status: statusForState(state, safeThreshold),
      };
      cells.push(cell);
      return { ...cell, outcome };
    });
    const evidenced = outcomeStates.filter((item) => item.probability != null);
    const averageProbability = evidenced.length
      ? evidenced.reduce((sum, item) => sum + item.probability, 0) / evidenced.length
      : null;
    const weakOutcomes = outcomeStates
      .filter((item) => item.probability == null || item.probability < safeThreshold)
      .sort((a, b) => (a.probability ?? -1) - (b.probability ?? -1))
      .map((item) => ({
        id: item.outcome.id,
        code: item.outcome.code,
        title: item.outcome.title,
        probability: item.probability,
        evidenceCount: item.evidenceCount,
      }));
    const dueOutcomeCount = outcomeStates.filter(
      (item) => item.nextReviewAt && new Date(item.nextReviewAt) <= now,
    ).length;
    const evidenceCount = outcomeStates.reduce((sum, item) => sum + item.evidenceCount, 0);

    const profile = {
      student,
      averageProbability: averageProbability == null ? null : Number(averageProbability.toFixed(4)),
      evidenceCount,
      outcomes: outcomeStates,
      weakOutcomes,
      dueOutcomeCount,
      recentEvidence: current
        .filter((item) => String(item.userId) === student.id)
        .sort((a, b) => new Date(b.occurredAt || b.createdAt || 0) - new Date(a.occurredAt || a.createdAt || 0))
        .slice(0, 20)
        .map((item) => ({
          id: item.id,
          outcomeId: item.outcomeId,
          questionId: item.questionId || null,
          score: item.score,
          maxScore: item.maxScore,
          normalizedScore: item.normalizedScore,
          assessmentType: item.assessmentType,
          markingMethod: item.markingMethod,
          misconceptionCodes: asArray(item.misconceptionCodes),
          feedback: item.feedback || {},
          occurredAt: item.occurredAt || item.createdAt,
        })),
    };
    individualProfiles.push(profile);

    if (weakOutcomes.length || dueOutcomeCount) {
      const reasons = [];
      if (!evidenceCount) reasons.push('no_evidence');
      if (weakOutcomes.some((item) => item.probability != null)) reasons.push('low_mastery');
      if (dueOutcomeCount) reasons.push('review_overdue');
      studentsNeedingIntervention.push({
        student,
        averageProbability: profile.averageProbability,
        weakOutcomeCount: weakOutcomes.length,
        dueOutcomeCount,
        priority: !evidenceCount ? 'high' : (averageProbability ?? 0) < 0.4 ? 'high' : 'medium',
        reasons,
        weakestOutcomes: weakOutcomes.slice(0, 3),
      });
    }
  }

  studentsNeedingIntervention.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
    return (a.averageProbability ?? -1) - (b.averageProbability ?? -1);
  });

  const misconceptionStats = new Map();
  for (const item of current) {
    for (const rawCode of asArray(item.misconceptionCodes)) {
      const code = typeof rawCode === 'string' ? rawCode : rawCode?.code;
      if (!code) continue;
      const stat = misconceptionStats.get(code) || {
        code,
        count: 0,
        studentIds: new Set(),
        outcomeIds: new Set(),
      };
      stat.count += 1;
      stat.studentIds.add(String(item.userId));
      if (item.outcomeId) stat.outcomeIds.add(String(item.outcomeId));
      misconceptionStats.set(code, stat);
    }
  }
  const commonMisconceptions = [...misconceptionStats.values()]
    .map((stat) => ({
      code: stat.code,
      count: stat.count,
      studentCount: stat.studentIds.size,
      outcomeIds: [...stat.outcomeIds],
    }))
    .sort((a, b) => b.studentCount - a.studentCount || b.count - a.count || a.code.localeCompare(b.code));

  const recommendedGroups = outcomeRows.map((outcome) => {
    const groupCells = cells.filter(
      (cell) => cell.outcomeId === outcome.id
        && (cell.probability == null || cell.probability < safeThreshold),
    );
    if (!groupCells.length) return null;
    const studentIds = groupCells.map((cell) => cell.studentId);
    const known = groupCells.filter((cell) => cell.probability != null);
    return {
      id: `outcome:${outcome.id}`,
      outcome: {
        id: outcome.id,
        code: outcome.code,
        title: outcome.title,
      },
      studentIds,
      studentCount: studentIds.length,
      averageProbability: known.length
        ? Number((known.reduce((sum, cell) => sum + cell.probability, 0) / known.length).toFixed(4))
        : null,
      reason: known.length ? 'shared_weak_outcome' : 'diagnostic_evidence_needed',
      recommendedMode: known.length ? 'remediation' : 'diagnostic',
    };
  }).filter(Boolean).sort((a, b) => b.studentCount - a.studentCount
    || (a.averageProbability ?? -1) - (b.averageProbability ?? -1));

  return {
    threshold: safeThreshold,
    generatedAt: now.toISOString(),
    summary: {
      studentCount: studentRows.length,
      outcomeCount: outcomeRows.length,
      evidenceCount: current.length,
      studentsNeedingIntervention: studentsNeedingIntervention.length,
    },
    heatmap: { students: studentRows, outcomes: outcomeRows, cells },
    individualProfiles,
    commonMisconceptions,
    studentsNeedingIntervention,
    recommendedGroups,
  };
}

const questionStatus = (question) => question.status || question.lifecycleStatus || '';
const isAvailableQuestion = (question) => questionStatus(question) === 'published';

function filterQuestions(questions, selection) {
  const difficulties = arrayify(selection.difficulties || selection.difficulty).map(String);
  const responseTypes = arrayify(selection.responseTypes).map(String);
  const commandVerbs = arrayify(selection.commandVerbs).map((value) => String(value).toLowerCase());
  return questions.filter((question) => {
    if (!isAvailableQuestion(question)) return false;
    if (difficulties.length && !difficulties.includes(String(question.difficulty))) return false;
    if (responseTypes.length && !responseTypes.includes(String(question.responseType))) return false;
    if (commandVerbs.length && !commandVerbs.includes(String(question.commandVerb || '').toLowerCase())) return false;
    return true;
  });
}

/** Resolve and validate an assignment's question set with deterministic outcome coverage. */
async function selectAssignmentQuestions({
  outcomeIds,
  requestedQuestionIds = [],
  selection = {},
  Question,
  QuestionOutcome,
  transaction,
}) {
  const requestedOutcomes = uniqueStrings(outcomeIds);
  const manualIds = uniqueStrings(requestedQuestionIds);
  const mappings = await QuestionOutcome.findAll({
    where: { outcomeId: { [Op.in]: requestedOutcomes } },
    attributes: ['questionId', 'outcomeId', 'weight'],
    transaction,
  });
  const plainMappings = mappings.map(asPlain);
  const candidateIds = uniqueStrings(plainMappings.map((mapping) => mapping.questionId));
  if (!candidateIds.length) {
    const error = new Error('No questions are mapped to the selected outcomes');
    error.status = 400;
    throw error;
  }

  if (manualIds.some((id) => !candidateIds.includes(id))) {
    const error = new Error('Every selected question must be mapped to one of the assignment outcomes');
    error.status = 400;
    throw error;
  }

  const queryIds = manualIds.length ? manualIds : candidateIds;
  const questionRows = await Question.findAll({
    where: { id: { [Op.in]: queryIds } },
    transaction,
  });
  const filtered = filterQuestions(questionRows.map(asPlain), selection)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));

  if (manualIds.length) {
    const availableIds = new Set(filtered.map((question) => String(question.id)));
    const unavailable = manualIds.filter((id) => !availableIds.has(id));
    if (unavailable.length) {
      const error = new Error('Selected questions must be published and match the selection filters');
      error.status = 400;
      throw error;
    }
    return manualIds;
  }

  const requestedCount = Math.min(50, Math.max(1, Math.floor(numberOr(selection.count, 5))));
  const byId = new Map(filtered.map((question) => [String(question.id), question]));
  const byOutcome = new Map(requestedOutcomes.map((id) => [id, []]));
  for (const mapping of plainMappings) {
    const questionId = String(mapping.questionId);
    const outcomeId = String(mapping.outcomeId);
    if (byId.has(questionId) && byOutcome.has(outcomeId)) byOutcome.get(outcomeId).push(questionId);
  }
  for (const ids of byOutcome.values()) ids.sort();

  const selected = [];
  const used = new Set();
  let index = 0;
  while (selected.length < requestedCount) {
    let added = false;
    for (const outcomeId of requestedOutcomes) {
      const candidate = byOutcome.get(outcomeId)?.[index];
      if (candidate && !used.has(candidate)) {
        used.add(candidate);
        selected.push(candidate);
        added = true;
        if (selected.length >= requestedCount) break;
      }
    }
    if (!added && index >= filtered.length) break;
    index += 1;
  }
  if (selected.length < requestedCount) {
    for (const question of filtered) {
      const id = String(question.id);
      if (!used.has(id)) selected.push(id);
      if (selected.length >= requestedCount) break;
    }
  }
  if (!selected.length) {
    const error = new Error('No published questions match the assignment filters');
    error.status = 400;
    throw error;
  }
  return selected;
}

/** Recalculate mastery from the current leaves of the immutable revision graph. */
async function refreshMasteryAfterOverride({
  userId,
  outcomeId,
  LearningEvidence,
  MasteryState,
  transaction,
  now = new Date(),
}) {
  const rows = await LearningEvidence.findAll({
    where: { userId, outcomeId },
    order: [['occurredAt', 'ASC']],
    transaction,
  });
  const result = calculateMastery(currentEvidence(rows), now);
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
    calculatedAt: now,
  };
  const [state, created] = await MasteryState.findOrCreate({
    where: { userId, outcomeId },
    defaults: { ...values, version: 1 },
    transaction,
  });
  if (!created) {
    await state.update({
      ...values,
      version: numberOr(state.version, 0) + 1,
    }, { transaction });
  }
  return state;
}

module.exports = {
  asArray,
  asPlain,
  buildClassAnalytics,
  currentEvidence,
  isAvailableQuestion,
  refreshMasteryAfterOverride,
  selectAssignmentQuestions,
  uniqueStrings,
};
