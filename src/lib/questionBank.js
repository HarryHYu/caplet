export const RESPONSE_TYPES = [
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'short_answer', label: 'Short answer' },
  { value: 'stimulus_response', label: 'Stimulus response' },
  { value: 'extended_response', label: 'Extended response' },
  { value: 'numeric', label: 'Numeric / calculation' },
];

export const DIFFICULTIES = [
  { value: 'foundation', label: 'Foundation' },
  { value: 'standard', label: 'Standard' },
  { value: 'challenging', label: 'Challenging' },
  { value: 'exam', label: 'Exam / transfer' },
];

export const LIFECYCLE_LABELS = {
  draft: 'Draft',
  in_review: 'In review',
  approved: 'Approved',
  published: 'Published',
  superseded: 'Superseded',
  archived: 'Archived',
};

const asLines = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string' || typeof item === 'number') return String(item);
      return item?.description || item?.label || item?.text || item?.code || JSON.stringify(item);
    }).filter(Boolean).join('\n');
  }
  return value ? String(value) : '';
};

const answerText = (answerKey) => {
  if (answerKey == null) return '';
  if (typeof answerKey === 'string' || typeof answerKey === 'number') return String(answerKey);
  return String(answerKey.text ?? answerKey.value ?? answerKey.answer ?? '');
};

function outcomeIdsFor(question) {
  if (Array.isArray(question?.outcomeIds)) return question.outcomeIds.map(String);
  if (Array.isArray(question?.outcomes)) return question.outcomes.map((outcome) => String(outcome.id ?? outcome.outcomeId ?? outcome)).filter(Boolean);
  if (Array.isArray(question?.QuestionOutcomes)) return question.QuestionOutcomes.map((mapping) => String(mapping.outcomeId ?? mapping.CurriculumOutcome?.id)).filter(Boolean);
  return [];
}

export function emptyQuestion(subject = 'economics') {
  return {
    id: null,
    questionKey: '',
    version: 1,
    subject,
    syllabusVersion: '',
    prompt: '',
    responseType: 'multiple_choice',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    answerText: '',
    explanation: '',
    difficulty: 'standard',
    marks: 1,
    expectedMinutes: 2,
    commandVerb: '',
    rubricText: '',
    modelAnswer: '',
    misconceptionsText: '',
    sourceTitle: '',
    sourceUrl: '',
    sourceAuthor: '',
    sourceYear: '',
    sourceNotes: '',
    sourceKey: '',
    outcomeIds: [],
    lifecycleStatus: 'draft',
    metadata: {},
    createdAt: null,
    updatedAt: null,
  };
}

export function normalizeQuestion(question, fallbackSubject = 'economics') {
  const options = Array.isArray(question?.options) ? question.options.map((option) => (
    typeof option === 'string' || typeof option === 'number'
      ? String(option)
      : String(option?.label ?? option?.text ?? option?.value ?? '')
  )) : [];
  const answerKey = question?.answerKey;
  let correctOptionIndex = Number(answerKey?.index);
  if (!Number.isInteger(correctOptionIndex) || correctOptionIndex < 0) {
    const keyedValue = answerKey?.value ?? answerKey?.text ?? answerKey;
    correctOptionIndex = Math.max(0, options.findIndex((option) => String(option) === String(keyedValue)));
  }
  const source = typeof question?.source === 'object' && question.source ? question.source : {};

  return {
    ...emptyQuestion(question?.subject || fallbackSubject),
    ...question,
    id: question?.id || null,
    questionKey: question?.questionKey || '',
    version: Number(question?.version || 1),
    subject: question?.subject || fallbackSubject,
    syllabusVersion: question?.syllabusVersion || '',
    prompt: question?.prompt || '',
    responseType: question?.responseType || 'multiple_choice',
    options: options.length ? options : ['', '', '', ''],
    correctOptionIndex,
    answerText: answerText(answerKey),
    explanation: question?.explanation || '',
    difficulty: question?.difficulty || 'standard',
    marks: Number(question?.marks || 1),
    expectedMinutes: Number(question?.expectedMinutes || 2),
    commandVerb: question?.commandVerb || '',
    rubricText: asLines(question?.rubric),
    modelAnswer: question?.modelAnswer || '',
    misconceptionsText: asLines(question?.misconceptions),
    sourceTitle: source.title || source.name || '',
    sourceUrl: source.url || '',
    sourceAuthor: source.author || source.provider || '',
    sourceYear: source.year ? String(source.year) : '',
    sourceNotes: source.notes || source.description || '',
    sourceKey: question?.sourceKey || '',
    outcomeIds: outcomeIdsFor(question),
    lifecycleStatus: question?.lifecycleStatus || question?.status || 'draft',
    metadata: question?.metadata || {},
  };
}

const splitLines = (value) => String(value || '').split('\n').map((line) => line.trim()).filter(Boolean);

export function questionPayload(draft) {
  const optionEntries = draft.responseType === 'multiple_choice'
    ? (draft.options || [])
      .map((option, originalIndex) => ({ originalIndex, value: String(option).trim() }))
      .filter((option) => option.value)
    : [];
  const options = optionEntries.map((option) => option.value);
  const selectedIndex = optionEntries.findIndex((option) => option.originalIndex === Number(draft.correctOptionIndex));
  const correctIndex = selectedIndex >= 0 ? selectedIndex : 0;
  let answerKey = null;
  if (draft.responseType === 'multiple_choice' && options.length) {
    answerKey = { index: correctIndex, value: options[correctIndex] };
  } else if (draft.answerText.trim()) {
    answerKey = draft.responseType === 'numeric'
      ? { value: draft.answerText.trim() }
      : { text: draft.answerText.trim() };
  }

  return {
    subject: draft.subject.trim().toLowerCase(),
    syllabusVersion: draft.syllabusVersion.trim() || null,
    prompt: draft.prompt.trim(),
    responseType: draft.responseType,
    options,
    answerKey,
    explanation: draft.explanation.trim() || null,
    difficulty: draft.difficulty || null,
    marks: Math.max(1, Number(draft.marks) || 1),
    expectedMinutes: Math.max(1, Number(draft.expectedMinutes) || 1),
    commandVerb: draft.commandVerb.trim() || null,
    rubric: splitLines(draft.rubricText),
    modelAnswer: draft.modelAnswer.trim() || null,
    misconceptions: splitLines(draft.misconceptionsText),
    source: {
      title: draft.sourceTitle.trim() || null,
      url: draft.sourceUrl.trim() || null,
      author: draft.sourceAuthor.trim() || null,
      year: draft.sourceYear.trim() || null,
      notes: draft.sourceNotes.trim() || null,
    },
    sourceKey: draft.sourceKey.trim() || null,
    outcomeIds: [...new Set((draft.outcomeIds || []).map(String))],
    metadata: draft.metadata || {},
  };
}

export function questionSignature(draft) {
  return draft ? JSON.stringify(questionPayload(draft)) : '';
}

export function validateQuestionDraft(draft) {
  const errors = [];
  if (!draft.subject.trim()) errors.push('Choose a subject.');
  if (!draft.prompt.trim()) errors.push('Write the question prompt.');
  if (!draft.responseType) errors.push('Choose a response type.');
  if (Number(draft.marks) < 1) errors.push('Marks must be at least 1.');
  if (Number(draft.expectedMinutes) < 1) errors.push('Expected time must be at least 1 minute.');
  if (draft.responseType === 'multiple_choice') {
    const options = (draft.options || [])
      .map((option, originalIndex) => ({ originalIndex, value: String(option).trim() }))
      .filter((option) => option.value);
    if (options.length < 2) errors.push('Add at least two answer options.');
    if (!options.some((option) => option.originalIndex === Number(draft.correctOptionIndex))) {
      errors.push('Choose a valid correct option.');
    }
  }
  return errors;
}

export function reviewReadiness(draft) {
  const checks = [
    { key: 'outcomes', label: 'Mapped to at least one syllabus outcome', ok: draft.outcomeIds.length > 0 },
    { key: 'explanation', label: 'Includes an answer explanation', ok: Boolean(draft.explanation.trim()) },
    { key: 'rubric', label: 'Includes marking criteria', ok: Boolean(draft.rubricText.trim()) },
    { key: 'model', label: 'Includes a model answer', ok: Boolean(draft.modelAnswer.trim()) },
    { key: 'source', label: 'Includes source provenance', ok: Boolean(draft.sourceTitle.trim() || draft.sourceUrl.trim()) },
    { key: 'misconceptions', label: 'Documents likely misconceptions', ok: Boolean(draft.misconceptionsText.trim()) },
  ];
  return checks;
}
