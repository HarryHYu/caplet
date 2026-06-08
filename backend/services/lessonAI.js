/**
 * Lesson AI — two-stage pipeline
 *
 * Stage 1 (Planner): given notes + context, a powerful model plans the full
 *   lesson as structured human-readable text. No JSON — just clear, complete
 *   content for every slide.
 *
 * Stage 2 (Formatter): gpt-5.4-mini converts the plan to valid JSON slides
 *   conforming to backend/utils/slideSchema.js. This is a pure transcription
 *   task — no creative work — so a fast cheap model is all that's needed.
 *
 * Separating the two jobs means Stage 1 can think freely without worrying
 * about schema correctness, and Stage 2 can apply the schema without having
 * to invent content.
 */

const OpenAI = require('openai');
const { validateSlides } = require('../utils/slideSchema');

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) return null;
  _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

const MAPS_KEY_PLACEHOLDER = '__MAPS_API_KEY__';

// Default Stage 2 model — overridable per request via opts.formatterModel.
const FORMATTER_MODEL_DEFAULT = 'gpt-5.4-mini';

/* ─── Stage 1: Lesson Planner system prompt ─────────────────────────────── */

const PLANNER_SYSTEM = `You are an expert curriculum designer. Given source material, context, and output instructions, you plan a complete detailed lesson.

A second AI will convert your plan to JSON exactly — so write complete, unambiguous content for every slide. NEVER use placeholders like "add content here" or "describe X". Write the actual content.

## Output format

Write each slide as a block starting with:
  SLIDE N [type | option: value | option: value]
followed by its fields, then a separator line containing only ---

Number slides sequentially (SLIDE 1, SLIDE 2, …). Use ONLY the types listed below.

────────────────────────────────────────────────────────────────────────
SLIDE N [divider]
title: Section Title
subtitle: Optional subtitle
────────────────────────────────────────────────────────────────────────
SLIDE N [text | layout: default | tone: neutral]
  layout options: default · hero · centered · callout
  tone   options: neutral · info · tip · warning · example · quote
content:
Write the full educational text here in markdown.
Use ## for headings, **bold**, - for bullet lists.
Use $formula$ for ALL math — NEVER write x^2 or a/b in plain text.
Use $$formula$$ for a prominent standalone equation.
────────────────────────────────────────────────────────────────────────
SLIDE N [choice | mode: single]
  mode options: single (one correct) · multiple (tick all that apply) · truefalse
question: Full question text. Use $math$ for any formulas.
option A: First option
option B: Second option
option C: Third option
option D: Fourth option
correct: B
explanation: Why B is correct. Why the other options are wrong.
────────────────────────────────────────────────────────────────────────
SLIDE N [fillblank | mode: textbox]
  mode options: textbox · dropdown
template: Sentence with {{0}} and {{1}} markers. NEVER put {{N}} inside $math$ delimiters.
blank 0 answers: primaryAnswer, alternativeAnswer, anotherAccepted
blank 1 answers: answer1, answer2
explanation: Optional explanation of the correct answers.

  For dropdown mode, also include accepted options per blank:
blank 0 options: opt1, opt2, opt3, correctAnswer
────────────────────────────────────────────────────────────────────────
SLIDE N [cards | mode: carousel]
  mode options: carousel (flip one at a time — active recall) · grid (all visible — reference)
  columns: 2   (grid only, 1–4)
card 1: FRONT: Term or short question | BACK: Definition or answer
card 2: FRONT: ... | BACK: ...
caption: Optional caption.
────────────────────────────────────────────────────────────────────────
SLIDE N [match]
pair 1: Left item → Right item
pair 2: Left item → Right item
pair 3: Left item → Right item
explanation: Optional.
  Needs ≥2 pairs.
────────────────────────────────────────────────────────────────────────
SLIDE N [order]
prompt: Put these steps in the correct order.
1. First step (this is the correct position 1)
2. Second step (correct position 2)
3. Third step (correct position 3)
explanation: Optional.
  List items in the CORRECT order — the player shuffles them for the student.
  Needs ≥2 items.
────────────────────────────────────────────────────────────────────────
SLIDE N [table | headers: row]
  headers options: none · row (first row = header) · column (first col = header) · both
row 1: Header A | Header B | Header C
row 2: Value1 | Value2 | Value3
row 3: Value1 | Value2 | Value3
caption: Optional.
────────────────────────────────────────────────────────────────────────
SLIDE N [chart | chartType: bar]
  chartType options: bar · line · area · pie · scatter
title: Chart Title
xLabel: X-axis label  (not used for pie)
yLabel: Y-axis label  (not used for pie)
  bar/line/area/scatter data — write as x→y pairs:
data: 2020→2.1, 2021→5.8, 2022→3.2
  pie data — write as name→value pairs:
data: Solar→32, Wind→28, Coal→40
caption: Optional.
────────────────────────────────────────────────────────────────────────
SLIDE N [diagram]
code:
graph TD
  A[Start] --> B{Decision?}
  B -->|Yes| C[Do it]
  B -->|No| D[Skip]
caption: Optional.
  Supported Mermaid types: graph/flowchart, sequenceDiagram, classDiagram, erDiagram,
  mindmap, timeline, gantt, pie. Keep diagrams simple and syntactically valid.
────────────────────────────────────────────────────────────────────────
SLIDE N [timeline]
prompt: Drag these events into the correct chronological order.
event 1: Event label (1914)
event 2: Event label (1919)
event 3: Event label (1920)
explanation: Optional.
  List events in the CORRECT chronological order — player shuffles them.
  Year is plain text like "1914" or "c. 1850" — NEVER wrap in $ signs.
  Needs ≥2 events.
────────────────────────────────────────────────────────────────────────
SLIDE N [desmos]
title: Graph title
expression e1: y=a*x^2+b*x+c (color: #6366f1)
expression a: a=1
expression b: b=0
expression c: c=0
bounds: left=-10, right=10, bottom=-15, top=15
caption: Use the sliders to explore how each coefficient changes the parabola.
  Use for: mathematical functions, geometric shapes, rates of change, physics.
  Slider variables: define as a separate expression, e.g. "expression a: a=1".
  Students can drag slider variables interactively.
  Valid LaTeX: y=mx+b, y=\\frac{1}{x}, y=\\sin(x), y=e^x, y=\\ln(x), x^2+y^2=r^2
  Colors: #6366f1 indigo · #10b981 green · #f59e0b amber · #ef4444 red · #8b5cf6 violet
  ALWAYS prefer desmos over describing a graph in text for maths or physics content.
────────────────────────────────────────────────────────────────────────
SLIDE N [embed | provider: phet]
slug: projectile-motion
title: PhET: Projectile Motion
aspect: 16:9
  Use for live science/maths experiments. Approved slugs:
  Physics: forces-and-motion-basics, projectile-motion, energy-skate-park, pendulum-lab,
    masses-and-springs, balancing-act, collision-lab, gravity-and-orbits, keplers-laws,
    gravity-force-lab, wave-on-a-string, wave-interference, sound, bending-light,
    geometric-optics, circuit-construction-kit-dc, circuit-construction-kit-ac,
    charges-and-fields, coulombs-law, faradays-law, magnets-and-electromagnets,
    photoelectric-effect, rutherford-scattering, models-of-the-hydrogen-atom,
    nuclear-fission, radioactive-dating-game, under-pressure, fluid-pressure-and-flow
  Chemistry: build-an-atom, atomic-interactions, isotopes-and-atomic-mass, molecular-shapes,
    molecule-polarity, states-of-matter, ph-scale, acid-base-solutions,
    balancing-chemical-equations, reactions-and-rates, concentration, molarity,
    beers-law-lab, gas-properties, diffusion
  Biology: natural-selection, gene-expression-essentials, population-genetics
  Earth: plate-tectonics, greenhouse-effect
  Maths: graphing-lines, graphing-slope-intercept, graphing-quadratics, function-builder,
    area-model-algebra, area-model-introduction, fractions-intro
────────────────────────────────────────────────────────────────────────
SLIDE N [embed | provider: geogebra]
app: geometry
title: GeoGebra Geometry
aspect: 16:9
  app options: graphing · geometry · 3d · scientific · classic
  Use geometry for compass/ruler constructions; use desmos slide for graphing functions.
────────────────────────────────────────────────────────────────────────
SLIDE N [embed | provider: maps]
location: Sydney+Opera+House
zoom: 15
title: Sydney Opera House
aspect: 16:9
  zoom: 10–14 for cities/regions, 15–18 for landmarks/buildings.
────────────────────────────────────────────────────────────────────────

## Mathematics — CRITICAL
- ALWAYS use LaTeX for every mathematical expression, formula, and symbol.
- Inline:   $x^2 + y^2 = r^2$   $\\frac{a}{b}$   $\\sqrt{x}$   $\\pi r^2$   $\\vec{F} = m\\vec{a}$
- Display:  $$E = mc^2$$
- NEVER use ASCII math: no x^2, no a/b, no sqrt(x), no F=ma (write $F=ma$).
- Applies to ALL fields: questions, options, card fronts/backs, table cells, labels, etc.

## Quality rules
- Match curriculum terminology and difficulty exactly to the specified syllabus and year level.
- Write full sentences and paragraphs — not "content about X" or "explanation here".
- Every question must have plausible distractors and a genuinely educational explanation.
- Use dividers to chunk the lesson into logical sections.
- For science/maths topics: always consider whether a desmos or PhET embed slide would be better than describing something in text.`;

/* ─── Stage 2: JSON Formatter system prompt ──────────────────────────────── */

function buildFormatterSystem() {
  return `You are a JSON formatter. Convert the lesson plan below EXACTLY to the slide JSON schema.
Do NOT add slides, remove slides, rephrase content, or invent material.
Preserve every question, answer, explanation, and expression precisely as written in the plan.
Your only job is to apply the correct JSON structure and field names.

## Slide JSON schemas — use ONLY these

### divider
{"type":"divider","title":"Section Title","subtitle":"Optional subtitle"}

### text
{"type":"text","content":"## Heading\\n\\nBody with $math$ and **bold**.","layout":"default","tone":"neutral"}
layout: "default" | "hero" | "centered" | "callout"
tone: "neutral" | "info" | "tip" | "warning" | "example" | "quote"
content: markdown string — headings ##/###, **bold**, *italic*, - bullets, $inline$, $$display$$

### choice
{"type":"choice","question":"...","options":["A text","B text","C text","D text"],"correctIndices":[1],"mode":"single","explanation":"..."}
mode: "single" | "multiple" | "truefalse"
correctIndices: 0-based integer array  (A=0, B=1, C=2, D=3, E=4)

### fillblank
Textbox: {"type":"fillblank","template":"Sentence with {{0}} and {{1}}.","blanks":[{"answers":["ans1","alt2"]},{"answers":["ans"]}],"mode":"textbox","explanation":"..."}
Dropdown: {"type":"fillblank","template":"The {{0}} of the cell.","blanks":[{"answers":["mitochondria"],"options":["nucleus","mitochondria","membrane","ribosome"]}],"mode":"dropdown","explanation":"..."}
CRITICAL: {{N}} must NEVER appear inside $...$ or $$...$$ in the template string.
Placeholder count must exactly match the blanks array length.

### cards
{"type":"cards","mode":"carousel","cards":[{"front":"Term","back":"Definition"}]}
{"type":"cards","mode":"grid","columns":2,"cards":[{"front":"Term","back":"Definition"}]}

### match
{"type":"match","pairs":[{"left":"Mitosis","right":"Cell division for growth"},{"left":"Meiosis","right":"Cell division for reproduction"}],"explanation":"..."}
Needs ≥2 pairs.

### order
{"type":"order","prompt":"Put these in order.","items":["First","Second","Third"],"explanation":"..."}
items must be in CORRECT order — player shuffles them. Needs ≥2 items.

### table
{"type":"table","headers":"row","rows":[["H1","H2","H3"],["v1","v2","v3"]]}
headers: "none" | "row" | "column" | "both"

### chart
Bar/line/area/scatter: {"type":"chart","chartType":"bar","title":"...","data":[{"x":"2020","y":2.1},{"x":"2021","y":5.8}],"xLabel":"Year","yLabel":"Growth (%)","caption":"..."}
Pie: {"type":"chart","chartType":"pie","title":"...","data":[{"name":"Solar","value":32},{"name":"Wind","value":28}],"caption":"..."}
chartType: "bar" | "line" | "area" | "pie" | "scatter"

### diagram
{"type":"diagram","code":"graph TD\\n  A[Start] --> B{Decision?}\\n  B -->|Yes| C[Do it]","caption":"..."}
code must be valid Mermaid syntax.

### timeline
{"type":"timeline","prompt":"...","events":[{"label":"Franz Ferdinand assassinated","year":"1914"},{"label":"Treaty of Versailles","year":"1919"}],"explanation":"..."}
Events must be in CORRECT chronological order (player shuffles them). Needs ≥2 events.
year: plain text string — NEVER wrap in $ signs.

### desmos
{"type":"desmos","title":"...","expressions":[{"id":"e1","latex":"y=a*x^2+b*x+c","color":"#6366f1"},{"id":"a","latex":"a=1"},{"id":"b","latex":"b=0"}],"bounds":{"left":-10,"right":10,"bottom":-15,"top":15},"caption":"..."}
Expression ids must be unique strings. Colors: #6366f1 indigo, #10b981 green, #f59e0b amber, #ef4444 red, #8b5cf6 violet, #06b6d4 cyan.

### embed — PhET
{"type":"embed","url":"https://phet.colorado.edu/sims/html/{slug}/latest/{slug}_en.html","title":"PhET: Name","aspect":"16:9"}

### embed — GeoGebra
{"type":"embed","url":"https://www.geogebra.org/{app}","title":"GeoGebra ...","aspect":"16:9"}
app: graphing | geometry | 3d | scientific | classic

### embed — Google Maps
{"type":"embed","url":"https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY_PLACEHOLDER}&q={URL-encoded+location}&zoom={1-20}","title":"...","aspect":"16:9"}

## Hard rules
- Return ONLY {"slides":[...]}. No prose, no markdown fences, no extra keys.
- Do NOT generate "media" or "hotspot" slides — these require real uploaded image URLs.
- correctIndices must be a 0-based integer array.
- Pie chart data uses "name"/"value"; all others use "x"/"y".
- Desmos expression ids must be unique strings within each slide.
- timeline year must be a plain string, never wrapped in $ signs.
- match needs ≥2 pairs; order needs ≥2 items; timeline needs ≥2 events.
- fillblank: {{N}} must NOT appear inside LaTeX delimiters $...$ or $$...$$.
- embed: ONLY use the approved URL patterns above. Never fabricate or guess URLs.`;
}

/* ─── Stage 1 API call ───────────────────────────────────────────────────── */

async function runStage1(client, notes, opts, slideCount) {
  const contextLines = [
    opts.curriculum ? `Curriculum / syllabus: ${opts.curriculum}` : null,
    opts.audience   ? `Audience / year level: ${opts.audience}`   : null,
    opts.title      ? `Lesson title: ${opts.title}`               : null,
  ].filter(Boolean);

  const userMsg = [
    contextLines.length ? `## Context\n${contextLines.join('\n')}` : null,
    `## Target\nPlan EXACTLY ${slideCount} slides (±1 acceptable). This overrides any quantity mentioned in the source material.`,
    opts.outputDescription ? `## Output instructions\n${opts.outputDescription.trim()}` : null,
    `## Source material\n${notes}`,
    'Write the complete lesson plan now. Number slides SLIDE 1, SLIDE 2, … and separate each with ---',
  ].filter(Boolean).join('\n\n');

  const completion = await client.chat.completions.create({
    model: opts.model || 'gpt-5.4-mini',
    messages: [
      { role: 'system', content: PLANNER_SYSTEM },
      { role: 'user',   content: userMsg },
    ],
  });

  return completion.choices?.[0]?.message?.content?.trim() || '';
}

/* ─── Stage 2 API call ───────────────────────────────────────────────────── */

async function runStage2(client, plan, formatterModel) {
  const userMsg = [
    'Convert the lesson plan below to JSON exactly. Do not add, remove, or rephrase any content.',
    '',
    '## Lesson plan',
    plan,
    '',
    'Return ONLY {"slides":[...]}.',
  ].join('\n');

  const completion = await client.chat.completions.create({
    model: formatterModel || FORMATTER_MODEL_DEFAULT,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildFormatterSystem() },
      { role: 'user',   content: userMsg },
    ],
  });

  return completion.choices?.[0]?.message?.content || '{}';
}

/* ─── Main export ────────────────────────────────────────────────────────── */

async function generateLessonSlides(notes, opts = {}) {
  const client = getClient();
  if (!client) {
    const err = new Error('AI is not configured on the server.');
    err.status = 503;
    throw err;
  }

  const slideCount = Math.min(Math.max(Number(opts.slideCount) || 15, 3), 50);

  // ── Stage 1: plan ──────────────────────────────────────────────────────
  const plan = await runStage1(client, notes, opts, slideCount);
  if (!plan) {
    const err = new Error('AI planning stage returned no content. Try again.');
    err.status = 502;
    throw err;
  }

  // ── Stage 2: format ────────────────────────────────────────────────────
  const text = await runStage2(client, plan, opts.formatterModel);

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const err = new Error('AI formatting stage returned non-JSON output. Try again.');
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

  // Salvage: drop individual invalid slides rather than failing everything.
  const valid   = [];
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
    slides:   validateSlides(valid).slides,
    warnings: dropped.map((d) => `Dropped slide ${d.index}: ${d.errors.join('; ')}`),
  };
}

module.exports = { generateLessonSlides, getClient };
