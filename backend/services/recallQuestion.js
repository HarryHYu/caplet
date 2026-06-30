/**
 * Turns a study slide's text into ONE short active-recall question plus a
 * model answer, so revisiting a saved slide becomes active retrieval instead
 * of passive re-reading. The learner answers from memory, reveals the model
 * answer, then self-grades pass/fail — that grade drives the shared scheduler.
 *
 * Mirrors the lazy OpenAI client pattern used across the codebase so the
 * server boots without OPENAI_API_KEY and this endpoint degrades with a 503.
 */
const OpenAI = require('openai');

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) return null;
  _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

const SYSTEM = `You write a single active-recall question for a student revising one study slide.
Given the slide's text, produce ONE focused question that forces the student to retrieve the key idea from memory, plus a concise model answer.

Rules:
- Return ONLY a JSON object: {"question":"...","answer":"..."}.
- Ask exactly one question. Keep it short and answerable in 1-3 sentences.
- The question must be answerable from the slide's content alone — do not invent facts that are not present.
- The answer is the ideal short response (1-3 sentences). Plain text or light markdown; use LaTeX ($...$) only for maths.
- Do not include the answer inside the question.`;

/**
 * @param {string} slideText  plain-text contents of the slide (see slideToText)
 * @param {object} opts { model }
 * @returns {Promise<{question:string, answer:string}>}
 */
async function generateRecallQuestion(slideText, opts = {}) {
  const client = getClient();
  if (!client) {
    const err = new Error('AI is not configured on the server.');
    err.status = 503;
    throw err;
  }

  const text = String(slideText || '').trim();
  if (!text) {
    const err = new Error('This slide has no text to build a question from.');
    err.status = 400;
    throw err;
  }

  const chosenModel = opts.model || 'gpt-5.4-mini';
  const isReasoning = chosenModel.startsWith('o') || chosenModel === 'gpt-5';

  const completion = await client.chat.completions.create({
    model: chosenModel,
    response_format: { type: 'json_object' },
    ...(isReasoning ? {} : { temperature: 0.5 }),
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Slide text:\n\n${text}\n\nReturn ONLY {"question":"...","answer":"..."}.` },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const err = new Error('AI returned non-JSON output.');
    err.status = 502;
    throw err;
  }

  const question = String(parsed?.question || '').trim().slice(0, 500);
  const answer = String(parsed?.answer || '').trim().slice(0, 1000);
  if (!question) {
    const err = new Error('AI did not return a usable question. Try again.');
    err.status = 502;
    throw err;
  }

  return { question, answer };
}

module.exports = { generateRecallQuestion };
