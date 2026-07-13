const { validateSlides } = require('../utils/slideSchema');

const ALLOWED_EMBED_HOSTS = new Set([
  'www.youtube.com', 'youtube.com', 'youtu.be', 'player.vimeo.com',
  'www.desmos.com', 'desmos.com', 'phet.colorado.edu', 'www.google.com',
]);

function validHttpUrl(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol); } catch { return false; }
}

function validateLessonContent(input = {}) {
  const errors = [];
  const warnings = [];
  const slides = Array.isArray(input.slides) ? input.slides : [];
  const outcomeIds = Array.isArray(input.outcomeIds) ? input.outcomeIds.filter(Boolean) : [];
  const publicationGate = ['approved', 'published'].includes(String(input.lifecycleStatus || ''));
  const qualityIssue = (issue) => (publicationGate ? errors : warnings).push(issue);
  if (!String(input.title || '').trim()) errors.push({ code: 'missing_title', message: 'Lesson title is required.' });
  if (!slides.length) errors.push({ code: 'missing_content', message: 'Add at least one slide before review or publication.' });
  if (!outcomeIds.length) errors.push({ code: 'missing_outcomes', message: 'Map the lesson to at least one curriculum outcome.' });
  if (!input.syllabusVersion) qualityIssue({ code: 'missing_syllabus_version', message: 'Add the syllabus version used by this lesson.' });
  if (!input.sourceInfo?.sourceUrl && !input.sourceInfo?.citation) qualityIssue({ code: 'missing_source', message: 'Add a source or citation for curriculum review.' });
  if (!input.sourceInfo?.reviewedAt) qualityIssue({ code: 'missing_source_review_date', message: 'Record when the lesson sources were last checked.' });

  const slideResult = validateSlides(slides);
  if (!slideResult.ok) slideResult.errors.forEach((message) => errors.push({ code: 'invalid_slide', message }));
  const seenPrompts = new Map();
  slides.forEach((slide, index) => {
    const number = index + 1;
    const prompt = String(slide.question || slide.prompt || slide.template || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (prompt) {
      if (seenPrompts.has(prompt)) errors.push({ code: 'duplicate_question', message: `Slides ${seenPrompts.get(prompt)} and ${number} repeat the same question.` });
      else seenPrompts.set(prompt, number);
    }
    if (slide.type === 'media') {
      if (!validHttpUrl(slide.url)) errors.push({ code: 'invalid_media_url', message: `Slide ${number} has an invalid media URL.` });
      if (slide.source === 'image' && !slide.caption && !slide.alt) qualityIssue({ code: 'missing_image_description', message: `Slide ${number} needs alternative text or a descriptive caption.` });
    }
    if (slide.type === 'embed') {
      if (!validHttpUrl(slide.url)) errors.push({ code: 'invalid_embed_url', message: `Slide ${number} has an invalid embed URL.` });
      else if (!ALLOWED_EMBED_HOSTS.has(new URL(slide.url).hostname)) errors.push({ code: 'unsupported_embed', message: `Slide ${number} uses an unsupported embed host.` });
    }
    if (slide.type === 'choice' && !(slide.explanation || '').trim()) qualityIssue({ code: 'missing_explanation', message: `Slide ${number} should explain the correct answer.` });
    if (['match', 'order', 'fillblank', 'hotspot', 'timeline'].includes(slide.type) && !slide.explanation) qualityIssue({ code: 'missing_feedback', message: `Slide ${number} should include learning feedback.` });
    if (slide.type === 'chart' && !slide.caption) qualityIssue({ code: 'missing_chart_description', message: `Slide ${number} needs a text description of the chart.` });
    if (slide.type === 'diagram' && !slide.caption) qualityIssue({ code: 'missing_diagram_description', message: `Slide ${number} needs a text description of the diagram.` });
  });
  const reviewedAt = input.sourceInfo?.reviewedAt ? new Date(input.sourceInfo.reviewedAt) : null;
  if (reviewedAt && Number.isNaN(reviewedAt.getTime())) {
    qualityIssue({ code: 'invalid_source_review_date', message: 'Use a valid date for the source review.' });
  } else if (reviewedAt && reviewedAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    qualityIssue({ code: 'future_source_review', message: 'The source review date cannot be in the future.' });
  } else if (reviewedAt && Date.now() - reviewedAt.getTime() > 365 * 24 * 60 * 60 * 1000) {
    qualityIssue({ code: 'stale_source_review', message: 'Review the lesson sources again before approval; the last review is more than one year old.' });
  }
  if (input.metadata?.generatedByAI && !['in_review', 'approved', 'published'].includes(input.lifecycleStatus)) {
    warnings.push({ code: 'ai_review_required', message: 'AI-generated content must enter review before publication.' });
  }
  return { ok: errors.length === 0, errors, warnings, checkedAt: new Date().toISOString() };
}

module.exports = { ALLOWED_EMBED_HOSTS, validHttpUrl, validateLessonContent };
