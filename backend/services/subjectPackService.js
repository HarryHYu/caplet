const crypto = require('crypto');
const { Op } = require('sequelize');
const businessStudies = require('../data/businessStudiesSubjectPack');
const { recordProductEvent } = require('./productEvents');
const { validateQuestion } = require('./questionValidation');

const SUBJECT_PACK_SOURCE = 'curriculum_studio';

async function recordSubjectPackEvent(type, userId, pack, metadata = {}) {
  const { eventKey = 'once', ...eventMetadata } = metadata;
  return recordProductEvent({
    type,
    userId,
    feature: 'curriculum_studio',
    entityType: 'subject_pack',
    entityId: pack.id,
    idempotencyKey: `${type}:${pack.id}:${userId}:${eventKey}`,
    metadata: {
      subject: pack.subject,
      version: pack.version,
      ...eventMetadata,
    },
  });
}

function plain(value) {
  return value?.toJSON ? value.toJSON() : value;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'subject';
}

function normalizeSourceDocuments(documents = []) {
  return (Array.isArray(documents) ? documents : [])
    .filter(Boolean)
    .slice(0, 12)
    .map((document, index) => ({
      id: String(document.id || `source-${index + 1}`).slice(0, 120),
      name: String(document.name || `Source ${index + 1}`).slice(0, 255),
      type: String(document.type || 'text/plain').slice(0, 100),
      url: document.url ? String(document.url).slice(0, 1000) : null,
      pageCount: document.pageCount == null ? null : Math.max(1, Number(document.pageCount) || 1),
      verified: document.verified === true,
      extractedCharacters: Math.max(0, Number(document.extractedCharacters || document.extractedText?.length || 0)),
    }));
}

function parseOutcomesFromText(text = '') {
  const rows = [];
  const seen = new Set();
  const codePattern = '[A-Z]{1,8}(?:[- ]?[A-Z]{0,5})?[- ]?\\d{1,3}(?:[-.]\\d{1,3})?|[PH]\\d{1,2}';
  const pattern = new RegExp(`^(${codePattern})[\\s:–—-]+(.{8,500})$`);
  const codeOnly = new RegExp(`^(${codePattern})$`);
  const lines = String(text).split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  let currentPage = null;
  lines.forEach((normalized, index) => {
    const pageMarker = normalized.match(/^\[Page (\d+)\]$/i);
    if (pageMarker) { currentPage = Number(pageMarker[1]); return; }
    const match = normalized.match(pattern);
    const standalone = normalized.match(codeOnly);
    const next = standalone ? lines[index + 1] : '';
    const candidate = match || (standalone && next && !codeOnly.test(next) ? [normalized, standalone[1], next] : null);
    if (!candidate) return;
    const code = candidate[1].replace(/\s+/g, '-').toUpperCase();
    if (seen.has(code)) return;
    seen.add(code);
    rows.push({ code, title: candidate[2].replace(/[.;:]$/, ''), description: candidate[2], yearLevel: null, sourcePage: currentPage });
  });
  return rows.slice(0, 250);
}

const plainRows = (rows = []) => rows.map(plain);
const uniqueIds = (values = []) => [...new Set(values.filter(Boolean).map(String))];
const BLOCKING_REVIEW_STATUSES = new Set(['open', 'blocked']);

function buildReadinessSummary({ outcomes = [], questions = [], mappings = [], reviewItems = [], sourceDocuments = [] } = {}) {
  const activeOutcomes = plainRows(outcomes).filter((outcome) => outcome.isActive !== false && outcome.isAssessable !== false);
  const activeQuestions = plainRows(questions).filter((question) => !['archived', 'superseded'].includes(question.lifecycleStatus));
  const eligibleQuestions = activeQuestions.filter((question) => ['approved', 'published'].includes(question.lifecycleStatus));
  const outcomeIdsByQuestion = new Map();
  for (const mapping of plainRows(mappings)) {
    const list = outcomeIdsByQuestion.get(String(mapping.questionId)) || [];
    list.push(String(mapping.outcomeId));
    outcomeIdsByQuestion.set(String(mapping.questionId), list);
  }

  const qualityByQuestion = new Map();
  for (const question of eligibleQuestions) {
    qualityByQuestion.set(String(question.id), validateQuestion({
      ...question,
      lifecycleStatus: 'approved',
      outcomeIds: outcomeIdsByQuestion.get(String(question.id)) || [],
    }));
  }
  const readyQuestions = eligibleQuestions.filter((question) => qualityByQuestion.get(String(question.id))?.ok);
  const readyQuestionIds = new Set(readyQuestions.map((question) => String(question.id)));
  const promptGroups = new Map();
  for (const question of readyQuestions) {
    const signature = String(question.prompt || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!signature) continue;
    const group = promptGroups.get(signature) || [];
    group.push({ id: question.id, prompt: question.prompt });
    promptGroups.set(signature, group);
  }
  const duplicateQuestions = [...promptGroups.values()].filter((group) => group.length > 1);
  const coverage = activeOutcomes.map((outcome) => {
    const mappedQuestions = readyQuestions.filter((question) => (
      (outcomeIdsByQuestion.get(String(question.id)) || []).includes(String(outcome.id))
    ));
    return {
      outcomeId: outcome.id,
      code: outcome.code,
      title: outcome.title,
      questionCount: mappedQuestions.length,
      diagnosticQuestionCount: mappedQuestions.filter((question) => question.responseType === 'multiple_choice').length,
      ready: mappedQuestions.length > 0,
    };
  });
  const coverageGaps = coverage.filter((item) => !item.ready);
  const diagnosticQuestions = readyQuestions.filter((question) => question.responseType === 'multiple_choice');
  const writtenQuestions = readyQuestions.filter((question) => question.responseType !== 'multiple_choice');
  const rubricQuestions = writtenQuestions.filter((question) => Array.isArray(question.rubric) && question.rubric.length > 0);
  const normalizedSources = normalizeSourceDocuments(sourceDocuments);
  const verifiedSources = normalizedSources.filter((source) => source.verified).length;
  const sourcePercent = normalizedSources.length ? Math.round((verifiedSources / normalizedSources.length) * 100) : 0;
  const blockingItems = plainRows(reviewItems).filter((item) => BLOCKING_REVIEW_STATUSES.has(item.status));
  const invalidQuestions = eligibleQuestions
    .filter((question) => !readyQuestionIds.has(String(question.id)))
    .map((question) => ({
      id: question.id,
      prompt: question.prompt,
      issues: qualityByQuestion.get(String(question.id))?.errors || [],
    }));
  const blockers = [];
  if (!activeOutcomes.length) blockers.push('Add at least one assessable syllabus outcome.');
  if (coverageGaps.length) blockers.push(`Add a reviewed question for ${coverageGaps.length} uncovered ${coverageGaps.length === 1 ? 'outcome' : 'outcomes'}.`);
  if (readyQuestions.length < 5) blockers.push(`Approve ${5 - readyQuestions.length} more quality-checked ${5 - readyQuestions.length === 1 ? 'question' : 'questions'}.`);
  if (diagnosticQuestions.length < 5) blockers.push(`Approve ${5 - diagnosticQuestions.length} more multiple-choice ${5 - diagnosticQuestions.length === 1 ? 'question' : 'questions'} for the diagnostic.`);
  if (invalidQuestions.length) blockers.push(`Resolve quality checks on ${invalidQuestions.length} approved ${invalidQuestions.length === 1 ? 'question' : 'questions'}.`);
  if (duplicateQuestions.length) blockers.push(`Resolve ${duplicateQuestions.length} duplicate question ${duplicateQuestions.length === 1 ? 'set' : 'sets'}.`);
  if (sourcePercent !== 100) blockers.push('Verify every syllabus source before publishing.');
  if (blockingItems.length) blockers.push(`Resolve ${blockingItems.length} teacher ${blockingItems.length === 1 ? 'decision' : 'decisions'}.`);

  return {
    outcomes: { ready: activeOutcomes.length - coverageGaps.length, total: activeOutcomes.length },
    questions: { ready: readyQuestions.length, total: activeQuestions.length, invalid: invalidQuestions, duplicates: duplicateQuestions },
    rubrics: { ready: rubricQuestions.length, total: writtenQuestions.length },
    coverage: { ready: coverage.length - coverageGaps.length, total: coverage.length, gaps: coverageGaps, outcomes: coverage },
    diagnostic: { ready: Math.min(diagnosticQuestions.length, 5), total: 5, available: diagnosticQuestions.length },
    sources: { verified: verifiedSources, total: normalizedSources.length, percent: sourcePercent },
    decisions: {
      open: blockingItems.length,
      resolved: reviewItems.length - blockingItems.length,
      total: reviewItems.length,
    },
    blockers,
    canPublish: blockers.length === 0,
    generatedAt: new Date().toISOString(),
  };
}

async function calculateReadiness(pack, options = {}) {
  const {
    CurriculumOutcome,
    Question,
    QuestionOutcome,
    SubjectPackReviewItem,
  } = require('../models');
  const query = options.transaction ? { transaction: options.transaction } : {};
  const [outcomes, questions, reviewItems] = await Promise.all([
    CurriculumOutcome.findAll({ where: { curriculumEditionId: pack.curriculumEditionId }, ...query }),
    Question.findAll({ where: { curriculumEditionId: pack.curriculumEditionId, lifecycleStatus: { [Op.notIn]: ['archived', 'superseded'] } }, ...query }),
    SubjectPackReviewItem.findAll({ where: { subjectPackId: pack.id }, order: [['sortOrder', 'ASC']], ...query }),
  ]);
  const mappings = questions.length
    ? await QuestionOutcome.findAll({ where: { questionId: { [Op.in]: questions.map((question) => question.id) } }, ...query })
    : [];
  const readiness = buildReadinessSummary({
    outcomes,
    questions,
    mappings,
    reviewItems,
    sourceDocuments: pack.sourceDocuments,
  });
  await pack.update({
    readiness,
    lifecycleStatus: readiness.canPublish && pack.lifecycleStatus === 'in_review' ? 'ready' : pack.lifecycleStatus,
    reviewedAt: readiness.canPublish ? new Date() : pack.reviewedAt,
  }, query);
  return { readiness, reviewItems };
}

async function serializePack(pack, options = {}) {
  const { CurriculumOutcome, Question, QuestionOutcome, SubjectPackReviewItem } = require('../models');
  const includeContent = options.includeContent !== false;
  const [readinessResult, outcomes, questions] = await Promise.all([
    calculateReadiness(pack),
    includeContent
      ? CurriculumOutcome.findAll({ where: { curriculumEditionId: pack.curriculumEditionId }, order: [['sortOrder', 'ASC'], ['code', 'ASC']] })
      : [],
    includeContent
      ? Question.findAll({ where: { curriculumEditionId: pack.curriculumEditionId, lifecycleStatus: { [Op.notIn]: ['archived', 'superseded'] } }, order: [['sourceKey', 'ASC']] })
      : [],
  ]);
  const reviewItems = options.includeReviewItems === false
    ? []
    : await SubjectPackReviewItem.findAll({ where: { subjectPackId: pack.id }, order: [['sortOrder', 'ASC']] });
  const mappings = questions.length
    ? await QuestionOutcome.findAll({ where: { questionId: { [Op.in]: questions.map((question) => question.id) } } })
    : [];
  const outcomeById = new Map(outcomes.map((outcome) => [String(outcome.id), plain(outcome)]));
  const outcomesByQuestion = new Map();
  for (const mapping of mappings) {
    const list = outcomesByQuestion.get(String(mapping.questionId)) || [];
    const outcome = outcomeById.get(String(mapping.outcomeId));
    if (outcome) list.push(outcome);
    outcomesByQuestion.set(String(mapping.questionId), list);
  }
  return {
    ...plain(pack),
    readiness: readinessResult.readiness,
    reviewItems: reviewItems.map(plain),
    outcomes: outcomes.map(plain),
    questions: questions.map((question) => {
      const row = plain(question);
      const mappedOutcomes = outcomesByQuestion.get(String(row.id)) || [];
      return {
        ...row,
        outcomes: mappedOutcomes,
        outcomeIds: mappedOutcomes.map((outcome) => outcome.id),
      };
    }),
    studentLinks: {
      diagnostic: `/practice?subject=${encodeURIComponent(pack.subject)}&mode=diagnostic&source=curriculum-studio`,
      practice: `/practice?subject=${encodeURIComponent(pack.subject)}&mode=daily&source=curriculum-studio`,
      mastery: `/mastery?subject=${encodeURIComponent(pack.subject)}`,
    },
  };
}

async function syncBusinessStudiesTemplate(pack, userId) {
  if (pack.lifecycleStatus === 'published' || pack.lifecycleStatus === 'archived') return serializePack(pack);
  const { CurriculumOutcome, Question, QuestionOutcome, SubjectPackReviewItem, sequelize } = require('../models');
  await sequelize.transaction(async (transaction) => {
    const outcomes = await CurriculumOutcome.findAll({ where: { curriculumEditionId: pack.curriculumEditionId }, transaction });
    const outcomeByCode = new Map(outcomes.map((outcome) => [outcome.code, outcome]));
    const questions = await Question.findAll({ where: { curriculumEditionId: pack.curriculumEditionId }, transaction });
    const templateKeys = new Set(questions.map((question) => question.metadata?.templateKey).filter(Boolean));
    for (const [index, template] of businessStudies.questions.entries()) {
      if (templateKeys.has(template.key)) continue;
      const responseType = template.responseType || 'multiple_choice';
      const options = template.options || [];
      const question = await Question.create({
        questionKey: `business-studies:${template.key}`,
        sourceKey: `business-studies:2010:${String(index + 1).padStart(3, '0')}:${template.key}`,
        version: 1,
        subject: pack.subject,
        syllabusVersion: pack.syllabusVersion,
        curriculumEditionId: pack.curriculumEditionId,
        prompt: template.prompt,
        responseType,
        options,
        answerKey: responseType === 'multiple_choice' ? {
          index: template.answerIndex,
          value: options[template.answerIndex],
          letter: String.fromCharCode(65 + Number(template.answerIndex || 0)),
        } : null,
        explanation: template.explanation || null,
        difficulty: template.difficulty,
        marks: template.marks || 1,
        expectedMinutes: responseType === 'multiple_choice' ? 2 : 12,
        commandVerb: responseType === 'multiple_choice' ? 'identify' : template.prompt.split(' ')[0].toLowerCase(),
        rubric: template.rubric || [],
        modelAnswer: template.modelAnswer || template.explanation || null,
        misconceptions: [],
        source: {
          sourceUrl: businessStudies.SOURCE_URL,
          documentUrl: businessStudies.SOURCE_DOCUMENT_URL,
          focusId: template.outcome.startsWith('P') ? 'preliminary' : 'hsc',
          focusTitle: outcomeByCode.get(template.outcome)?.title,
          provenance: 'Caplet original question aligned to the NESA Business Studies Stage 6 syllabus',
        },
        metadata: { subjectPackId: pack.id, templateKey: template.key, humanReviewRequired: true },
        lifecycleStatus: 'approved',
        reviewedAt: new Date(),
        reviewedBy: userId,
      }, { transaction });
      const outcome = outcomeByCode.get(template.outcome);
      if (outcome) await QuestionOutcome.create({
        questionId: question.id,
        outcomeId: outcome.id,
        isPrimary: true,
        weight: 1,
        metadata: { subjectPackId: pack.id },
      }, { transaction });
    }
    for (const template of businessStudies.reviewItems) {
      const item = await SubjectPackReviewItem.findOne({ where: { subjectPackId: pack.id, reviewKey: template.reviewKey }, transaction });
      if (item && item.status !== 'resolved') await item.update({ decisionOptions: template.decisionOptions }, { transaction });
    }
    await calculateReadiness(pack, { transaction });
  });
  return serializePack(pack);
}

async function createBusinessStudiesPack(userId) {
  const {
    CurriculumEdition,
    CurriculumOutcome,
    Question,
    QuestionOutcome,
    SubjectPack,
    SubjectPackReviewItem,
    sequelize,
  } = require('../models');

  const existing = await SubjectPack.findOne({ where: { key: 'NSW-BUSINESS-STUDIES-2010-V1' } });
  if (existing) return syncBusinessStudiesTemplate(existing, userId);

  const pack = await sequelize.transaction(async (transaction) => {
    const [edition] = await CurriculumEdition.findOrCreate({
      where: { key: 'NSW-BUSINESS-STUDIES-2010' },
      defaults: {
        jurisdiction: 'NSW',
        subject: 'business-studies',
        label: 'Business Studies Stage 6 Syllabus (2010)',
        officialSyllabusCode: '11040/15040',
        sourceUrl: businessStudies.SOURCE_URL,
        firstHscCohortYear: 2012,
        reviewedAt: new Date(),
        active: true,
        metadata: { sourceDocumentUrl: businessStudies.SOURCE_DOCUMENT_URL, source: 'NESA', template: 'business-studies-2010' },
      },
      transaction,
    });
    const createdPack = await SubjectPack.create({
      key: 'NSW-BUSINESS-STUDIES-2010-V1',
      slug: 'hsc-business-studies',
      version: 1,
      title: 'HSC Business Studies',
      description: 'A syllabus-aligned adaptive subject pack covering the Preliminary and HSC Business Studies courses.',
      jurisdiction: 'NSW',
      subject: 'business-studies',
      syllabusVersion: 'NSW-2010',
      curriculumEditionId: edition.id,
      createdBy: userId,
      lifecycleStatus: 'in_review',
      sourceDocuments: [{
        id: 'nesa-business-studies-2010',
        name: 'Business Studies Stage 6 Syllabus (2010)',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        url: businessStudies.SOURCE_DOCUMENT_URL,
        verified: true,
        extractedCharacters: 0,
      }],
      metadata: {
        template: 'business-studies-2010',
        officialPageUrl: businessStudies.SOURCE_URL,
        provenance: 'Teacher-reviewed NESA syllabus alignment',
      },
    }, { transaction });

    const parentByYear = new Map();
    for (const [index, yearLevel] of ['Year 11', 'Year 12'].entries()) {
      const parent = await CurriculumOutcome.create({
        jurisdiction: 'NSW',
        subject: 'business-studies',
        syllabusVersion: 'NSW-2010',
        curriculumEditionId: edition.id,
        code: yearLevel === 'Year 11' ? 'BUS-PRELIM' : 'BUS-HSC',
        title: yearLevel === 'Year 11' ? 'Preliminary course' : 'HSC course',
        description: yearLevel === 'Year 11'
          ? 'Nature of business, business management and business planning.'
          : 'Operations, marketing, finance and human resources.',
        yearLevel,
        sortOrder: index * 100,
        isAssessable: false,
        isActive: true,
        metadata: {
          source: SUBJECT_PACK_SOURCE,
          subjectPackId: createdPack.id,
          sourceCitation: {
            label: 'NESA Business Studies Stage 6 Syllabus (2010)',
            url: businessStudies.SOURCE_DOCUMENT_URL,
            section: '7 Objectives and outcomes',
          },
        },
      }, { transaction });
      parentByYear.set(yearLevel, parent);
    }

    const outcomeByCode = new Map();
    for (const [index, outcome] of businessStudies.outcomes.entries()) {
      const created = await CurriculumOutcome.create({
        jurisdiction: 'NSW',
        subject: 'business-studies',
        syllabusVersion: 'NSW-2010',
        curriculumEditionId: edition.id,
        code: outcome.code,
        title: outcome.title,
        description: outcome.description,
        parentId: parentByYear.get(outcome.yearLevel)?.id || null,
        yearLevel: outcome.yearLevel,
        sortOrder: index + 1,
        isAssessable: true,
        isActive: true,
        metadata: {
          source: SUBJECT_PACK_SOURCE,
          subjectPackId: createdPack.id,
          sourceCitation: { label: 'NESA Business Studies Stage 6 Syllabus (2010)', section: '7.1 Objectives and outcomes', url: businessStudies.SOURCE_DOCUMENT_URL },
        },
      }, { transaction });
      outcomeByCode.set(outcome.code, created);
    }

    const questionByTemplateKey = new Map();
    for (const [index, template] of businessStudies.questions.entries()) {
      const responseType = template.responseType || 'multiple_choice';
      const options = template.options || [];
      const created = await Question.create({
        questionKey: `business-studies:${template.key}`,
        sourceKey: `business-studies:2010:${String(index + 1).padStart(3, '0')}:${template.key}`,
        version: 1,
        subject: 'business-studies',
        syllabusVersion: 'NSW-2010',
        curriculumEditionId: edition.id,
        prompt: template.prompt,
        responseType,
        options,
        answerKey: responseType === 'multiple_choice' ? {
          index: template.answerIndex,
          value: options[template.answerIndex],
          letter: String.fromCharCode(65 + Number(template.answerIndex || 0)),
        } : null,
        explanation: template.explanation || null,
        difficulty: template.difficulty,
        marks: template.marks || 1,
        expectedMinutes: responseType === 'multiple_choice' ? 2 : 12,
        commandVerb: responseType === 'multiple_choice' ? 'identify' : template.prompt.split(' ')[0].toLowerCase(),
        rubric: template.rubric || [],
        modelAnswer: template.modelAnswer || template.explanation || null,
        misconceptions: [],
        source: {
          sourceUrl: businessStudies.SOURCE_URL,
          documentUrl: businessStudies.SOURCE_DOCUMENT_URL,
          focusId: template.outcome.startsWith('P') ? 'preliminary' : 'hsc',
          focusTitle: outcomeByCode.get(template.outcome)?.title,
          provenance: 'Caplet original question aligned to the NESA Business Studies Stage 6 syllabus',
        },
        metadata: { subjectPackId: createdPack.id, templateKey: template.key, humanReviewRequired: true },
        lifecycleStatus: 'approved',
        reviewedAt: new Date(),
        reviewedBy: userId,
      }, { transaction });
      questionByTemplateKey.set(template.key, created);
      const mappedOutcome = outcomeByCode.get(template.outcome);
      if (mappedOutcome) {
        await QuestionOutcome.create({
          questionId: created.id,
          outcomeId: mappedOutcome.id,
          isPrimary: true,
          weight: 1,
          metadata: { subjectPackId: createdPack.id },
        }, { transaction });
      }
    }

    for (const [index, item] of businessStudies.reviewItems.entries()) {
      const entity = item.entityType === 'question'
        ? questionByTemplateKey.get(item.entityCode)
        : outcomeByCode.get(item.entityCode);
      await SubjectPackReviewItem.create({
        subjectPackId: createdPack.id,
        reviewKey: item.reviewKey,
        itemType: item.itemType,
        entityType: item.entityType,
        entityId: entity?.id || null,
        title: item.title,
        summary: item.summary,
        severity: 'decision',
        status: 'open',
        sourceCitation: item.sourceCitation,
        decisionOptions: item.decisionOptions,
        sortOrder: index + 1,
        metadata: { templateEntityCode: item.entityCode },
      }, { transaction });
    }
    await calculateReadiness(createdPack, { transaction });
    return createdPack;
  });
  const serialized = await serializePack(pack);
  await recordSubjectPackEvent('subject_pack_imported', userId, pack, { template: 'business-studies-2010' });
  return serialized;
}

async function importSubjectPack(userId, input = {}) {
  if (input.templateId === 'business-studies-2010') return createBusinessStudiesPack(userId);
  const {
    CurriculumEdition,
    CurriculumOutcome,
    SubjectPack,
    SubjectPackReviewItem,
    sequelize,
  } = require('../models');
  const title = String(input.title || '').trim();
  const subject = slugify(input.subject || title);
  const syllabusVersion = String(input.syllabusVersion || new Date().getFullYear()).trim().slice(0, 80);
  const jurisdiction = String(input.jurisdiction || 'NSW').trim().toUpperCase().slice(0, 50);
  const extractedText = String(input.extractedText || '').slice(0, 500000);
  const outcomes = parseOutcomesFromText(extractedText);
  if (!title) { const error = new Error('Give this subject pack a title.'); error.status = 422; throw error; }
  if (!extractedText || outcomes.length === 0) {
    const error = new Error('No outcome statements were detected. Upload a text-based syllabus or paste extracted syllabus text.');
    error.status = 422;
    throw error;
  }
  const slug = slugify(input.slug || title);
  const version = Math.max(1, Number(input.version || 1));
  const existing = await SubjectPack.findOne({ where: { slug, version } });
  if (existing) { const error = new Error('A subject pack with this slug and version already exists.'); error.status = 409; throw error; }
  const sourceDocuments = normalizeSourceDocuments(input.sourceDocuments?.length ? input.sourceDocuments : [{
    id: crypto.randomUUID(),
    name: input.sourceName || 'Uploaded syllabus',
    type: input.sourceType || 'text/plain',
    url: input.sourceUrl || null,
    verified: false,
    extractedText,
  }]);

  const pack = await sequelize.transaction(async (transaction) => {
    const editionKey = `${jurisdiction}-${subject}-${syllabusVersion}-${crypto.randomUUID().slice(0, 8)}`.slice(0, 80);
    const edition = await CurriculumEdition.create({
      key: editionKey,
      jurisdiction,
      subject,
      label: title,
      officialSyllabusCode: input.officialSyllabusCode || null,
      sourceUrl: input.sourceUrl || 'https://www.nsw.gov.au/education-and-training/nesa/curriculum',
      reviewedAt: null,
      active: false,
      metadata: { importedBy: userId, source: SUBJECT_PACK_SOURCE },
    }, { transaction });
    const createdPack = await SubjectPack.create({
      key: `${slug}:v${version}:${crypto.randomUUID().slice(0, 8)}`,
      slug,
      version,
      title,
      description: input.description || `Imported ${title} curriculum pack.`,
      jurisdiction,
      subject,
      syllabusVersion,
      curriculumEditionId: edition.id,
      createdBy: userId,
      lifecycleStatus: 'in_review',
      sourceDocuments,
      metadata: { extractionMethod: 'deterministic-outcome-parser', outcomeCount: outcomes.length },
    }, { transaction });
    for (const [index, outcome] of outcomes.entries()) {
      await CurriculumOutcome.create({
        jurisdiction,
        subject,
        syllabusVersion,
        curriculumEditionId: edition.id,
        code: outcome.code,
        title: outcome.title.slice(0, 255),
        description: outcome.description,
        yearLevel: outcome.yearLevel,
        sortOrder: index,
        isAssessable: true,
        isActive: true,
        metadata: {
          source: SUBJECT_PACK_SOURCE,
          subjectPackId: createdPack.id,
          sourceCitation: {
            label: sourceDocuments[0]?.name || 'Uploaded syllabus',
            url: sourceDocuments[0]?.url || null,
            page: outcome.sourcePage,
          },
        },
      }, { transaction });
    }
    await SubjectPackReviewItem.create({
      subjectPackId: createdPack.id,
      reviewKey: 'verify-imported-outcomes',
      itemType: 'source_verification',
      entityType: 'curriculum_edition',
      entityId: edition.id,
      title: 'Verify extracted outcome statements',
      summary: `${outcomes.length} outcome statements were detected. Confirm that their wording and order match the source syllabus.`,
      sourceCitation: { label: sourceDocuments[0]?.name || 'Uploaded syllabus', url: sourceDocuments[0]?.url || null },
      decisionOptions: [
        { id: 'verified', label: 'The extraction is accurate', description: 'Keep the detected outcomes and continue to question authoring.', allowsPublish: true },
        { id: 'needs-editing', label: 'The extraction needs editing', description: 'Hold publication until the outcomes are corrected.', allowsPublish: false },
      ],
      sortOrder: 1,
    }, { transaction });
    await calculateReadiness(createdPack, { transaction });
    return createdPack;
  });
  const serialized = await serializePack(pack);
  await recordSubjectPackEvent('subject_pack_imported', userId, pack, {
    extractionMethod: 'deterministic-outcome-parser',
    outcomeCount: outcomes.length,
  });
  return serialized;
}

async function listSubjectPacks(user) {
  const { SubjectPack } = require('../models');
  const where = user.role === 'admin'
    ? {}
    : { [Op.or]: [{ createdBy: user.id }, { lifecycleStatus: 'published' }] };
  const packs = await SubjectPack.findAll({ where, order: [['updatedAt', 'DESC']] });
  return Promise.all(packs.map((pack) => serializePack(pack, { includeContent: false, includeReviewItems: false })));
}

async function listPublishedSubjectPacks(subject = null) {
  const { CurriculumOutcome, SubjectPack } = require('../models');
  const where = {
    lifecycleStatus: 'published',
    ...(subject ? { subject: String(subject).trim().toLowerCase() } : {}),
  };
  const packs = await SubjectPack.findAll({ where, order: [['publishedAt', 'DESC'], ['updatedAt', 'DESC']] });
  return Promise.all(packs.map(async (pack) => {
    const outcomes = await CurriculumOutcome.findAll({
      where: { curriculumEditionId: pack.curriculumEditionId, isActive: true },
      attributes: ['id', 'code', 'title', 'description', 'yearLevel', 'sortOrder'],
      order: [['sortOrder', 'ASC'], ['code', 'ASC']],
    });
    const row = plain(pack);
    return {
      id: row.id,
      key: row.key,
      title: row.title,
      description: row.description,
      subject: row.subject,
      jurisdiction: row.jurisdiction,
      syllabusName: row.title,
      syllabusVersion: row.syllabusVersion,
      sourceDocuments: (row.sourceDocuments || []).map(({ title, url, publisher, effectiveFrom, effectiveTo }) => ({
        title, url, publisher, effectiveFrom, effectiveTo,
      })),
      publishedAt: row.publishedAt,
      outcomes: outcomes.map(plain),
      studentLinks: {
        diagnostic: `/practice?subject=${encodeURIComponent(row.subject)}&mode=diagnostic&source=subject-library`,
        practice: `/practice?subject=${encodeURIComponent(row.subject)}&mode=daily&source=subject-library`,
        mastery: `/mastery?subject=${encodeURIComponent(row.subject)}`,
      },
    };
  }));
}

async function findAccessiblePack(packId, user, options = {}) {
  const { SubjectPack } = require('../models');
  const pack = await SubjectPack.findByPk(packId);
  if (!pack) { const error = new Error('Subject pack not found.'); error.status = 404; throw error; }
  const canManage = user.role === 'admin' || String(pack.createdBy) === String(user.id);
  if (!canManage && pack.lifecycleStatus !== 'published') {
    const error = new Error('You do not have access to this subject pack.'); error.status = 403; throw error;
  }
  if (options.manage && !canManage) {
    const error = new Error('Teacher access is required to change this subject pack.'); error.status = 403; throw error;
  }
  return pack;
}

function assertMutablePack(pack) {
  if (['published', 'archived'].includes(pack.lifecycleStatus)) {
    const error = new Error('This subject-pack version is locked. Create a new version before changing its content.');
    error.status = 409;
    throw error;
  }
}

async function validatePackOutcomeIds(pack, outcomeIds, options = {}) {
  const { CurriculumOutcome } = require('../models');
  const ids = uniqueIds(outcomeIds);
  if (!ids.length) {
    const error = new Error('Map this question to at least one syllabus outcome.');
    error.status = 422;
    throw error;
  }
  const count = await CurriculumOutcome.count({
    where: { id: { [Op.in]: ids }, curriculumEditionId: pack.curriculumEditionId, isActive: true, isAssessable: true },
    transaction: options.transaction,
  });
  if (count !== ids.length) {
    const error = new Error('One or more selected outcomes do not belong to this subject pack.');
    error.status = 422;
    throw error;
  }
  return ids;
}

async function replacePackQuestionMappings(pack, questionId, outcomeIds, transaction) {
  const { QuestionOutcome } = require('../models');
  const ids = await validatePackOutcomeIds(pack, outcomeIds, { transaction });
  await QuestionOutcome.destroy({ where: { questionId }, transaction });
  await QuestionOutcome.bulkCreate(ids.map((outcomeId, index) => ({
    questionId,
    outcomeId,
    isPrimary: index === 0,
    weight: index === 0 ? 1 : 0.75,
    metadata: { subjectPackId: pack.id },
  })), { transaction });
  return ids;
}

const QUESTION_EDITABLE_FIELDS = [
  'prompt', 'responseType', 'options', 'answerKey', 'explanation', 'difficulty',
  'marks', 'expectedMinutes', 'commandVerb', 'rubric', 'modelAnswer',
  'misconceptions', 'source', 'metadata',
];

function packQuestionPayload(pack, input = {}) {
  const payload = QUESTION_EDITABLE_FIELDS.reduce((result, field) => {
    if (input[field] !== undefined) result[field] = input[field];
    return result;
  }, {});
  return {
    ...payload,
    subject: pack.subject,
    syllabusVersion: pack.syllabusVersion,
    curriculumEditionId: pack.curriculumEditionId,
    metadata: { ...(payload.metadata || {}), subjectPackId: pack.id },
  };
}

async function createPackOutcome(packId, user, input = {}) {
  const { CurriculumOutcome } = require('../models');
  const pack = await findAccessiblePack(packId, user, { manage: true });
  assertMutablePack(pack);
  const code = String(input.code || '').trim().toUpperCase().slice(0, 100);
  const title = String(input.title || '').trim().slice(0, 255);
  if (!code || !title) {
    const error = new Error('Give the outcome a code and title.');
    error.status = 422;
    throw error;
  }
  let parentId = input.parentId || null;
  if (parentId) {
    const parent = await CurriculumOutcome.findOne({ where: { id: parentId, curriculumEditionId: pack.curriculumEditionId, isActive: true } });
    if (!parent) { const error = new Error('The parent outcome is not part of this pack.'); error.status = 422; throw error; }
  }
  const existing = await CurriculumOutcome.findOne({
    where: { curriculumEditionId: pack.curriculumEditionId, code },
  });
  if (existing) { const error = new Error('That outcome code already exists in this version.'); error.status = 409; throw error; }
  const outcome = await CurriculumOutcome.create({
    jurisdiction: pack.jurisdiction,
    subject: pack.subject,
    syllabusVersion: pack.syllabusVersion,
    curriculumEditionId: pack.curriculumEditionId,
    code,
    title,
    description: String(input.description || title).trim().slice(0, 10000),
    parentId,
    yearLevel: input.yearLevel ? String(input.yearLevel).trim().slice(0, 50) : null,
    sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
    isAssessable: input.isAssessable !== false,
    isActive: true,
    metadata: {
      source: SUBJECT_PACK_SOURCE,
      subjectPackId: pack.id,
      sourceCitation: input.sourceCitation || {},
    },
  });
  await calculateReadiness(pack);
  return { outcome: plain(outcome), subjectPack: await serializePack(pack) };
}

async function updatePackOutcome(packId, outcomeId, user, input = {}) {
  const { CurriculumOutcome, QuestionOutcome } = require('../models');
  const pack = await findAccessiblePack(packId, user, { manage: true });
  assertMutablePack(pack);
  const outcome = await CurriculumOutcome.findOne({ where: { id: outcomeId, curriculumEditionId: pack.curriculumEditionId } });
  if (!outcome) { const error = new Error('Outcome not found in this subject pack.'); error.status = 404; throw error; }
  const updates = {};
  if (input.code !== undefined) updates.code = String(input.code).trim().toUpperCase().slice(0, 100);
  if (input.title !== undefined) updates.title = String(input.title).trim().slice(0, 255);
  if (input.description !== undefined) updates.description = String(input.description).trim().slice(0, 10000);
  if (input.yearLevel !== undefined) updates.yearLevel = input.yearLevel ? String(input.yearLevel).trim().slice(0, 50) : null;
  if (input.isAssessable !== undefined) updates.isAssessable = Boolean(input.isAssessable);
  if (input.sortOrder !== undefined) updates.sortOrder = Number(input.sortOrder) || 0;
  if (!updates.code && input.code !== undefined) { const error = new Error('Outcome code cannot be empty.'); error.status = 422; throw error; }
  if (!updates.title && input.title !== undefined) { const error = new Error('Outcome title cannot be empty.'); error.status = 422; throw error; }
  if (updates.code && updates.code !== outcome.code) {
    const duplicate = await CurriculumOutcome.findOne({
      where: { curriculumEditionId: pack.curriculumEditionId, code: updates.code, id: { [Op.ne]: outcome.id } },
    });
    if (duplicate) { const error = new Error('That outcome code already exists in this version.'); error.status = 409; throw error; }
  }
  if (input.isActive === false) {
    const childCount = await CurriculumOutcome.count({ where: { parentId: outcome.id, isActive: true } });
    if (childCount) {
      const error = new Error(`Move or archive ${childCount} child ${childCount === 1 ? 'outcome' : 'outcomes'} before archiving this group.`);
      error.status = 409;
      throw error;
    }
    const mappingCount = await QuestionOutcome.count({ where: { outcomeId: outcome.id } });
    if (mappingCount) {
      const error = new Error(`Move or remove ${mappingCount} question ${mappingCount === 1 ? 'mapping' : 'mappings'} before archiving this outcome.`);
      error.status = 409;
      throw error;
    }
    updates.isActive = false;
  }
  await outcome.update(updates);
  await calculateReadiness(pack);
  return { outcome: plain(outcome), subjectPack: await serializePack(pack) };
}

async function createPackQuestion(packId, user, input = {}) {
  const { Question, sequelize } = require('../models');
  const pack = await findAccessiblePack(packId, user, { manage: true });
  assertMutablePack(pack);
  const outcomeIds = await validatePackOutcomeIds(pack, input.outcomeIds || []);
  const payload = packQuestionPayload(pack, input);
  const validation = validateQuestion({ ...payload, outcomeIds, lifecycleStatus: 'draft' });
  if (!validation.ok) { const error = new Error('Resolve the required question fields first.'); error.status = 422; error.validation = validation; throw error; }
  const question = await sequelize.transaction(async (transaction) => {
    const created = await Question.create({
      ...payload,
      questionKey: crypto.randomUUID(),
      sourceKey: `subject-pack:${pack.id}:${crypto.randomUUID()}`,
      version: 1,
      lifecycleStatus: 'draft',
      createdBy: user.id,
    }, { transaction });
    await replacePackQuestionMappings(pack, created.id, outcomeIds, transaction);
    return created;
  });
  await calculateReadiness(pack);
  return { question: plain(question), subjectPack: await serializePack(pack), validation };
}

async function findPackQuestion(pack, questionId) {
  const { Question } = require('../models');
  const question = await Question.findOne({ where: { id: questionId, curriculumEditionId: pack.curriculumEditionId } });
  if (!question) { const error = new Error('Question not found in this subject pack.'); error.status = 404; throw error; }
  return question;
}

async function updatePackQuestion(packId, questionId, user, input = {}) {
  const { QuestionOutcome, sequelize } = require('../models');
  const pack = await findAccessiblePack(packId, user, { manage: true });
  assertMutablePack(pack);
  const question = await findPackQuestion(pack, questionId);
  const currentMappings = await QuestionOutcome.findAll({ where: { questionId: question.id } });
  const outcomeIds = await validatePackOutcomeIds(pack, input.outcomeIds || currentMappings.map((mapping) => mapping.outcomeId));
  const payload = packQuestionPayload(pack, input);
  const nextStatus = ['approved', 'in_review'].includes(question.lifecycleStatus) ? 'draft' : question.lifecycleStatus;
  const validation = validateQuestion({ ...plain(question), ...payload, outcomeIds, lifecycleStatus: nextStatus });
  if (!validation.ok) { const error = new Error('Resolve the required question fields first.'); error.status = 422; error.validation = validation; throw error; }
  await sequelize.transaction(async (transaction) => {
    await question.update({
      ...payload,
      lifecycleStatus: nextStatus,
      reviewedAt: nextStatus === 'draft' ? null : question.reviewedAt,
      reviewedBy: nextStatus === 'draft' ? null : question.reviewedBy,
    }, { transaction });
    await replacePackQuestionMappings(pack, question.id, outcomeIds, transaction);
  });
  await calculateReadiness(pack);
  return { question: plain(question), subjectPack: await serializePack(pack), validation };
}

async function transitionPackQuestion(packId, questionId, user, input = {}) {
  const { QuestionOutcome } = require('../models');
  const pack = await findAccessiblePack(packId, user, { manage: true });
  assertMutablePack(pack);
  const question = await findPackQuestion(pack, questionId);
  const previousStatus = question.lifecycleStatus;
  const status = String(input.status || '');
  const transitions = {
    draft: ['in_review', 'archived'],
    in_review: ['draft', 'approved', 'archived'],
    approved: ['draft', 'archived'],
  };
  if (!(transitions[question.lifecycleStatus] || []).includes(status)) {
    const error = new Error(`Cannot move this question from ${question.lifecycleStatus} to ${status}.`);
    error.status = 409;
    throw error;
  }
  const mappings = await QuestionOutcome.findAll({ where: { questionId: question.id } });
  const transitionAt = new Date();
  const reviewedAt = status === 'approved' ? transitionAt : question.reviewedAt;
  const validation = status === 'archived' ? { ok: true, checks: [], errors: [] } : validateQuestion({
    ...plain(question),
    lifecycleStatus: status,
    reviewedAt,
    outcomeIds: mappings.map((mapping) => mapping.outcomeId),
  });
  if (!validation.ok) { const error = new Error('Resolve every quality check before approving this question.'); error.status = 422; error.validation = validation; throw error; }
  if (status === 'approved' && input.humanReviewed !== true) {
    const error = new Error('Confirm that you checked the answer, rubric, source and accessibility.');
    error.status = 422;
    throw error;
  }
  const submittedAt = status === 'in_review'
    ? transitionAt.toISOString()
    : question.metadata?.reviewSubmittedAt;
  const nextMetadata = {
    ...(question.metadata || {}),
    ...(status === 'in_review' ? { reviewSubmittedAt: submittedAt } : {}),
    ...(status === 'approved' ? {
      reviewAttribution: { reviewerUserId: user.id, reviewedAt: reviewedAt.toISOString(), source: 'curriculum-studio' },
    } : {}),
    ...(status === 'draft' && previousStatus === 'in_review' ? {
      reviewSubmittedAt: null,
      lastReviewDecision: { reviewerUserId: user.id, decision: 'changes_requested', decidedAt: transitionAt.toISOString() },
    } : {}),
    ...(status === 'archived' ? {
      archivedAt: transitionAt.toISOString(),
      archivedBy: user.id,
    } : {}),
  };
  await question.update({
    lifecycleStatus: status,
    reviewedAt: status === 'approved' ? reviewedAt : (status === 'draft' ? null : question.reviewedAt),
    reviewedBy: status === 'approved' ? user.id : (status === 'draft' ? null : question.reviewedBy),
    metadata: nextMetadata,
  });
  await calculateReadiness(pack);
  if (previousStatus === 'in_review' && ['approved', 'draft'].includes(status)) {
    const reviewStart = submittedAt ? new Date(submittedAt) : null;
    const reviewDurationSeconds = reviewStart && !Number.isNaN(reviewStart.getTime())
      ? Math.max(0, Math.round((transitionAt.getTime() - reviewStart.getTime()) / 1000))
      : null;
    await recordSubjectPackEvent('subject_pack_question_reviewed', user.id, pack, {
      eventKey: `${question.id}:${status}:${transitionAt.toISOString()}`,
      questionId: question.id,
      reviewSource: 'human',
      decision: status === 'approved' ? 'approved' : 'changes_requested',
      reviewDurationSeconds,
    });
  }
  if (status === 'archived') {
    await recordSubjectPackEvent('subject_pack_question_archived', user.id, pack, {
      eventKey: question.id,
      questionId: question.id,
      previousStatus,
    });
  }
  return { question: plain(question), subjectPack: await serializePack(pack), validation };
}

async function resolveReviewItem(packId, itemId, user, input = {}) {
  const { SubjectPackReviewItem } = require('../models');
  const pack = await findAccessiblePack(packId, user, { manage: true });
  if (pack.lifecycleStatus === 'published') { const error = new Error('Published subject packs cannot be changed. Create a new version first.'); error.status = 409; throw error; }
  const item = await SubjectPackReviewItem.findOne({ where: { id: itemId, subjectPackId: pack.id } });
  if (!item) { const error = new Error('Review decision not found.'); error.status = 404; throw error; }
  const optionId = String(input.optionId || '');
  const option = (item.decisionOptions || []).find((candidate) => String(candidate.id) === optionId);
  if (!option) { const error = new Error('Choose one of the available review decisions.'); error.status = 422; throw error; }
  const allowsPublish = option.allowsPublish !== false;
  if (item.itemType === 'source_verification' && allowsPublish) {
    const sourceDocuments = normalizeSourceDocuments(pack.sourceDocuments).map((source) => ({ ...source, verified: true }));
    await pack.update({ sourceDocuments });
  }
  await item.update({
    selectedOption: optionId,
    status: allowsPublish ? 'resolved' : 'blocked',
    resolvedBy: user.id,
    resolvedAt: new Date(),
    resolution: {
      label: option.label,
      note: String(input.note || '').slice(0, 2000),
      allowsPublish,
      decidedAt: new Date().toISOString(),
    },
  });
  return serializePack(pack);
}

async function reopenReviewItem(packId, itemId, user) {
  const { SubjectPackReviewItem } = require('../models');
  const pack = await findAccessiblePack(packId, user, { manage: true });
  if (pack.lifecycleStatus === 'published') { const error = new Error('Published subject packs cannot be changed.'); error.status = 409; throw error; }
  const item = await SubjectPackReviewItem.findOne({ where: { id: itemId, subjectPackId: pack.id } });
  if (!item) { const error = new Error('Review decision not found.'); error.status = 404; throw error; }
  if (item.itemType === 'source_verification') {
    const sourceDocuments = normalizeSourceDocuments(pack.sourceDocuments).map((source) => ({ ...source, verified: false }));
    await pack.update({ sourceDocuments });
  }
  await item.update({ selectedOption: null, status: 'open', resolvedBy: null, resolvedAt: null, resolution: {} });
  if (pack.lifecycleStatus === 'ready') await pack.update({ lifecycleStatus: 'in_review', reviewedAt: null });
  return serializePack(pack);
}

async function publishSubjectPack(packId, user) {
  const { CurriculumEdition, Question, sequelize } = require('../models');
  const pack = await findAccessiblePack(packId, user, { manage: true });
  if (pack.lifecycleStatus === 'published') return serializePack(pack);
  const { readiness } = await calculateReadiness(pack);
  if (!readiness.canPublish) {
    const error = new Error(readiness.blockers?.[0] || 'Complete every readiness check before publishing.');
    error.status = 409;
    error.readiness = readiness;
    throw error;
  }
  await sequelize.transaction(async (transaction) => {
    await Question.update({ lifecycleStatus: 'published', publishedAt: new Date() }, {
      where: { curriculumEditionId: pack.curriculumEditionId, lifecycleStatus: 'approved' },
      transaction,
    });
    await CurriculumEdition.update({ active: true, reviewedAt: new Date() }, {
      where: { id: pack.curriculumEditionId }, transaction,
    });
    await pack.update({ lifecycleStatus: 'published', publishedAt: new Date(), reviewedAt: new Date() }, { transaction });
  });
  const serialized = await serializePack(pack);
  await recordSubjectPackEvent('subject_pack_published', user.id, pack, {
    approvedQuestionCount: serialized.readiness?.questions?.ready || 0,
    coveredOutcomeCount: serialized.readiness?.coverage?.ready || 0,
  });
  return serialized;
}

async function createSubjectPackVersion(packId, user) {
  const {
    CurriculumEdition,
    CurriculumOutcome,
    Question,
    QuestionOutcome,
    SubjectPack,
    SubjectPackReviewItem,
    sequelize,
  } = require('../models');
  const sourcePack = await findAccessiblePack(packId, user, { manage: true });
  if (sourcePack.lifecycleStatus !== 'published') {
    const error = new Error('Publish the current pack before creating its next version.');
    error.status = 409;
    throw error;
  }
  const existing = await SubjectPack.findOne({ where: { slug: sourcePack.slug, version: Number(sourcePack.version) + 1 } });
  if (existing) return serializePack(existing);

  const nextPack = await sequelize.transaction(async (transaction) => {
    const sourceEdition = await CurriculumEdition.findByPk(sourcePack.curriculumEditionId, { transaction });
    const nextVersion = Number(sourcePack.version) + 1;
    const edition = await CurriculumEdition.create({
      key: `${sourceEdition.key}-V${nextVersion}-${crypto.randomUUID().slice(0, 6)}`.slice(0, 80),
      jurisdiction: sourceEdition.jurisdiction,
      subject: sourceEdition.subject,
      label: sourceEdition.label,
      officialSyllabusCode: sourceEdition.officialSyllabusCode,
      sourceUrl: sourceEdition.sourceUrl,
      firstHscCohortYear: sourceEdition.firstHscCohortYear,
      lastHscCohortYear: sourceEdition.lastHscCohortYear,
      reviewedAt: null,
      active: false,
      metadata: { ...(sourceEdition.metadata || {}), previousEditionId: sourceEdition.id, subjectPackVersion: nextVersion },
    }, { transaction });
    const createdPack = await SubjectPack.create({
      key: `${sourcePack.slug}:v${nextVersion}:${crypto.randomUUID().slice(0, 8)}`,
      slug: sourcePack.slug,
      version: nextVersion,
      title: sourcePack.title,
      description: sourcePack.description,
      jurisdiction: sourcePack.jurisdiction,
      subject: sourcePack.subject,
      syllabusVersion: sourcePack.syllabusVersion,
      curriculumEditionId: edition.id,
      createdBy: user.id,
      lifecycleStatus: 'in_review',
      sourceDocuments: normalizeSourceDocuments(sourcePack.sourceDocuments).map((source) => ({ ...source, verified: false })),
      metadata: { ...(sourcePack.metadata || {}), previousSubjectPackId: sourcePack.id },
    }, { transaction });

    const sourceOutcomes = await CurriculumOutcome.findAll({
      where: { curriculumEditionId: sourcePack.curriculumEditionId },
      order: [['sortOrder', 'ASC']],
      transaction,
    });
    const outcomeMap = new Map();
    for (const sourceOutcome of sourceOutcomes) {
      const row = plain(sourceOutcome);
      const cloned = await CurriculumOutcome.create({
        jurisdiction: row.jurisdiction,
        subject: row.subject,
        syllabusCode: row.syllabusCode,
        syllabusVersion: row.syllabusVersion,
        curriculumEditionId: edition.id,
        code: row.code,
        title: row.title,
        description: row.description,
        parentId: null,
        yearLevel: row.yearLevel,
        prerequisites: row.prerequisites,
        sortOrder: row.sortOrder,
        isAssessable: row.isAssessable,
        isActive: row.isActive,
        metadata: { ...(row.metadata || {}), subjectPackId: createdPack.id, previousOutcomeId: row.id },
      }, { transaction });
      outcomeMap.set(String(row.id), cloned);
    }
    for (const sourceOutcome of sourceOutcomes) {
      if (!sourceOutcome.parentId) continue;
      const cloned = outcomeMap.get(String(sourceOutcome.id));
      const clonedParent = outcomeMap.get(String(sourceOutcome.parentId));
      if (cloned && clonedParent) await cloned.update({ parentId: clonedParent.id }, { transaction });
    }

    const sourceQuestions = await Question.findAll({
      where: { curriculumEditionId: sourcePack.curriculumEditionId, lifecycleStatus: 'published' },
      transaction,
    });
    const sourceMappings = sourceQuestions.length ? await QuestionOutcome.findAll({
      where: { questionId: { [Op.in]: sourceQuestions.map((question) => question.id) } },
      transaction,
    }) : [];
    const mappingsByQuestion = new Map();
    for (const mapping of sourceMappings) {
      const list = mappingsByQuestion.get(String(mapping.questionId)) || [];
      list.push(mapping);
      mappingsByQuestion.set(String(mapping.questionId), list);
    }
    for (const sourceQuestion of sourceQuestions) {
      const row = plain(sourceQuestion);
      const cloned = await Question.create({
        ...QUESTION_EDITABLE_FIELDS.reduce((result, field) => ({ ...result, [field]: row[field] }), {}),
        questionKey: row.questionKey,
        sourceKey: `subject-pack:${createdPack.id}:${crypto.randomUUID()}`,
        version: Number(row.version || 1) + 1,
        previousVersionId: row.id,
        subject: createdPack.subject,
        syllabusVersion: createdPack.syllabusVersion,
        curriculumEditionId: edition.id,
        lifecycleStatus: 'approved',
        reviewedAt: row.reviewedAt,
        reviewedBy: row.reviewedBy,
        createdBy: user.id,
        publishedAt: null,
        metadata: { ...(row.metadata || {}), subjectPackId: createdPack.id, previousQuestionId: row.id },
      }, { transaction });
      const mappings = mappingsByQuestion.get(String(row.id)) || [];
      await QuestionOutcome.bulkCreate(mappings.map((mapping) => ({
        questionId: cloned.id,
        outcomeId: outcomeMap.get(String(mapping.outcomeId)).id,
        isPrimary: mapping.isPrimary,
        weight: mapping.weight,
        metadata: { ...(mapping.metadata || {}), subjectPackId: createdPack.id },
      })), { transaction });
    }
    await SubjectPackReviewItem.create({
      subjectPackId: createdPack.id,
      reviewKey: `verify-version-${nextVersion}-sources`,
      itemType: 'source_verification',
      entityType: 'curriculum_edition',
      entityId: edition.id,
      title: 'Verify sources for this version',
      summary: 'Confirm that the syllabus sources and carried-forward assessment content remain current before republishing.',
      sourceCitation: { label: createdPack.sourceDocuments?.[0]?.name || 'Official syllabus', url: createdPack.sourceDocuments?.[0]?.url || null },
      decisionOptions: [
        { id: 'verified', label: 'Sources are current', description: 'The source set and carried-forward mappings remain valid.', allowsPublish: true },
        { id: 'needs-editing', label: 'Changes are required', description: 'Keep this version locked while content is updated.', allowsPublish: false },
      ],
      sortOrder: 1,
    }, { transaction });
    await calculateReadiness(createdPack, { transaction });
    return createdPack;
  });
  const serialized = await serializePack(nextPack);
  await recordSubjectPackEvent('subject_pack_version_created', user.id, nextPack, { previousSubjectPackId: sourcePack.id });
  return serialized;
}

async function archiveSubjectPack(packId, user) {
  const { CurriculumEdition, Question, sequelize } = require('../models');
  const pack = await findAccessiblePack(packId, user, { manage: true });
  if (pack.lifecycleStatus === 'archived') return serializePack(pack);
  await sequelize.transaction(async (transaction) => {
    await Question.update({ lifecycleStatus: 'archived' }, {
      where: { curriculumEditionId: pack.curriculumEditionId, lifecycleStatus: { [Op.notIn]: ['superseded', 'archived'] } },
      transaction,
    });
    await CurriculumEdition.update({ active: false }, { where: { id: pack.curriculumEditionId }, transaction });
    await pack.update({ lifecycleStatus: 'archived' }, { transaction });
  });
  const serialized = await serializePack(pack);
  await recordSubjectPackEvent('subject_pack_archived', user.id, pack);
  return serialized;
}

module.exports = {
  archiveSubjectPack,
  buildReadinessSummary,
  calculateReadiness,
  createPackOutcome,
  createPackQuestion,
  createBusinessStudiesPack,
  createSubjectPackVersion,
  importSubjectPack,
  listSubjectPacks,
  listPublishedSubjectPacks,
  parseOutcomesFromText,
  publishSubjectPack,
  reopenReviewItem,
  resolveReviewItem,
  serializePack,
  syncBusinessStudiesTemplate,
  findAccessiblePack,
  transitionPackQuestion,
  updatePackOutcome,
  updatePackQuestion,
};
