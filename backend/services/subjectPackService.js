const crypto = require('crypto');
const { Op } = require('sequelize');
const businessStudies = require('../data/businessStudiesSubjectPack');

const SUBJECT_PACK_SOURCE = 'curriculum_studio';

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
  const pattern = /^([A-Z]{1,8}(?:[- ]?[A-Z]{0,5})?[- ]?\d{1,3}(?:[-.]\d{1,3})?|[PH]\d{1,2})\s+(.{8,500})$/;
  String(text).split(/\r?\n/).forEach((line) => {
    const normalized = line.replace(/\s+/g, ' ').trim();
    const match = normalized.match(pattern);
    if (!match) return;
    const code = match[1].replace(/\s+/g, '-').toUpperCase();
    if (seen.has(code)) return;
    seen.add(code);
    rows.push({ code, title: match[2].replace(/[.;:]$/, ''), description: match[2], yearLevel: null });
  });
  return rows.slice(0, 250);
}

async function calculateReadiness(pack, options = {}) {
  const {
    CurriculumOutcome,
    Question,
    SubjectPackReviewItem,
  } = require('../models');
  const query = options.transaction ? { transaction: options.transaction } : {};
  const [outcomes, questions, reviewItems] = await Promise.all([
    CurriculumOutcome.findAll({ where: { curriculumEditionId: pack.curriculumEditionId, isAssessable: true }, ...query }),
    Question.findAll({ where: { curriculumEditionId: pack.curriculumEditionId, lifecycleStatus: { [Op.notIn]: ['archived', 'superseded'] } }, ...query }),
    SubjectPackReviewItem.findAll({ where: { subjectPackId: pack.id }, order: [['sortOrder', 'ASC']], ...query }),
  ]);
  const open = reviewItems.filter((item) => item.status !== 'resolved');
  const unresolvedOutcomes = open.filter((item) => ['outcome_boundary', 'duplicate_statement', 'source_verification'].includes(item.itemType)).length;
  const unresolvedQuestions = open.filter((item) => item.itemType === 'source_evidence').length;
  const unresolvedRubrics = open.filter((item) => item.itemType === 'rubric_review').length;
  const rubricQuestions = questions.filter((question) => Array.isArray(question.rubric) && question.rubric.length);
  const sources = normalizeSourceDocuments(pack.sourceDocuments);
  const verifiedSources = sources.filter((source) => source.verified).length;
  const sourcePercent = sources.length ? Math.round((verifiedSources / sources.length) * 100) : 0;
  const readiness = {
    outcomes: { ready: Math.max(0, outcomes.length - unresolvedOutcomes), total: outcomes.length },
    questions: { ready: Math.max(0, questions.length - unresolvedQuestions), total: questions.length },
    rubrics: { ready: Math.max(0, rubricQuestions.length - unresolvedRubrics), total: rubricQuestions.length },
    sources: { verified: verifiedSources, total: sources.length, percent: sourcePercent },
    decisions: { open: open.length, resolved: reviewItems.length - open.length, total: reviewItems.length },
    canPublish: open.length === 0 && outcomes.length > 0 && questions.length >= 5 && sourcePercent === 100,
    generatedAt: new Date().toISOString(),
  };
  await pack.update({
    readiness,
    lifecycleStatus: readiness.canPublish && pack.lifecycleStatus === 'in_review' ? 'ready' : pack.lifecycleStatus,
    reviewedAt: readiness.canPublish ? new Date() : pack.reviewedAt,
  }, query);
  return { readiness, reviewItems };
}

async function serializePack(pack, options = {}) {
  const { CurriculumOutcome, Question, SubjectPackReviewItem } = require('../models');
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
  return {
    ...plain(pack),
    readiness: readinessResult.readiness,
    reviewItems: reviewItems.map(plain),
    outcomes: outcomes.map(plain),
    questions: questions.map((question) => {
      const row = plain(question);
      return {
        id: row.id,
        questionKey: row.questionKey,
        prompt: row.prompt,
        responseType: row.responseType,
        difficulty: row.difficulty,
        lifecycleStatus: row.lifecycleStatus,
        marks: row.marks,
        rubric: row.rubric,
        source: row.source,
      };
    }),
    studentLinks: {
      diagnostic: `/practice?subject=${encodeURIComponent(pack.subject)}&mode=diagnostic&source=curriculum-studio`,
      practice: `/practice?subject=${encodeURIComponent(pack.subject)}&mode=daily&source=curriculum-studio`,
      mastery: `/mastery?subject=${encodeURIComponent(pack.subject)}`,
    },
  };
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
  if (existing) return serializePack(existing);

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
        metadata: { source: SUBJECT_PACK_SOURCE, subjectPackId: createdPack.id },
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
  return serializePack(pack);
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
    verified: Boolean(input.sourceUrl),
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
        metadata: { source: SUBJECT_PACK_SOURCE, subjectPackId: createdPack.id },
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
        { id: 'verified', label: 'The extraction is accurate', description: 'Keep the detected outcomes and continue to question generation.' },
        { id: 'needs-editing', label: 'The extraction needs editing', description: 'Hold publication until the outcomes are corrected.' },
      ],
      sortOrder: 1,
    }, { transaction });
    await calculateReadiness(createdPack, { transaction });
    return createdPack;
  });
  return serializePack(pack);
}

async function listSubjectPacks(user) {
  const { SubjectPack } = require('../models');
  const where = user.role === 'admin'
    ? {}
    : { [Op.or]: [{ createdBy: user.id }, { lifecycleStatus: 'published' }] };
  const packs = await SubjectPack.findAll({ where, order: [['updatedAt', 'DESC']] });
  return Promise.all(packs.map((pack) => serializePack(pack, { includeContent: false, includeReviewItems: false })));
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

async function resolveReviewItem(packId, itemId, user, input = {}) {
  const { SubjectPackReviewItem } = require('../models');
  const pack = await findAccessiblePack(packId, user, { manage: true });
  if (pack.lifecycleStatus === 'published') { const error = new Error('Published subject packs cannot be changed. Create a new version first.'); error.status = 409; throw error; }
  const item = await SubjectPackReviewItem.findOne({ where: { id: itemId, subjectPackId: pack.id } });
  if (!item) { const error = new Error('Review decision not found.'); error.status = 404; throw error; }
  const optionId = String(input.optionId || '');
  const option = (item.decisionOptions || []).find((candidate) => String(candidate.id) === optionId);
  if (!option) { const error = new Error('Choose one of the available review decisions.'); error.status = 422; throw error; }
  await item.update({
    selectedOption: optionId,
    status: 'resolved',
    resolvedBy: user.id,
    resolvedAt: new Date(),
    resolution: { label: option.label, note: String(input.note || '').slice(0, 2000), decidedAt: new Date().toISOString() },
  });
  return serializePack(pack);
}

async function reopenReviewItem(packId, itemId, user) {
  const { SubjectPackReviewItem } = require('../models');
  const pack = await findAccessiblePack(packId, user, { manage: true });
  if (pack.lifecycleStatus === 'published') { const error = new Error('Published subject packs cannot be changed.'); error.status = 409; throw error; }
  const item = await SubjectPackReviewItem.findOne({ where: { id: itemId, subjectPackId: pack.id } });
  if (!item) { const error = new Error('Review decision not found.'); error.status = 404; throw error; }
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
    const error = new Error(readiness.decisions.open
      ? `Resolve ${readiness.decisions.open} review ${readiness.decisions.open === 1 ? 'decision' : 'decisions'} before publishing.`
      : 'This subject pack needs at least five reviewed questions and one verified source before publishing.');
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
  return serializePack(pack);
}

module.exports = {
  calculateReadiness,
  createBusinessStudiesPack,
  importSubjectPack,
  listSubjectPacks,
  parseOutcomesFromText,
  publishSubjectPack,
  reopenReviewItem,
  resolveReviewItem,
  serializePack,
  findAccessiblePack,
};
