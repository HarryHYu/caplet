/**
 * CapletMark — HSC Economics answer marker (see PRD: CapletMark HSC
 * Economics Answer Marker, CAP-12).
 *
 * Mirrors the lazy OpenAI client pattern used across the codebase (e.g.
 * recallQuestion.js) so the server boots without OPENAI_API_KEY and this
 * endpoint degrades with a 503 instead of crashing.
 *
 * This is explicitly PRACTICE feedback, never official marking — the system
 * prompt and every response field are framed that way per the PRD's Risks
 * and Guardrails, and the frontend must keep repeating that framing too.
 */
const OpenAI = require('openai');

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) return null;
  _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

const RESPONSE_TYPES = ['short_answer', 'stimulus_response', 'extended_response'];

const SYSTEM = `You are CapletMark, an experienced HSC Economics marker giving PRACTICE feedback (never official marking) to a Year 11/12 student.

You will be given: the question, the total marks available, the response type (short_answer, stimulus_response, or extended_response), an optional focus area/topic, and the student's answer.

Mark strictly against real HSC Economics marking-criteria conventions: correct use of economic terminology, logical structure (e.g. define -> explain -> evidence/example -> link back to the question), use of relevant data/diagrams where appropriate, and directly answering what was asked.

Return ONLY a JSON object with this exact shape:
{
  "estimatedMark": <integer 0 to markValue>,
  "band": "<short band-style descriptor, e.g. 'Band 4 (10-12/15) - Sound'>",
  "strengths": ["<specific thing the answer did well, citing the answer>", ...],
  "gaps": ["<specific thing that was missing or wrong, citing the answer>", ...],
  "terminology": ["<economics term or phrase the student should add or use more precisely>", ...],
  "modelAnswer": "<a stronger full-mark model answer to the same question, written at HSC standard>",
  "nextRecommendation": "<one short, concrete suggestion for what to practise next>"
}

Rules:
- estimatedMark must be an integer between 0 and the given markValue (inclusive).
- strengths and gaps must each have 1-4 short, specific bullet points grounded in what the student actually wrote — do not invent content they didn't include.
- If the answer is too short, off-topic, or not a genuine attempt, still return valid JSON: give a low estimatedMark, explain why in gaps, and use nextRecommendation to tell the student what a real attempt needs.
- terminology should have 0-5 entries; omit it (empty array) if the student's terminology was already strong.
- Never claim this is an official or guaranteed mark — band should read as indicative practice feedback.
- Return ONLY the JSON object. No markdown fences, no prose outside the JSON.`;

function clampInt(n, min, max, fallback) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(Math.max(v, min), max);
}

function toStringArray(v, maxItems, maxLen) {
  if (!Array.isArray(v)) return [];
  return v
    .map((s) => String(s ?? '').trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

/**
 * @param {object} input { question, markValue, responseType, studentAnswer, focusArea }
 * @returns {Promise<object>} validated feedback shape (see SYSTEM prompt)
 */
async function markEconomicsAnswer(input) {
  const client = getClient();
  if (!client) {
    const err = new Error('AI is not configured on the server.');
    err.status = 503;
    throw err;
  }

  const question = String(input?.question || '').trim();
  const rawMarkValue = Number(input?.markValue);
  const responseType = RESPONSE_TYPES.includes(input?.responseType) ? input.responseType : 'short_answer';
  const studentAnswer = String(input?.studentAnswer || '').trim();
  const focusArea = String(input?.focusArea || '').trim().slice(0, 200);

  if (!question || question.length < 5) {
    const err = new Error('A question is required (at least 5 characters).');
    err.status = 400;
    throw err;
  }
  if (!Number.isFinite(rawMarkValue) || rawMarkValue < 1) {
    const err = new Error('markValue must be a positive number of marks.');
    err.status = 400;
    throw err;
  }
  const markValue = clampInt(rawMarkValue, 1, 50, 1);
  if (!studentAnswer || studentAnswer.length < 15) {
    const err = new Error('Your answer looks too short to mark — write at least a couple of sentences.');
    err.status = 400;
    throw err;
  }
  if (studentAnswer.length > 8000) {
    const err = new Error('Your answer is too long (max 8,000 characters).');
    err.status = 400;
    throw err;
  }

  const userMsg = [
    `Question: ${question}`,
    `Marks available: ${markValue}`,
    `Response type: ${responseType}`,
    focusArea ? `Focus area: ${focusArea}` : null,
    '',
    'Student answer:',
    studentAnswer,
  ].filter(Boolean).join('\n');

  const completion = await client.chat.completions.create({
    model: 'gpt-5.4-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userMsg },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const err = new Error('AI returned non-JSON output. Try again.');
    err.status = 502;
    throw err;
  }

  const estimatedMark = clampInt(parsed?.estimatedMark, 0, markValue, 0);
  const band = String(parsed?.band || '').trim().slice(0, 200) || 'Practice feedback';
  const modelAnswer = String(parsed?.modelAnswer || '').trim().slice(0, 4000);

  if (!modelAnswer) {
    const err = new Error('AI did not return a usable model answer. Try again.');
    err.status = 502;
    throw err;
  }

  return {
    subject: 'economics',
    responseType,
    question,
    markValue,
    focusArea: focusArea || null,
    studentAnswer,
    estimatedMark,
    band,
    strengths: toStringArray(parsed?.strengths, 4, 300),
    gaps: toStringArray(parsed?.gaps, 4, 300),
    terminology: toStringArray(parsed?.terminology, 5, 100),
    modelAnswer,
    nextRecommendation: String(parsed?.nextRecommendation || '').trim().slice(0, 500) || null,
  };
}

module.exports = { markEconomicsAnswer, getClient, RESPONSE_TYPES };
