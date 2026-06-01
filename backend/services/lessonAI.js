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

### Divider — section break / title card
{"type":"divider","title":"Section Title","subtitle":"Optional subtitle or description"}

### Text — reading slide with formatted content
{"type":"text","content":"## Heading\\n\\nParagraph with **bold** and $x^2$ math.","layout":"default","tone":"neutral"}
  - layout: "default" (standard), "hero" (large centred intro), "centered" (centred body), "callout" (highlighted box)
  - tone: "neutral", "info", "tip", "warning", "example", "quote"

### Choice — multiple-choice or true/false question
{"type":"choice","question":"What is $\\\\frac{d}{dx}[x^2]$?","options":["$x$","$2x$","$2$","$x^2$"],"correctIndices":[1],"mode":"single","explanation":"Power rule: bring the exponent down and reduce by 1."}
  - mode: "single" (one correct answer), "multiple" (tick all that apply), "truefalse" (options are always True/False)
  - correctIndices: 0-based array of correct option indices

### Fill-in-the-blank — typed or dropdown answer
Typed: {"type":"fillblank","template":"Supply shifts {{0}} when input costs rise, and {{1}} when technology improves.","blanks":[{"answers":["left","to the left"]},{"answers":["right","to the right"]}],"mode":"textbox","explanation":"..."}
Dropdown: {"type":"fillblank","template":"The mitochondria is the {{0}} of the cell.","blanks":[{"answers":["powerhouse"],"options":["nucleus","powerhouse","membrane","ribosome"]}],"mode":"dropdown","explanation":"..."}
  - {{0}}, {{1}}, … placeholders must match the blanks array exactly.
  - For dropdown mode add "options" to each blank (include the correct answer among them).
  - "answers" lists all accepted correct answers (case-insensitive by default).

### Flashcards — term/definition cards
Carousel (one at a time, flip to reveal): {"type":"cards","mode":"carousel","cards":[{"front":"Term or question","back":"Definition or answer"},{"front":"Another term","back":"Another definition"}]}
Grid (all visible at once, good for reference): {"type":"cards","mode":"grid","columns":2,"cards":[{"front":"Term","back":"Definition"}]}
  - Use carousel for active recall practice; use grid for a reference/summary spread.
  - "columns": 1–4, defaults to 2 for grid mode.

### Match — drag-and-drop matching pairs
{"type":"match","pairs":[{"left":"Mitosis","right":"Cell division for growth"},{"left":"Meiosis","right":"Cell division for reproduction"},{"left":"Apoptosis","right":"Programmed cell death"}],"explanation":"..."}
  - Needs at least 2 pairs. Right-side items are shuffled for the student.

### Order — drag-and-drop sequencing
{"type":"order","prompt":"Place these events in chronological order.","items":["First item","Second item","Third item","Fourth item"],"explanation":"..."}
  - Items should be listed in the CORRECT order — the player shuffles them.
  - Needs at least 2 items. Prompts should make the ordering criterion clear.

### Table — structured comparison or data
{"type":"table","headers":"row","rows":[["Feature","Option A","Option B"],["Speed","Fast","Slow"],["Cost","High","Low"]]}
  - headers: "none", "row" (first row = header), "column" (first column = header), "both"
  - Use "row" for most comparison tables; use "column" when rows are the entities being compared.

### Chart — data visualisation
Bar/line/area/scatter: {"type":"chart","chartType":"bar","title":"GDP Growth (%)","data":[{"x":"2020","y":2.1},{"x":"2021","y":5.8},{"x":"2022","y":3.4}],"xLabel":"Year","yLabel":"Growth (%)","caption":"..."}
Pie: {"type":"chart","chartType":"pie","title":"Energy Sources","data":[{"name":"Solar","value":32},{"name":"Wind","value":28},{"name":"Coal","value":40}],"caption":"..."}
  - chartType: "bar", "line", "area", "pie", "scatter"
  - Bar/line/area/scatter data: array of {"x": string|number, "y": number}
  - Pie data: array of {"name": string, "value": number}
  - Always add a descriptive title and axis labels where applicable.

### Mermaid diagram — process, flow, or relationship diagram
{"type":"diagram","code":"graph TD\\n  A[Stimulus] --> B{Receptor}\\n  B -->|Nerve impulse| C[Effector]\\n  C --> D[Response]","caption":"..."}
  - Supported diagram types: graph/flowchart, sequenceDiagram, classDiagram, erDiagram, pie, mindmap, timeline, gantt.
  - Use simple, well-formed Mermaid syntax. Avoid deeply nested or excessively complex diagrams.

### Timeline drag — put events in chronological order
{"type":"timeline","prompt":"Drag these events into the correct chronological order.","events":[{"label":"Archduke Franz Ferdinand assassinated","year":"1914"},{"label":"Treaty of Versailles signed","year":"1919"},{"label":"League of Nations founded","year":"1920"}],"explanation":"The sequence reflects the cause-and-effect chain of WWI and its aftermath."}
  - Events must be listed in the CORRECT chronological order — the player shuffles them.
  - "year" is optional but shown as feedback after the student answers.
  - Needs at least 2 events.

### Desmos interactive graph
{"type":"desmos","title":"Exploring Quadratic Functions","expressions":[{"id":"e1","latex":"y=ax^2+bx+c","color":"#6366f1"},{"id":"a","latex":"a=1"},{"id":"b","latex":"b=0"},{"id":"c","latex":"c=0"}],"bounds":{"left":-10,"right":10,"bottom":-15,"top":15},"caption":"Use the sliders to see how each coefficient changes the parabola."}
  - Use whenever the topic benefits from an interactive graph: functions, transformations, geometry, rates of change, statistics, physics simulations.
  - "expressions": array of LaTeX expressions rendered together on one graph. Each must have a unique "id".
  - Sliders: define a variable as its own expression, e.g. {"id":"a","latex":"a=1"} — students can then drag it.
  - Common colors: "#6366f1" indigo, "#10b981" green, "#f59e0b" amber, "#ef4444" red, "#8b5cf6" violet, "#06b6d4" cyan.
  - "bounds": choose values that frame the key features (intercepts, turning points, asymptotes, intersections).
  - Valid Desmos LaTeX: y=mx+b, y=\\\\frac{1}{x}, y=\\\\sin(x), y=e^x, y=\\\\ln(x), x^2+y^2=r^2, y=\\\\sqrt{x}, inequalities y>x^2.
  - ALWAYS prefer a desmos slide over describing a graph in text when teaching mathematics or physics.
  - Students interact with the graph live — it is a full graphing calculator, not a static image.

## Hard rules
- Return ONLY the JSON object {"slides":[...]}. No prose, no markdown fences.
- Do NOT generate "media", "embed", or "hotspot" slides — these require real image/video URLs uploaded by a teacher.
- correctIndices must be an array of 0-based integers.
- fillblank {{0}}, {{1}}, … placeholder count must exactly match the blanks array length.
- order items must be listed in the correct sequence — the player shuffles them.
- match needs at least 2 pairs; order needs at least 2 items; timeline needs at least 2 events.
- chart data must be a non-empty array. Pie data uses "name"/"value"; all others use "x"/"y".
- diagram code must be valid Mermaid syntax.
- Desmos expression ids must be unique strings within the slide.
- Keep markdown in text.content simple: headings (##, ###), bold (**), italic (*), bullet lists (-), inline code. No HTML, no horizontal rules (---).

## Mathematics formatting (CRITICAL)
- ALWAYS use LaTeX for every mathematical expression — never use ASCII: no x^2, no a/b, no sqrt(x), no *, no ÷.
- Inline math: single dollar signs → $x^2 + y^2 = r^2$, $\\\\frac{a}{b}$, $\\\\sqrt{x}$, $\\\\pi r^2$, $\\\\Delta P$
- Display math (standalone equations on text slides): double dollar signs → $$E = mc^2$$, $$\\\\int_0^1 x^2\\\\,dx = \\\\frac{1}{3}$$
- This rule applies EVERYWHERE: text content, choice questions and options, fillblank templates and blanks, flashcard fronts and backs, match pairs, order items, table cells, timeline labels, explanations.
- Examples of correct vs wrong:
  - CORRECT: $\\\\frac{\\\\Delta Q}{\\\\Delta P}$ — WRONG: ΔQ/ΔP
  - CORRECT: $x^{-1}$ — WRONG: x^-1
  - CORRECT: $\\\\sum_{i=1}^{n} x_i$ — WRONG: sum(x_i)
  - CORRECT: $\\\\vec{F} = m\\\\vec{a}$ — WRONG: F = ma (with vectors)
  - CORRECT: $\\\\log_2(n)$ — WRONG: log2(n)

## Quality rules
- Match curriculum terminology and difficulty exactly to the specified syllabus and year level.
- Use correct technical vocabulary for the subject area.
- Explanations on choice/fillblank/timeline/match/order slides should be concise and genuinely educational — explain the WHY, not just restate the answer.
- Divider slides mark logical sections — use them to chunk the lesson into clear parts.
- Tables should have a header row ("headers":"row") whenever comparing entities; use "both" when rows and columns both have labels.
- Use chart slides for numerical data, statistics, trends, or comparisons (e.g. GDP, population, experimental results).
- Use diagram slides for processes, systems, hierarchies, or flows (e.g. supply/demand, cell cycle, OSI model, state machines).
- Use timeline slides for ordered historical events, scientific discoveries, or procedural steps with associated dates.
- Use desmos slides for any mathematical function, geometric shape, physical simulation, or interactive exploration.
- Use cards carousel for active recall; use cards grid for a reference summary at the end of a section.
- Use fillblank dropdown (not textbox) when the answer set is small and fixed — it reduces ambiguity and is better for non-native speakers.
- Prefer match slides over plain text lists when teaching vocabulary, equations↔names, or cause↔effect relationships.`;

const FOCUS_INSTRUCTIONS = {
  full: `Generate a complete lesson with these phases:
1. Intro: one hero-layout text slide or divider to set the scene.
2. Content (4–6 slides): mix text, chart, diagram, table, and desmos slides to teach the key concepts. Use desmos slides whenever the topic involves mathematical functions, graphs, or physical simulations. Use chart slides for numerical data or trends. Use diagram slides for processes, flows, or hierarchies.
3. Practice (4–6 slides): varied activities — choice (single and multiple), fillblank (mix textbox and dropdown), match, order, timeline. Include a desmos slide paired with a question for maths/science topics.
4. Summary: one cards (mode:"carousel") slide OR a cards (mode:"grid") slide reviewing key terms/concepts.
Aim for 12–18 slides total. Use divider slides to separate phases.`,

  practice: `Generate ONLY practice activity slides — no reading/content slides. Rules:
- Use a variety of types: choice (single AND multiple), fillblank (textbox AND dropdown), match, order, timeline.
- For mathematics or science: include at least one desmos slide showing a relevant graph, immediately followed by a choice or fillblank question about it.
- Every activity must have a clear question/prompt, correct answers, and a brief but genuinely educational explanation.
- 8–12 activity slides total (not counting any desmos slides).`,

  flashcards: `Generate flashcard content:
- One cards slide with mode "carousel" containing 12–20 cards.
- Front: short term, concept, formula, or question. Back: concise but complete definition, explanation, or worked answer.
- If there are clearly distinct topic areas, add 1–2 divider slides as section breaks between groups of cards.
- Do NOT add other slide types.`,

  summary: `Generate a condensed reference-style lesson:
- Divider slides to label each section.
- Text slides with layout "callout" and tone "tip" or "info" for key takeaways.
- Table slides for comparisons between concepts, events, or items.
- Chart slides for any numerical data or statistics.
- Diagram slides for any processes, systems, or models.
- Desmos slides for any mathematical functions or relationships.
- End with a cards (mode:"grid", columns:2) slide summarising the most important terms and concepts.
- Minimal practice questions — this is a reference, not a quiz. 8–14 slides total.`,
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
