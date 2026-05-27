/**
 * Lesson AI — turn pasted notes into a structured array of slides
 * conforming to backend/utils/slideSchema.js.
 *
 * Intentionally separate from services/aiService.js (which handles the
 * unrelated financial-coach pipeline). We use OpenAI's strict JSON mode
 * so the response is always parseable; then we run it through the same
 * schema validator the editor uses to guarantee the player can render it.
 */

const OpenAI = require('openai');
const { validateSlides } = require('../utils/slideSchema');

// Lazy: don't construct the OpenAI client until we actually need it, so
// the server can boot without OPENAI_API_KEY (the /api/ai/generate-lesson
// route returns 503 in that case).
let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) return null;
  _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

const SYSTEM = `You generate Caplet lesson content as a strict JSON object {"slides": [ ... ]}.

Each slide must be one of these types:
- {"type":"divider","title":"...","subtitle":"..."}                                                     // section break
- {"type":"text","content":"markdown","layout":"default|hero|centered|callout","tone":"neutral|info|tip|warning|example|quote"}
- {"type":"choice","question":"...","options":["..."],"correctIndices":[0],"mode":"single|multiple|truefalse","explanation":"..."}
- {"type":"fillblank","template":"The capital is {{0}}.","blanks":[{"answers":["Canberra","canberra"]}],"mode":"textbox|dropdown","explanation":"..."}
- {"type":"cards","mode":"carousel","cards":[{"front":"Term","back":"Definition"}]}
- {"type":"match","pairs":[{"left":"Term","right":"Definition"}]}
- {"type":"order","prompt":"...","items":["Step 1","Step 2","Step 3"]}
- {"type":"table","headers":"row","rows":[["Header","Header"],["cell","cell"]]}

Constraints:
- Do NOT generate any "media" slides. Do NOT invent image or video URLs. The teacher will add visuals afterwards.
- Aim for 8–14 slides total.
- Mix reading slides (text) with practice activities (choice, fillblank, match, order, cards).
- Always start with a divider or hero-layout text slide that introduces the topic.
- For choice slides: correctIndices is always an array (even for single-answer), and indices are 0-based.
- For order slides: list items in their correct sequence — the player shuffles them automatically.
- For fillblank: use {{0}}, {{1}}, ... placeholders in the template and provide answers for each blank.
- Keep markdown inside text.content lean (no HTML, no horizontal rules).
- Use plain English suitable for high-school students unless the notes say otherwise.
- Never include keys outside the schema above; return ONLY the JSON object {"slides":[...]}.`;

async function generateLessonSlides(notes, opts = {}) {
  const client = getClient();
  if (!client) {
    const err = new Error('AI is not configured on the server.');
    err.status = 503;
    throw err;
  }

  const userMsg = [
    opts.title ? `Lesson title (context only): ${opts.title}` : null,
    'Source notes:',
    notes,
    'Return strictly the JSON object {"slides":[...]}.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const completion = await client.chat.completions.create({
    model: opts.model || 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.5,
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
    const err = new Error('AI returned non-JSON output. Try again or shorten the notes.');
    err.status = 502;
    throw err;
  }

  const slides = Array.isArray(parsed?.slides)
    ? parsed.slides
    : Array.isArray(parsed)
      ? parsed
      : [];

  if (!slides.length) {
    const err = new Error('AI returned no slides.');
    err.status = 502;
    throw err;
  }

  const result = validateSlides(slides);
  if (result.ok) return { slides: result.slides, warnings: [] };

  // Salvage: drop any individual slide that fails validation rather than
  // throwing the whole lesson away.
  const valid = [];
  const dropped = [];
  slides.forEach((s, i) => {
    const single = validateSlides([s]);
    if (single.ok) valid.push(s);
    else dropped.push({ index: i, errors: single.errors });
  });
  if (!valid.length) {
    const err = new Error('AI output failed schema validation.');
    err.status = 502;
    err.details = result.errors;
    throw err;
  }
  return {
    slides: validateSlides(valid).slides,
    warnings: dropped.map((d) => `Dropped slide ${d.index}: ${d.errors.join('; ')}`),
  };
}

module.exports = { generateLessonSlides };
