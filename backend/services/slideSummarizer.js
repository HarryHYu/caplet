/**
 * Condenses a set of flagged slides (one revision category) into a short
 * summary "slideshow" using the AI model. Stateless — nothing is persisted;
 * the caller just renders the returned slides. Mirrors the lazy OpenAI client
 * pattern used elsewhere so the server boots without OPENAI_API_KEY.
 */
const OpenAI = require('openai');
const { slideToText } = require('./slideCategorizer');

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) return null;
  _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30000, maxRetries: 1 });
  return _client;
}

const SYSTEM = `You are a study assistant. Given the contents of several flagged study slides on one topic, produce a SHORT summary slideshow that condenses the key information for revision.

Output rules:
- Return ONLY a JSON object: {"slides":[ ... ]}.
- Use ONLY these slide types:
  {"type":"divider","title":"...","subtitle":"..."}
  {"type":"text","content":"markdown","tone":"neutral|info|tip|example"}
- Start with ONE divider slide naming the topic.
- Then 2–5 text slides, each covering one key idea. Keep each concise (a short heading + a few bullet points or 1–2 sentences).
- Distil and combine — do NOT just copy the source slides. Capture the essentials a student needs to revise.
- Markdown only: headings, bold, bullet lists. Use LaTeX ($...$) for any maths.
- No questions, no images, no other slide types.`;

/**
 * @param {Array<{text:string}>} items  flagged slides' extracted text
 * @param {object} opts { topic, model }
 * @returns {Promise<Array>} array of summary slides ({type:'divider'|'text', ...})
 */
async function summarizeSlides(items, opts = {}) {
  const client = getClient();
  if (!client) {
    const err = new Error('AI is not configured on the server.');
    err.status = 503;
    throw err;
  }
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('No slides to summarize.');
    err.status = 400;
    throw err;
  }
  if (items.length > 30) {
    const err = new Error('Too many slides to summarise in one request.');
    err.status = 413;
    throw err;
  }

  const sourceText = items
    .map((it, i) => `Slide ${i + 1}: ${it.text || '(no text)'}`)
    .join('\n');
  const topic = opts.topic && opts.topic !== 'Uncategorized' ? opts.topic : null;
  const userMsg = `${topic ? `Topic: ${topic}\n\n` : ''}Condense these ${items.length} flagged slides into a short revision summary slideshow.\n\n${sourceText}\n\nReturn ONLY {"slides":[...]}.`;

  const chosenModel = opts.model || 'gpt-5.4-mini';
  const isReasoning = chosenModel.startsWith('o') || chosenModel === 'gpt-5';

  const completion = await client.chat.completions.create({
    model: chosenModel,
    response_format: { type: 'json_object' },
    ...(isReasoning ? {} : { temperature: 0.4 }),
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

  const raw = Array.isArray(parsed?.slides) ? parsed.slides : Array.isArray(parsed) ? parsed : [];
  // Keep only the safe, renderable slide shapes.
  const slides = [];
  for (const s of raw) {
    if (!s || typeof s !== 'object') continue;
    if (s.type === 'divider' && (s.title || s.subtitle)) {
      slides.push({ type: 'divider', title: String(s.title || '').slice(0, 120), subtitle: String(s.subtitle || '').slice(0, 200) });
    } else if (s.type === 'text' && s.content) {
      const tone = ['neutral', 'info', 'tip', 'example'].includes(s.tone) ? s.tone : 'neutral';
      slides.push({ type: 'text', content: String(s.content).slice(0, 2000), tone });
    }
    if (slides.length >= 8) break;
  }

  if (!slides.length) {
    const err = new Error('AI did not return a usable summary. Try again.');
    err.status = 502;
    throw err;
  }
  return slides;
}

module.exports = { summarizeSlides, slideToText };
