const OpenAI = require('openai');
const { samplingParams } = require('../utils/modelParams');

let client = null;

function getClient() {
  if (client) return client;
  if (!process.env.OPENAI_API_KEY) return null;
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45000, maxRetries: 1 });
  return client;
}

const SYSTEM = `You extract assessment results from an Australian school report. You are a records parser, not a teacher or adviser.

Rules:
- Extract only results explicitly present in the supplied report text.
- Never invent marks, dates, weightings, subjects, years, terms, task names or reflections.
- Ignore attendance, conduct, effort grades and teacher comments unless they clearly describe a specific assessment result.
- Use only a subject from the supplied allowed-subject list. Omit results for other subjects.
- Prefer raw marks such as 18/25. If the report only gives a percentage, use that percentage as score with maxMarks 100.
- Use yearLevel as an integer from 7 to 12.
- Use term as "Term 1", "Term 2" or "Term 3". If no term is explicit, use "Term 1" only when the report clearly identifies Semester 1; otherwise return an empty string.
- Use an ISO date YYYY-MM-DD only when a task or report date is explicit. Otherwise return an empty string.
- Use weighting 0 when weighting is not shown.
- reflection must be an empty string; do not turn teacher comments into a student reflection.

Return only JSON with this shape:
{"entries":[{"yearLevel":11,"term":"Term 1","subject":"Mathematics Advanced","taskName":"Half-yearly examination","date":"2026-06-08","score":18,"maxMarks":25,"weighting":30,"reflection":""}]}`;

const clamp = (value, max) => String(value ?? '').trim().slice(0, max);

function normaliseTerm(value) {
  const match = clamp(value, 20).match(/(?:term\s*)?([123])/i);
  return match ? `Term ${match[1]}` : '';
}

function normaliseYear(value) {
  const match = clamp(value, 20).match(/(?:year\s*)?(7|8|9|10|11|12)/i);
  return match ? Number(match[1]) : null;
}

function normaliseDate(value) {
  const date = clamp(value, 20);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? '' : date;
}

function sanitizeAssessmentReport(parsed, allowedSubjects = []) {
  const allowed = new Map(allowedSubjects.map((subject) => [String(subject).trim().toLowerCase(), String(subject).trim()]));
  const rawEntries = Array.isArray(parsed?.entries) ? parsed.entries : [];
  return rawEntries.slice(0, 60).map((raw) => {
    const subject = allowed.get(clamp(raw?.subject, 160).toLowerCase());
    const yearLevel = normaliseYear(raw?.yearLevel);
    const score = Number(raw?.score);
    const maxMarks = Number(raw?.maxMarks);
    const weighting = Number(raw?.weighting || 0);
    return {
      yearLevel,
      term: normaliseTerm(raw?.term),
      subject,
      taskName: clamp(raw?.taskName, 180),
      date: normaliseDate(raw?.date),
      score,
      maxMarks,
      weighting: Number.isFinite(weighting) ? Math.max(0, Math.min(100, weighting)) : 0,
      reflection: '',
    };
  }).filter((entry) => (
    entry.subject
    && entry.yearLevel
    && entry.taskName
    && Number.isFinite(entry.score)
    && Number.isFinite(entry.maxMarks)
    && entry.maxMarks > 0
    && entry.score >= 0
    && entry.score <= entry.maxMarks
  ));
}

async function parseAssessmentReport(text, allowedSubjects, options = {}) {
  const openai = getClient();
  if (!openai) {
    const error = new Error('AI report import is not configured on the server.');
    error.status = 503;
    throw error;
  }
  const reportText = String(text || '').trim();
  if (!reportText) {
    const error = new Error('The report has no readable text.');
    error.status = 400;
    throw error;
  }
  const subjects = Array.isArray(allowedSubjects) ? allowedSubjects.map((subject) => clamp(subject, 160)).filter(Boolean).slice(0, 30) : [];
  if (!subjects.length) {
    const error = new Error('Choose your subjects before importing a report.');
    error.status = 400;
    throw error;
  }

  const completion = await openai.chat.completions.create({
    model: options.model || 'gpt-5.4-mini',
    response_format: { type: 'json_object' },
    ...samplingParams(options.model || 'gpt-5.4-mini', 0),
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Allowed subjects:\n${subjects.join('\n')}\n\nReport text:\n${reportText.slice(0, 50000)}\n\nReturn only the required JSON.` },
    ],
  });

  let parsed;
  try {
    parsed = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
  } catch {
    const error = new Error('AI returned non-JSON output.');
    error.status = 502;
    throw error;
  }
  return sanitizeAssessmentReport(parsed, subjects);
}

module.exports = { parseAssessmentReport, sanitizeAssessmentReport };
