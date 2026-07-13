const RESPONSE_TYPES = new Set(['multiple_choice', 'numeric', 'short_answer', 'stimulus_response', 'extended_response']);

function validateQuestion(input = {}) {
  const errors = [];
  const warnings = [];
  const prompt = String(input.prompt || '').trim();
  const responseType = String(input.responseType || '');
  const options = Array.isArray(input.options) ? input.options.filter((option) => String(option).trim()) : [];
  const outcomeIds = Array.isArray(input.outcomeIds) ? input.outcomeIds.filter(Boolean) : [];
  const marks = Number(input.marks);
  const publicationGate = ['approved', 'published'].includes(String(input.lifecycleStatus || ''));
  const qualityIssue = (issue) => (publicationGate ? errors : warnings).push(issue);

  if (prompt.length < 5) errors.push({ code: 'missing_prompt', message: 'Write a clear question prompt.' });
  if (!RESPONSE_TYPES.has(responseType)) errors.push({ code: 'invalid_response_type', message: 'Choose a supported response type.' });
  if (!Number.isInteger(marks) || marks < 1 || marks > 50) errors.push({ code: 'invalid_marks', message: 'Marks must be a whole number between 1 and 50.' });
  if (!outcomeIds.length) errors.push({ code: 'missing_outcomes', message: 'Map the question to at least one curriculum outcome.' });

  if (responseType === 'multiple_choice') {
    if (options.length < 2) errors.push({ code: 'missing_options', message: 'Multiple-choice questions need at least two options.' });
    if (input.answerKey == null || input.answerKey === '') errors.push({ code: 'missing_answer', message: 'Choose the correct multiple-choice answer.' });
    if (!String(input.explanation || '').trim()) qualityIssue({ code: 'missing_explanation', message: 'Add an explanation so learners understand the answer.' });
  } else {
    if (!String(input.modelAnswer || '').trim()) qualityIssue({ code: 'missing_model_answer', message: 'Add a model answer for consistent feedback.' });
    if (!Array.isArray(input.rubric) || !input.rubric.length) qualityIssue({ code: 'missing_rubric', message: 'Add a marking rubric before using this for assessment.' });
  }
  if (!input.syllabusVersion) qualityIssue({ code: 'missing_syllabus', message: 'Record the syllabus version.' });
  if (!input.source?.url && !input.source?.title && !input.source?.citation && !input.source?.provenance && !input.source?.notes) qualityIssue({ code: 'missing_source', message: 'Record a source, citation, or provenance note.' });
  if (!input.reviewedAt) qualityIssue({ code: 'missing_review_date', message: 'Record when the question and its source were reviewed.' });
  const reviewedAt = input.reviewedAt ? new Date(input.reviewedAt) : null;
  if (reviewedAt && Number.isNaN(reviewedAt.getTime())) {
    qualityIssue({ code: 'invalid_review_date', message: 'Use a valid review date.' });
  } else if (reviewedAt && reviewedAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    qualityIssue({ code: 'future_review_date', message: 'The review date cannot be in the future.' });
  } else if (reviewedAt && Date.now() - reviewedAt.getTime() > 365 * 24 * 60 * 60 * 1000) {
    qualityIssue({ code: 'stale_review', message: 'Review this question and its source again before approval.' });
  }
  if (!input.difficulty) qualityIssue({ code: 'missing_difficulty', message: 'Set a difficulty so adaptive selection can balance the session.' });
  if (!input.expectedMinutes) qualityIssue({ code: 'missing_time', message: 'Estimate the time required.' });

  return { ok: errors.length === 0, errors, warnings, checkedAt: new Date().toISOString() };
}

module.exports = { RESPONSE_TYPES, validateQuestion };
