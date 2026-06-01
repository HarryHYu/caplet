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

const SYSTEM = `You are an expert curriculum designer. Given source material and context, you output a structured lesson as a strict JSON object: {"slides": [ ... ]}.

## Slide types (use ONLY these)

{"type":"divider","title":"...","subtitle":"..."}
{"type":"text","content":"markdown","layout":"default|hero|centered|callout","tone":"neutral|info|tip|warning|example|quote"}
{"type":"choice","question":"...","options":["A","B","C","D"],"correctIndices":[0],"mode":"single|multiple|truefalse","explanation":"..."}
{"type":"fillblank","template":"The capital is {{0}}.","blanks":[{"answers":["Canberra"]}],"mode":"textbox","explanation":"..."}
{"type":"cards","mode":"carousel","cards":[{"front":"Term","back":"Definition"}]}
{"type":"match","pairs":[{"left":"Term","right":"Definition"},{"left":"Term2","right":"Definition2"}]}
{"type":"order","prompt":"Put in order","items":["First","Second","Third"]}
{"type":"table","headers":"row","rows":[["Header","Header"],["cell","cell"]]}
{"type":"chart","chartType":"bar|line|area|pie|scatter","title":"...","data":[{"x":"Label","y":42}],"xLabel":"...","yLabel":"...","caption":"..."}
  - For pie charts use: "data":[{"name":"Category","value":30}]
  - For bar/line/area/scatter use: "data":[{"x":"label","y":number}]
{"type":"diagram","code":"graph TD\n  A[Start] --> B{Choice?}\n  B -->|Yes| C[Done]","caption":"..."}
  - Use valid Mermaid syntax. Supported: graph/flowchart, sequenceDiagram, classDiagram, erDiagram, pie, mindmap, timeline, gantt.
{"type":"timeline","prompt":"Put these events in order","events":[{"label":"Event name","year":"1914"},{"label":"Another event","year":"1919"}],"explanation":"..."}
  - Store events in the CORRECT chronological order — the player shuffles them for the student.
  - "year" is optional but helps students when shown as feedback after answering.

## Hard rules
- Return ONLY the JSON object {"slides":[...]}. No prose, no markdown fences.
- Do NOT generate "media", "embed", "hotspot", or "desmos" slides — these require real URLs or specific graphing configuration from a teacher.
- correctIndices is always an array of 0-based integers.
- fillblank templates must contain {{0}}, {{1}}, ... placeholders matching the blanks array.
- order items should be in the correct sequence — the player shuffles them.
- match needs at least 2 pairs.
- timeline needs at least 2 events stored in the correct chronological order.
- chart data must be a non-empty array. Pie chart data uses "name"/"value" keys; all others use "x"/"y" keys.
- diagram "code" must be valid Mermaid syntax. Use simple, well-formed diagrams.
- Keep markdown in text.content simple: headings, bold, bullet lists. No HTML, no horizontal rules.

## Mathematics formatting (IMPORTANT)
- ALWAYS use LaTeX notation for any mathematical expression — never use ASCII approximations like x^2, a/b, sqrt(x), or *.
- Inline math: wrap in single dollar signs → $x^2 + y^2 = r^2$, $\\frac{a}{b}$, $\\sqrt{x}$, $\\pi r^2$
- Block/display math (for prominent equations on text slides): wrap in double dollar signs → $$E = mc^2$$
- This applies everywhere: text slide content, choice questions and options, fillblank templates, flashcard fronts/backs, match pairs, order items, timeline labels, explanations.
- Examples: use $\\frac{\\Delta Q}{\\Delta P}$ not ΔQ/ΔP; use $x^{-1}$ not x^-1; use $\\sum_{i=1}^{n} x_i$ not sum(x_i).

## Quality rules
- Be accurate to the curriculum and syllabus terminology if one is specified.
- Use correct technical vocabulary for the subject area.
- Difficulty should match the audience/year level if specified.
- Explanations on choice/fillblank/timeline slides should be concise and educational.
- Tables should have a header row when comparing items.
- Divider slides mark logical sections — use them to chunk the lesson.
- Use chart slides when presenting numerical data or trends (e.g. GDP figures, population statistics, experimental results).
- Use diagram slides for processes, relationships, hierarchies, or flows (e.g. supply/demand model, cell cycle, OSI model).
- Use timeline slides for sequences of historical events, scientific discoveries, or procedural steps with dates.`;

const FOCUS_INSTRUCTIONS = {
  full: `Generate a complete lesson: start with an intro divider, 3–5 text/chart/diagram reading slides with key concepts, then 4–6 varied practice activities (mix of choice, fillblank, match, order, timeline, and/or cards). Use chart slides for any numerical data and diagram slides for processes or relationships. End with a summary or review section. Aim for 10–18 slides.`,
  practice: `Generate ONLY practice activities — no long reading slides. Use a variety of: choice (single and multiple), fillblank, match, order, timeline. 8–12 activity slides. Each must have a clear question/prompt and correct answers. Include brief explanations on every activity.`,
  flashcards: `Generate ONLY a cards slide (mode: "carousel") with 10–20 cards covering key terms, definitions, formulas, or concepts from the material. Keep front text short (term/concept), back text concise but complete (definition/explanation). Optionally add 1–2 divider slides as section breaks if there are distinct topic areas.`,
  summary: `Generate a reference-style lesson: divider slides to mark sections, text slides with layout "callout" for key points, tables for comparisons, chart slides for any numerical data, diagram slides for any processes or models, and a final cards slide (mode: "grid") summarising the main concepts. Minimal practice questions. 8–14 slides.`,
};

async function generateLessonSlides(notes, opts = {}) {
  const client = getClient();
  if (!client) {
    const err = new Error('AI is not configured on the server.');
    err.status = 503;
    throw err;
  }

  const focus = opts.focus || 'full';
  const focusInstruction = FOCUS_INSTRUCTIONS[focus] || FOCUS_INSTRUCTIONS.full;

  const contextLines = [
    opts.curriculum ? `Curriculum / syllabus: ${opts.curriculum}` : null,
    opts.audience ? `Audience / year level: ${opts.audience}` : null,
    opts.title ? `Lesson title: ${opts.title}` : null,
  ].filter(Boolean);

  const userMsg = [
    contextLines.length ? `## Context\n${contextLines.join('\n')}` : null,
    `## Output instructions\n${focusInstruction}`,
    `## Source material\n${notes}`,
    'Return ONLY the JSON object {"slides":[...]}.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const chosenModel = opts.model || 'gpt-5.4-mini';
  // Pure reasoning models (o-series and bare gpt-5) don't accept `temperature`
  const isReasoning = chosenModel.startsWith('o') || chosenModel === 'gpt-5';

  const completion = await client.chat.completions.create({
    model: chosenModel,
    response_format: { type: 'json_object' },
    ...(isReasoning ? {} : { temperature: 0.5 }),
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
