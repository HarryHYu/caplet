const path = require('path');
const { pathToFileURL } = require('url');
const { ECONOMICS_OUTCOMES } = require('../data/economicsCurriculum');
const { validateQuestion } = require('./questionValidation');

let seedPromise = null;

function answerFromLetter(answer, options = []) {
  if (typeof answer !== 'string') return answer ?? null;
  const index = answer.trim().toUpperCase().charCodeAt(0) - 65;
  return index >= 0 && index < options.length ? { index, value: options[index], letter: answer.trim().toUpperCase() } : answer;
}

function syllabusVersionFor(resource = {}, fallback = 'NSW-2025') {
  const explicit = resource.syllabusVersion || resource.syllabusCode || resource.syllabus;
  return /2009/.test(String(explicit || '')) ? 'NSW-2009' : fallback;
}

function normaliseResource(resource, area, suffix = '') {
  const sourceId = `${resource.id || `${area.id}-${resource.type}`}${suffix}`;
  const syllabusVersion = syllabusVersionFor(resource);
  const base = {
    sourceKey: `economics:${sourceId}`,
    subject: 'economics',
    syllabusVersion,
    difficulty: String(resource.difficulty || 'core').toLowerCase(),
    expectedMinutes: Math.max(1, Number(resource.expectedMinutes || resource.marks || 3)),
    commandVerb: String(resource.question || resource.prompt || resource.stem || '').trim().split(/\s+/)[0]?.toLowerCase() || null,
    source: {
      externalId: sourceId,
      focusId: area.id,
      focusTitle: area.title,
      sourceUrl: area.sourceUrl || null,
      provenance: resource.sourceNote || 'Caplet syllabus-aligned resource library',
    },
    lifecycleStatus: syllabusVersion === 'NSW-2009' ? 'in_review' : 'published',
    version: 1,
    reviewedAt: new Date(),
    metadata: {
      resourceType: resource.type,
      focusArea: area.title,
      curriculumEditionKey: `NSW-ECO-${syllabusVersion.slice(-4)}`,
      requiresEditionReview: syllabusVersion === 'NSW-2009',
    },
  };

  if (resource.type === 'multipleChoice') {
    const options = Array.isArray(resource.options) ? resource.options : [];
    return [{
      ...base,
      prompt: resource.stem,
      responseType: 'multiple_choice',
      marks: Number(resource.marks || 1),
      options,
      answerKey: answerFromLetter(resource.answer, options),
      explanation: resource.explanation || '',
      rubric: [],
      modelAnswer: String(resource.explanation || ''),
      misconceptions: [],
      outcomes: resource.outcomes || area.outcomes || [],
    }];
  }

  if (resource.type === 'shortAnswer') {
    return [{
      ...base,
      prompt: [resource.stimulus, resource.question].filter(Boolean).join('\n\n'),
      responseType: 'short_answer',
      marks: Number(resource.marks || 4),
      options: [],
      answerKey: null,
      explanation: '',
      rubric: resource.markingGuide || [],
      modelAnswer: resource.sampleAnswer || '',
      misconceptions: [],
      outcomes: resource.outcomes || area.outcomes || [],
    }];
  }

  if (resource.type === 'extendedResponse') {
    return [{
      ...base,
      prompt: resource.prompt,
      responseType: 'extended_response',
      marks: Number(resource.marks || 20),
      expectedMinutes: Number(resource.expectedMinutes || 40),
      options: [],
      answerKey: null,
      explanation: '',
      rubric: resource.rubric || resource.planningFrame || [],
      modelAnswer: resource.exemplarThesis || '',
      misconceptions: [],
      outcomes: resource.outcomes || area.outcomes || [],
    }];
  }

  if (resource.type === 'topicDrill') {
    const questions = [];
    if (resource.quickCheck?.stem) {
      const options = resource.quickCheck.options || [];
      questions.push({
        ...base,
        sourceKey: `${base.sourceKey}:quick`,
        prompt: resource.quickCheck.stem,
        responseType: 'multiple_choice',
        marks: 1,
        expectedMinutes: 2,
        options,
        answerKey: answerFromLetter(resource.quickCheck.answer, options),
        explanation: resource.quickCheck.explanation || resource.keyIdea || '',
        rubric: [],
        modelAnswer: resource.quickCheck.explanation || '',
        misconceptions: [],
        outcomes: resource.outcomes || area.outcomes || [],
      });
    }
    if (resource.practicePrompt) {
      questions.push({
        ...base,
        sourceKey: `${base.sourceKey}:practice`,
        prompt: resource.practicePrompt,
        responseType: 'short_answer',
        marks: Number(resource.marks || 5),
        options: [],
        answerKey: null,
        explanation: resource.keyIdea || '',
        rubric: resource.markingGuide || [],
        modelAnswer: resource.sampleAnswer || '',
        misconceptions: [],
        outcomes: resource.outcomes || area.outcomes || [],
      });
    }
    return questions;
  }

  if (resource.type === 'stimulusSet') {
    return (resource.questions || []).map((question, index) => ({
      ...base,
      sourceKey: `${base.sourceKey}:question:${index + 1}`,
      prompt: [resource.context, JSON.stringify(resource.data || ''), question.prompt].filter(Boolean).join('\n\n'),
      responseType: Number(question.marks || 1) <= 6 ? 'short_answer' : 'extended_response',
      marks: Number(question.marks || 4),
      options: [],
      answerKey: null,
      explanation: '',
      rubric: question.markingGuide || resource.markingGuide || [],
      modelAnswer: question.sampleAnswer || resource.sampleResponse || '',
      misconceptions: [],
      outcomes: question.outcomes || resource.outcomes || area.outcomes || [],
    }));
  }

  return [];
}

async function importLibraryModule() {
  const modulePath = path.resolve(__dirname, '../../src/data/economicsResourceLibrary.js');
  return import(pathToFileURL(modulePath).href);
}

async function ensureEconomicsQuestionBank() {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const { CurriculumOutcome, CurriculumEdition, Question, QuestionOutcome } = require('../models');
    const currentEdition = CurriculumEdition?.findOne
      ? await CurriculumEdition.findOne({ where: { key: 'NSW-ECO-2025' } })
      : null;
    const parentByYear = {};
    for (const year of [11, 12]) {
      const [parent] = await CurriculumOutcome.findOrCreate({
        where: { jurisdiction: 'NSW', subject: 'economics', syllabusVersion: 'NSW-2025', code: `ECO-${year}` },
        defaults: {
          title: `Year ${year} Economics`,
          description: `NSW Economics ${year}–12 syllabus outcomes`,
          parentId: null,
          prerequisites: [],
          sortOrder: year === 11 ? 0 : 100,
          isActive: true,
          metadata: { level: 'year', year },
          curriculumEditionId: currentEdition?.id || null,
        },
      });
      parentByYear[year] = parent;
    }

    const outcomesByCode = new Map();
    let sortOrder = 1;
    for (const [code, title] of Object.entries(ECONOMICS_OUTCOMES)) {
      const year = code.includes('-11-') ? 11 : 12;
      const [outcome] = await CurriculumOutcome.findOrCreate({
        where: { jurisdiction: 'NSW', subject: 'economics', syllabusVersion: 'NSW-2025', code },
        defaults: {
          title,
          description: title,
          parentId: parentByYear[year].id,
          prerequisites: [],
          sortOrder: year === 11 ? sortOrder : 100 + sortOrder,
          isActive: true,
          metadata: { level: 'outcome', year },
          curriculumEditionId: currentEdition?.id || null,
        },
      });
      outcomesByCode.set(code, outcome);
      sortOrder += 1;
    }

    const libraryModule = await importLibraryModule();
    const library = libraryModule.economicsResourceLibrary;
    const normalized = [];
    for (const area of library.focusAreas || []) {
      const resources = libraryModule.getEconomicsAreaResources(area);
      for (const resource of resources) normalized.push(...normaliseResource(resource, area));
    }
    for (const pack of library.examPracticePacks || []) {
      const area = { id: pack.id, title: pack.title, outcomes: [], sourceUrl: pack.sourceUrl };
      for (const markable of libraryModule.getExamPackMarkableQuestions(pack)) {
        normalized.push({
          sourceKey: `economics:${markable.id}`,
          subject: 'economics',
          syllabusVersion: syllabusVersionFor(pack),
          prompt: [markable.stimulus, markable.prompt].filter(Boolean).join('\n\n'),
          responseType: markable.responseType,
          difficulty: 'exam',
          marks: Number(markable.markValue || 4),
          expectedMinutes: Math.max(3, Number(markable.markValue || 4) * 2),
          commandVerb: String(markable.prompt || '').trim().split(/\s+/)[0]?.toLowerCase(),
          options: [], answerKey: null, explanation: '', rubric: [], modelAnswer: '', misconceptions: [],
          source: { externalId: markable.id, focusId: area.id, focusTitle: area.title, provenance: pack.sourceNote || 'Caplet original exam practice' },
          lifecycleStatus: syllabusVersionFor(pack) === 'NSW-2009' ? 'in_review' : 'published', version: 1, reviewedAt: new Date(),
          metadata: { resourceType: 'exam', section: markable.section, focusArea: markable.focusArea, transfer: true, curriculumEditionKey: `NSW-ECO-${syllabusVersionFor(pack).slice(-4)}`, requiresEditionReview: syllabusVersionFor(pack) === 'NSW-2009' },
          outcomes: pack.outcomes || [],
        });
      }
    }

    let created = 0;
    for (const item of normalized.filter((question) => question.prompt)) {
      const { outcomes, ...values } = item;
      const editionKey = `NSW-ECO-${String(values.syllabusVersion || 'NSW-2025').slice(-4)}`;
      const edition = CurriculumEdition?.findOne ? await CurriculumEdition.findOne({ where: { key: editionKey } }) : null;
      values.curriculumEditionId = edition?.id || null;
      const mappedOutcomes = outcomes.map((code) => outcomesByCode.get(code)).filter(Boolean);
      const validation = validateQuestion({
        ...values,
        lifecycleStatus: 'published',
        outcomeIds: mappedOutcomes.map((outcome) => outcome.id),
      });
      const governedValues = validation.ok
        ? values
        : {
            ...values,
            lifecycleStatus: 'in_review',
            publishedAt: null,
            metadata: { ...(values.metadata || {}), publishingChecks: validation.errors.map((issue) => issue.code) },
          };
      const [question, wasCreated] = await Question.findOrCreate({ where: { sourceKey: item.sourceKey }, defaults: governedValues });
      if (wasCreated) created += 1;
      if (!wasCreated && question.lifecycleStatus === 'published' && !validation.ok) {
        await question.update({ lifecycleStatus: 'in_review', publishedAt: null, metadata: governedValues.metadata });
      }
      for (const outcome of mappedOutcomes) {
        await QuestionOutcome.findOrCreate({
          where: { questionId: question.id, outcomeId: outcome.id },
          defaults: { weight: 1, metadata: {} },
        });
      }
    }
    return { outcomes: outcomesByCode.size, questions: normalized.length, created };
  })().catch((error) => {
    seedPromise = null;
    throw error;
  });
  return seedPromise;
}

module.exports = { answerFromLetter, ensureEconomicsQuestionBank, normaliseResource };
