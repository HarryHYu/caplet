/**
 * Groups a user's flagged ("saved") slides into a small set of meaningful
 * revision categories using the AI model. Mirrors the lazy OpenAI client
 * pattern in lessonAI.js so the server can boot without OPENAI_API_KEY.
 */
const OpenAI = require('openai');

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) return null;
  _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30000, maxRetries: 1 });
  return _client;
}

// Turn a slide object into a short plain-text summary for categorization.
function slideToText(slide) {
  if (!slide || typeof slide !== 'object') return '';
  const parts = [];
  if (slide.title) parts.push(String(slide.title));
  if (slide.subtitle) parts.push(String(slide.subtitle));
  if (slide.question) parts.push(String(slide.question));
  if (slide.prompt) parts.push(String(slide.prompt));
  if (slide.content) parts.push(String(slide.content));
  if (Array.isArray(slide.options)) parts.push(slide.options.join(', '));
  if (Array.isArray(slide.cards)) {
    parts.push(slide.cards.map((c) => `${c.front || ''} ${c.back || ''}`).join('; '));
  }
  if (Array.isArray(slide.pairs)) {
    parts.push(slide.pairs.map((p) => `${p.left || ''} = ${p.right || ''}`).join('; '));
  }
  if (Array.isArray(slide.items)) parts.push(slide.items.join(', '));
  if (Array.isArray(slide.events)) parts.push(slide.events.map((e) => e.label).join(', '));
  if (slide.caption) parts.push(String(slide.caption));
  return parts
    .join(' — ')
    .replace(/[#*`_$]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400);
}

const SYSTEM = `You organize a student's flagged study slides into a small set of revision categories.
Rules:
- Choose between 1 and 6 categories total (fewer when there are few slides).
- Category names are short topic labels in Title Case (e.g. "Compound Interest", "Budgeting Basics", "Tax & Deductions"). 1–4 words.
- Group by subject/topic, not by slide type.
- Assign EVERY numbered slide exactly one category, referencing it by its number.
- Reuse the same category name for related slides so groups are meaningful.
Return ONLY a JSON object: {"assignments":[{"item":<number>,"category":"<label>"}]} where <number> is the slide's number from the list.`;

/**
 * @param {Array<{id:string, text:string, lessonTitle?:string, courseTitle?:string}>} items
 * @param {object} opts { model }
 * @returns {Promise<Map<string,string>>} map of id -> category label
 */
async function categorizeSlides(items, opts = {}) {
  const client = getClient();
  if (!client) {
    const err = new Error('AI is not configured on the server.');
    err.status = 503;
    throw err;
  }
  if (!Array.isArray(items) || items.length === 0) return new Map();
  if (items.length > 60) {
    const err = new Error('Too many slides to categorise in one request.');
    err.status = 413;
    throw err;
  }

  // Reference slides by a simple 1-based number (not their UUID): models
  // reliably echo small numbers, but often mangle long opaque IDs.
  const lines = items.map((it, i) => {
    const ctx = [it.courseTitle, it.lessonTitle].filter(Boolean).join(' / ');
    return `${i + 1}. ${ctx ? `[${ctx}] ` : ''}${it.text || '(no text)'}`;
  });
  const userMsg = `Here are ${items.length} flagged slides, each with a number. Assign every slide a revision category.\n\n${lines.join('\n')}\n\nReturn ONLY {"assignments":[{"item":<number>,"category":"..."}]}.`;

  const chosenModel = opts.model || 'gpt-5.4-mini';
  const isReasoning = chosenModel.startsWith('o') || chosenModel === 'gpt-5';

  const completion = await client.chat.completions.create({
    model: chosenModel,
    response_format: { type: 'json_object' },
    ...(isReasoning ? {} : { temperature: 0.2 }),
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userMsg },
    ],
  });

  const text = completion.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const err = new Error('AI returned non-JSON output.');
    err.status = 502;
    throw err;
  }

  const result = new Map();
  // Tolerate a few shapes: {assignments:[...]}, or a bare array.
  const assignments = Array.isArray(parsed?.assignments)
    ? parsed.assignments
    : Array.isArray(parsed)
      ? parsed
      : [];
  for (const a of assignments) {
    if (!a || typeof a.category !== 'string' || !a.category.trim()) continue;
    // Accept the slide number under any of these keys; map 1-based -> id.
    const num = Number(a.item ?? a.number ?? a.index ?? a.id);
    const idx = num - 1;
    if (Number.isInteger(idx) && idx >= 0 && idx < items.length) {
      result.set(items[idx].id, a.category.trim().slice(0, 60));
    }
  }
  return result;
}

module.exports = { categorizeSlides, slideToText };
