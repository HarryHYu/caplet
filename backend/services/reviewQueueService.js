const { Op } = require('sequelize');
const { slideToText } = require('./slideCategorizer');

const REVIEW_LIMIT = 9;
const QUESTION_STATUSES = ['approved', 'published'];

function plain(value) {
  return value?.toJSON ? value.toJSON() : value;
}

function parseSlides(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

function optionParts(option, index) {
  if (typeof option === 'string' || typeof option === 'number') {
    return { value: String(option), label: String(option) };
  }
  return {
    value: String(option?.value ?? option?.id ?? option?.key ?? index),
    label: String(option?.label ?? option?.text ?? option?.value ?? `Option ${index + 1}`),
  };
}

function normalizedAnswerKey(answerKey) {
  if (typeof answerKey !== 'string') return answerKey;
  try { return JSON.parse(answerKey); } catch { return answerKey; }
}

function questionAnswer(question) {
  const row = plain(question) || {};
  if (row.modelAnswer) return row.modelAnswer;
  const key = normalizedAnswerKey(row.answerKey);
  const answerValue = key && typeof key === 'object'
    ? key.value ?? key.id ?? key.key ?? key.answer ?? key.index ?? key.letter
    : key;
  const options = (row.options || []).map(optionParts);
  const answer = options.find((option, index) => (
    String(option.value).toLowerCase() === String(answerValue).toLowerCase()
    || String(index).toLowerCase() === String(answerValue).toLowerCase()
    || String.fromCharCode(65 + index).toLowerCase() === String(answerValue).toLowerCase()
  ));
  return answer?.label || row.explanation || 'Compare your response with the source explanation.';
}

function publicReviewQuestion(question, outcome) {
  const row = plain(question);
  if (!row) return null;
  return {
    id: row.id,
    prompt: row.prompt,
    responseType: row.responseType,
    options: Array.isArray(row.options) ? row.options : [],
    marks: Number(row.marks || 1),
    answer: questionAnswer(row),
    explanation: row.explanation || row.modelAnswer || '',
    misconception: Array.isArray(row.misconceptions)
      ? row.misconceptions.map((item) => (
        typeof item === 'string' ? item : item?.label || item?.description || item?.code
      )).filter(Boolean)[0] || ''
      : '',
    outcome: outcome ? {
      id: outcome.id,
      code: outcome.code,
      title: outcome.title,
      subject: outcome.subject,
    } : null,
  };
}

function subjectLabel(subject) {
  const value = String(subject || '').toLowerCase();
  if (value.includes('business')) return 'Business Studies';
  if (value.includes('english')) return 'English';
  return 'Economics';
}

function makeOutcomeItem(state, questions = []) {
  const outcome = plain(state.outcome);
  const primary = publicReviewQuestion(questions[0], outcome);
  if (!outcome || !primary) return null;
  const repair = publicReviewQuestion(questions[1], outcome);
  return {
    id: `outcome:${outcome.id}`,
    itemType: 'outcome',
    itemId: String(outcome.id),
    kind: 'outcome',
    group: 'outcomes',
    groupLabel: `${subjectLabel(outcome.subject)} outcomes`,
    sourceLabel: [outcome.code, outcome.title].filter(Boolean).join(' · '),
    dueAt: state.nextReviewAt,
    recentMiss: Array.isArray(state.misconceptions) && state.misconceptions.length > 0,
    prompt: primary.prompt,
    responseType: primary.responseType,
    options: primary.options,
    answer: primary.answer,
    explanation: primary.explanation,
    misconception: primary.misconception
      || (Array.isArray(state.misconceptions) ? String(state.misconceptions[0] || '') : ''),
    repairPrompt: repair?.prompt || `Apply ${outcome.title} to a different real-world example.`,
    repairResponseType: repair?.responseType || 'short_answer',
    repairOptions: repair?.options || [],
    repairAnswer: repair?.answer || primary.answer,
  };
}

function makeSavedSlideItem(savedSlide, review) {
  const row = plain(savedSlide);
  const slides = parseSlides(row.lesson?.slides);
  const sourceText = slideToText(slides[row.slideIndex]) || row.lesson?.title || 'Saved lesson slide';
  const lessonTitle = row.lesson?.title || 'Saved lesson';
  return {
    id: `savedSlide:${row.id}`,
    itemType: 'savedSlide',
    itemId: String(row.id),
    kind: 'savedSlide',
    group: 'savedSlides',
    groupLabel: 'Saved lesson slides',
    sourceLabel: [row.course?.title, lessonTitle].filter(Boolean).join(' · '),
    dueAt: review?.nextDueAt || row.createdAt,
    recentMiss: review?.lastRecall === 'fail',
    prompt: `Without reopening the slide, explain the key idea you saved from “${lessonTitle}”.`,
    responseType: 'short_answer',
    options: [],
    answer: sourceText.slice(0, 2400),
    explanation: 'Compare your answer with the original lesson slide.',
    misconception: review?.lastRecall === 'fail' ? 'This idea was difficult to retrieve last time.' : '',
    repairPrompt: `Use the idea from “${lessonTitle}” in a new example of your own.`,
    repairResponseType: 'short_answer',
    repairOptions: [],
    repairAnswer: sourceText.slice(0, 2400),
  };
}

function parseEssayItemId(itemId) {
  const value = String(itemId || '');
  const separator = value.indexOf(':');
  if (separator < 1) return null;
  const essayId = value.slice(0, separator);
  const suffix = value.slice(separator + 1);
  if (suffix.startsWith('q:')) {
    const [, paragraphIndex, quoteIndex] = suffix.split(':');
    return {
      essayId,
      kind: 'quote',
      paragraphIndex: Number(paragraphIndex),
      quoteIndex: Number(quoteIndex),
    };
  }
  return { essayId, kind: 'paragraph', paragraphIndex: Number(suffix), quoteIndex: null };
}

function makeEssayItem(review, essay) {
  const ref = parseEssayItemId(review.itemId);
  const row = plain(essay);
  const paragraph = row?.parsedStructure?.bodyParagraphs?.[ref?.paragraphIndex];
  if (!ref || !row || !paragraph) return null;
  const quote = ref.kind === 'quote' ? paragraph.quotes?.[ref.quoteIndex] : null;
  const answer = quote?.text || paragraph.text || paragraph.topicSentence;
  if (!answer) return null;
  const paragraphNumber = ref.paragraphIndex + 1;
  return {
    id: `${review.itemType}:${review.itemId}`,
    itemType: review.itemType,
    itemId: String(review.itemId),
    kind: 'essay',
    group: 'essays',
    groupLabel: 'Essay paragraphs',
    sourceLabel: `${row.title} · ${quote ? 'Quote' : `Body paragraph ${paragraphNumber}`}`,
    dueAt: review.nextDueAt,
    recentMiss: review.lastRecall === 'fail',
    prompt: quote
      ? `Recall this quote and explain how it supports body paragraph ${paragraphNumber}.`
      : `Reconstruct the argument of body paragraph ${paragraphNumber} from “${row.title}”.`,
    responseType: 'extended_response',
    options: [],
    answer: String(answer).slice(0, 4000),
    explanation: quote
      ? `Connect the quote to: ${paragraph.topicSentence || 'the paragraph’s central claim.'}`
      : paragraph.topicSentence || 'Compare the structure and evidence with your original paragraph.',
    misconception: review.lastRecall === 'fail' ? 'This passage did not come back cleanly last time.' : '',
    repairPrompt: quote
      ? 'Write the quote again, then name one technique and its effect.'
      : `Write only the topic sentence and one supporting piece of evidence for paragraph ${paragraphNumber}.`,
    repairResponseType: 'extended_response',
    repairOptions: [],
    repairAnswer: String(paragraph.topicSentence || answer).slice(0, 2400),
  };
}

function reviewSort(left, right) {
  if (left.recentMiss !== right.recentMiss) return left.recentMiss ? -1 : 1;
  return new Date(left.dueAt || 0).getTime() - new Date(right.dueAt || 0).getTime();
}

function groupSummary(items) {
  const definitions = [
    {
      id: 'outcomes',
      label: items.find((item) => item.group === 'outcomes')?.groupLabel || 'Curriculum outcomes',
      rationale: 'Strengthen concepts that are due or recently missed.',
    },
    {
      id: 'savedSlides',
      label: 'Saved lesson slides',
      rationale: 'Retrieve the key ideas you chose to keep.',
    },
    {
      id: 'essays',
      label: 'Essay paragraphs',
      rationale: 'Rebuild important arguments and evidence.',
    },
  ];
  return definitions.map((definition) => {
    const count = items.filter((item) => item.group === definition.id).length;
    return {
      ...definition,
      count,
      estimatedMinutes: count ? Math.max(1, Math.ceil(count * 1.25)) : 0,
    };
  });
}

async function availableRows(label, operation) {
  try {
    return await operation;
  } catch (error) {
    console.error(`Review queue ${label} source error:`, error.message);
    return [];
  }
}

async function getReviewQueue(userId, { now = new Date(), limit = REVIEW_LIMIT } = {}) {
  const {
    Course,
    Essay,
    Lesson,
    MasteryState,
    Question,
    QuestionOutcome,
    ReviewItem,
    SavedSlide,
  } = require('../models');

  const [states, slides, scheduledEssayItems] = await Promise.all([
    availableRows('mastery', MasteryState.findAll({
      where: {
        userId,
        evidenceCount: { [Op.gt]: 0 },
        nextReviewAt: { [Op.lte]: now },
      },
      include: [{ association: 'outcome', required: true }],
      order: [['nextReviewAt', 'ASC']],
    })),
    availableRows('saved slides', SavedSlide.findAll({
      where: { userId },
      include: [
        { model: Lesson, as: 'lesson', attributes: ['id', 'title', 'slides'] },
        { model: Course, as: 'course', attributes: ['id', 'title'] },
      ],
      order: [['createdAt', 'ASC']],
    })),
    availableRows('essay schedule', ReviewItem.findAll({
      where: {
        userId,
        itemType: { [Op.in]: ['essayParagraph', 'quote'] },
        nextDueAt: { [Op.lte]: now },
      },
      order: [['nextDueAt', 'ASC']],
    })),
  ]);

  const outcomeIds = states.map((state) => String(state.outcomeId));
  const mappings = outcomeIds.length
    ? await availableRows('outcome questions', QuestionOutcome.findAll({
      where: { outcomeId: { [Op.in]: outcomeIds } },
      include: [{
        model: Question,
        as: 'question',
        required: true,
        where: { lifecycleStatus: { [Op.in]: QUESTION_STATUSES } },
      }],
      order: [['isPrimary', 'DESC'], ['createdAt', 'ASC']],
    }))
    : [];
  const questionsByOutcome = new Map();
  mappings.forEach((mapping) => {
    const key = String(mapping.outcomeId);
    const questions = questionsByOutcome.get(key) || [];
    if (!questions.some((question) => String(question.id) === String(mapping.question?.id))) {
      questions.push(mapping.question);
    }
    questionsByOutcome.set(key, questions);
  });

  const slideIds = slides.map((slide) => String(slide.id));
  const slideReviews = slideIds.length
    ? await availableRows('saved slide schedule', ReviewItem.findAll({
      where: { userId, itemType: 'savedSlide', itemId: { [Op.in]: slideIds } },
    }))
    : [];
  const slideReviewById = new Map(slideReviews.map((review) => [String(review.itemId), plain(review)]));

  const essayRefs = scheduledEssayItems.map((review) => parseEssayItemId(review.itemId)).filter(Boolean);
  const essayIds = [...new Set(essayRefs.map((ref) => ref.essayId))];
  const essays = essayIds.length
    ? await availableRows('essays', Essay.findAll({ where: { userId, id: { [Op.in]: essayIds } } }))
    : [];
  const essayById = new Map(essays.map((essay) => [String(essay.id), essay]));

  const items = [
    ...states.map((state) => makeOutcomeItem(state, questionsByOutcome.get(String(state.outcomeId)) || [])),
    ...slides.map((slide) => {
      const review = slideReviewById.get(String(slide.id));
      const due = !review || new Date(review.nextDueAt).getTime() <= now.getTime();
      return due ? makeSavedSlideItem(slide, review) : null;
    }),
    ...scheduledEssayItems.map((review) => {
      const ref = parseEssayItemId(review.itemId);
      return makeEssayItem(plain(review), essayById.get(ref?.essayId));
    }),
  ].filter(Boolean).sort(reviewSort);

  const cappedItems = items.slice(0, Math.max(1, Number(limit) || REVIEW_LIMIT));
  const groups = groupSummary(cappedItems);
  return {
    generatedAt: now.toISOString(),
    totalDue: items.length,
    estimatedMinutes: groups.reduce((sum, group) => sum + group.estimatedMinutes, 0),
    groups,
    items: cappedItems,
    truncated: items.length > cappedItems.length,
  };
}

module.exports = {
  REVIEW_LIMIT,
  getReviewQueue,
  groupSummary,
  makeEssayItem,
  makeOutcomeItem,
  makeSavedSlideItem,
  parseEssayItemId,
  questionAnswer,
  reviewSort,
  availableRows,
};
