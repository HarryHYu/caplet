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

// Placeholder string the AI puts in Google Maps URLs.
// The frontend replaces it with the real VITE_GOOGLE_MAPS_KEY at render time,
// so the backend never needs to hold the key.
const MAPS_KEY_PLACEHOLDER = '__MAPS_API_KEY__';

// Build the system prompt.
function buildSystem() {
  const mapsBlock = `**Google Maps** — always available, always use this exact URL pattern:
  https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY_PLACEHOLDER}&q={URL-encoded+location}&zoom={1-20}
  Use zoom 10–14 for cities/regions, 15–18 for landmarks/buildings.
  Example: {"type":"embed","url":"https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY_PLACEHOLDER}&q=Sydney+Opera+House&zoom=15","title":"Sydney Opera House","aspect":"16:9"}`;

  return `You are an expert curriculum designer. Given source material and context, you output a structured lesson as a strict JSON object: {"slides": [ ... ]}.

## Slide types (use ONLY these)

### Divider — section break / title card
{"type":"divider","title":"Section Title","subtitle":"Optional subtitle or description"}

### Text — reading slide with formatted content
{"type":"text","content":"## Heading\\n\\nParagraph with **bold** and $x^2$ math.","layout":"default","tone":"neutral"}
  - layout: "default" (standard), "hero" (large centred intro), "centered" (centred body), "callout" (highlighted box)
  - tone: "neutral", "info", "tip", "warning", "example", "quote"

### Choice — multiple-choice or true/false question
{"type":"choice","question":"What is $\\\\frac{d}{dx}[x^2]$?","options":["$x$","$2x$","$2$","$x^2$"],"correctIndices":[1],"mode":"single","explanation":"Power rule: bring the exponent down and reduce by 1."}
  - mode: "single" (one correct), "multiple" (tick all that apply), "truefalse" (options are always True/False)
  - correctIndices: 0-based array of correct option indices

### Fill-in-the-blank — typed or dropdown answer
Textbox: {"type":"fillblank","template":"Supply shifts {{0}} when input costs rise, and {{1}} when technology improves.","blanks":[{"answers":["left","to the left"]},{"answers":["right","to the right"]}],"mode":"textbox","explanation":"..."}
Dropdown: {"type":"fillblank","template":"The mitochondria is the {{0}} of the cell.","blanks":[{"answers":["powerhouse"],"options":["nucleus","powerhouse","membrane","ribosome"]}],"mode":"dropdown","explanation":"..."}
  - {{0}}, {{1}}, … placeholders must exactly match the blanks array length.
  - For dropdown: add "options" array to each blank (must include the correct answer).
  - "answers": all accepted correct answers (case-insensitive by default).

### Flashcards — term/definition cards
Carousel (flip one at a time — active recall): {"type":"cards","mode":"carousel","cards":[{"front":"Term or question","back":"Definition or answer"}]}
Grid (all visible — reference spread): {"type":"cards","mode":"grid","columns":2,"cards":[{"front":"Term","back":"Definition"}]}
  - Use carousel for active recall practice; grid for end-of-section reference.
  - "columns": 1–4, defaults to 2.

### Match — drag-and-drop matching pairs
{"type":"match","pairs":[{"left":"Mitosis","right":"Cell division for growth"},{"left":"Meiosis","right":"Cell division for reproduction"},{"left":"Apoptosis","right":"Programmed cell death"}],"explanation":"..."}
  - Needs ≥2 pairs. Right-side items are shuffled for the student.

### Order — drag-and-drop sequencing
{"type":"order","prompt":"Place these steps in the correct order.","items":["First","Second","Third","Fourth"],"explanation":"..."}
  - Items must be listed in the CORRECT order — the player shuffles them.
  - Needs ≥2 items.

### Table — structured comparison or data
{"type":"table","headers":"row","rows":[["Feature","Option A","Option B"],["Speed","Fast","Slow"],["Cost","High","Low"]]}
  - headers: "none", "row" (first row = header), "column" (first col = header), "both"

### Chart — data visualisation
Bar/line/area/scatter: {"type":"chart","chartType":"bar","title":"GDP Growth (%)","data":[{"x":"2020","y":2.1},{"x":"2021","y":5.8}],"xLabel":"Year","yLabel":"Growth (%)","caption":"..."}
Pie: {"type":"chart","chartType":"pie","title":"Energy Mix","data":[{"name":"Solar","value":32},{"name":"Wind","value":28},{"name":"Coal","value":40}],"caption":"..."}
  - chartType: "bar", "line", "area", "pie", "scatter"
  - Bar/line/area/scatter: data uses {"x": string|number, "y": number}
  - Pie: data uses {"name": string, "value": number}

### Mermaid diagram — process, flow, or relationship
{"type":"diagram","code":"graph TD\\n  A[Stimulus] --> B{Receptor}\\n  B -->|Nerve impulse| C[Effector]\\n  C --> D[Response]","caption":"..."}
  - Supported: graph/flowchart, sequenceDiagram, classDiagram, erDiagram, pie, mindmap, timeline, gantt.
  - Keep diagrams simple and well-formed.

### Timeline drag — chronological ordering activity
{"type":"timeline","prompt":"Drag these events into the correct chronological order.","events":[{"label":"Archduke Franz Ferdinand assassinated","year":"1914"},{"label":"Treaty of Versailles signed","year":"1919"},{"label":"League of Nations founded","year":"1920"}],"explanation":"..."}
  - Events must be listed in the CORRECT order — the player shuffles them.
  - "year" is optional but shown as feedback. Needs ≥2 events.

### Desmos interactive graph
{"type":"desmos","title":"Exploring Quadratic Functions","expressions":[{"id":"e1","latex":"y=ax^2+bx+c","color":"#6366f1"},{"id":"a","latex":"a=1"},{"id":"b","latex":"b=0"},{"id":"c","latex":"c=0"}],"bounds":{"left":-10,"right":10,"bottom":-15,"top":15},"caption":"Use the sliders to see how each coefficient changes the parabola."}
  - Use for any content that benefits from an interactive graph: functions, transformations, geometry, rates of change, physics.
  - "expressions": array of LaTeX expressions on one shared graph. Each must have a unique "id".
  - Sliders: define a variable as its own expression — e.g. {"id":"a","latex":"a=1"} — students can drag it.
  - Colors: "#6366f1" indigo, "#10b981" green, "#f59e0b" amber, "#ef4444" red, "#8b5cf6" violet, "#06b6d4" cyan.
  - "bounds": frame the key features (intercepts, turning points, asymptotes, intersections).
  - Valid Desmos LaTeX: y=mx+b, y=\\\\frac{1}{x}, y=\\\\sin(x), y=e^x, y=\\\\ln(x), x^2+y^2=r^2, y=\\\\sqrt{x}.
  - ALWAYS prefer desmos over describing a graph in text for mathematics or physics content.

### Embed — interactive simulation or map (iframe)
{"type":"embed","url":"...","title":"...","aspect":"16:9","caption":"..."}
  - aspect: "16:9" (default), "4:3", "1:1", "tall"
  - Use ONLY from the approved providers below — NEVER invent or guess URLs.

**PhET Interactive Simulations** (free, HTML5, no login required)
  URL pattern: https://phet.colorado.edu/sims/html/{slug}/latest/{slug}_en.html
  Slugs by subject —
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
  Earth Science: plate-tectonics, greenhouse-effect
  Maths: graphing-lines, graphing-slope-intercept, graphing-quadratics, function-builder,
    area-model-algebra, area-model-introduction, fractions-intro
  Example: {"type":"embed","url":"https://phet.colorado.edu/sims/html/projectile-motion/latest/projectile-motion_en.html","title":"PhET: Projectile Motion","aspect":"16:9"}

**GeoGebra** (interactive maths — geometry, graphing, algebra)
  Use these pre-built app URLs:
    Graphing calculator: https://www.geogebra.org/graphing
    Geometry tool:       https://www.geogebra.org/geometry
    3D Calculator:       https://www.geogebra.org/3d
    Scientific calc:     https://www.geogebra.org/scientific
    Classic (all-in-one):https://www.geogebra.org/classic
  Example: {"type":"embed","url":"https://www.geogebra.org/geometry","title":"GeoGebra Geometry","aspect":"16:9"}

${mapsBlock}

When to choose embed vs other types:
  - PhET: live physics/chemistry/biology experiments where interaction beats a diagram.
  - GeoGebra geometry tool: geometric constructions (compass, ruler, angles) — prefer over desmos for these.
  - GeoGebra graphing: use desmos slide instead — desmos has better slider/expression support.
  - Google Maps: geography, spatial context, location-based case studies.
  - Do NOT use embed when a desmos, diagram, or chart slide would serve the same purpose better.

## Hard rules
- Return ONLY the JSON object {"slides":[...]}. No prose, no markdown fences.
- Do NOT generate "media" or "hotspot" slides — these require real image/video URLs uploaded by a teacher.
- embed slides: ONLY use URLs from the approved providers listed above. NEVER fabricate URLs.
- correctIndices must be an array of 0-based integers.
- fillblank: NEVER place a {{blank}} inside a LaTeX math span ($...$ or $$...$$). The blank must sit outside all math delimiters. WRONG: "the vertex is at $({{0}}, {{1}})$" — CORRECT: "the vertex is at ({{0}}, {{1}})"
- fillblank placeholder count ({{0}}, {{1}}, …) must exactly match the blanks array length.
- timeline "year" field must be a plain text string like "1914" or "c. 1850" — NEVER wrap it in $ signs.
- order and timeline items must be listed in the CORRECT sequence — the player shuffles them.
- match needs ≥2 pairs; order needs ≥2 items; timeline needs ≥2 events.
- chart data must be a non-empty array. Pie uses "name"/"value"; others use "x"/"y".
- diagram code must be valid Mermaid syntax.
- Desmos expression ids must be unique strings within each slide.
- text.content markdown: headings (##, ###), bold (**), italic (*), bullet lists (-), inline code. No HTML, no horizontal rules (---).

## Mathematics formatting (CRITICAL)
- ALWAYS use LaTeX for every mathematical expression — never ASCII: no x^2, no a/b, no sqrt(x), no *.
- Inline math: single dollar signs → $x^2 + y^2 = r^2$, $\\\\frac{a}{b}$, $\\\\sqrt{x}$, $\\\\pi r^2$
- Display math (prominent standalone equations): double dollar signs → $$E = mc^2$$
- Applies EVERYWHERE: text content, choice questions/options, fillblank templates/blanks, card fronts/backs, match pairs, order items, table cells, timeline labels, explanations.
- CORRECT: $\\\\frac{\\\\Delta Q}{\\\\Delta P}$ — WRONG: ΔQ/ΔP
- CORRECT: $x^{-1}$ — WRONG: x^-1
- CORRECT: $\\\\vec{F} = m\\\\vec{a}$ — WRONG: F = ma (when vectors matter)
- CORRECT: $\\\\log_2(n)$ — WRONG: log2(n)

## Quality rules
- Match curriculum terminology and difficulty exactly to the specified syllabus and year level.
- Use correct technical vocabulary for the subject area.
- Explanations should explain the WHY — not just restate the correct answer.
- Divider slides mark logical sections — use them to chunk the lesson.
- Tables: use "headers":"row" for comparisons; "both" when both rows and columns have labels.
- Chart slides: for numerical data, statistics, trends (GDP, population, experimental results).
- Diagram slides: for processes, systems, hierarchies, flows (cell cycle, supply/demand, OSI model).
- Timeline slides: for ordered historical events, discoveries, or procedural steps with dates.
- Desmos slides: for any mathematical function, geometric shape, or interactive exploration.
- Embed PhET: for science simulations where live interactivity is the point.
- Embed GeoGebra geometry: for geometric constructions requiring compass/ruler tools.
- Cards carousel: active recall; cards grid: reference summary at end of a section.
- Fillblank dropdown: when the answer set is small and fixed (reduces ambiguity).
- Match slides: vocabulary, equation↔name, cause↔effect — better than a plain text list.`;
}

const FOCUS_INSTRUCTIONS = {
  full: `Generate a complete lesson with these phases:
1. Intro: one hero-layout text slide or divider to set the scene.
2. Content (4–6 slides): mix text, chart, diagram, table, desmos, and embed slides. Use desmos for mathematical functions/graphs. Use PhET embeds for science experiments. Use chart slides for data. Use diagram slides for processes.
3. Practice (4–6 slides): varied activities — choice (single and multiple), fillblank (textbox and dropdown), match, order, timeline. For maths/science include a desmos or PhET embed slide paired with a question.
4. Summary: one cards (mode:"carousel") or cards (mode:"grid") slide.
Aim for 12–18 slides total. Use divider slides to separate phases.`,

  practice: `Generate ONLY practice activity slides — no reading/content slides. Rules:
- Variety: choice (single AND multiple), fillblank (textbox AND dropdown), match, order, timeline.
- For maths/science: include at least one desmos or PhET embed slide showing a concept, immediately followed by a question about it.
- Every activity must have a clear question/prompt, correct answers, and a brief genuinely educational explanation.
- 8–12 activity slides total (not counting desmos/embed slides).`,

  flashcards: `Generate flashcard content:
- One cards slide with mode "carousel" containing 12–20 cards.
- Front: short term, concept, formula, or question. Back: concise but complete definition or explanation.
- If there are distinct topic areas, add 1–2 divider slides as section breaks.
- Do NOT add other slide types.`,

  summary: `Generate a condensed reference-style lesson:
- Divider slides to label each section.
- Text slides with layout "callout" and tone "tip" or "info" for key takeaways.
- Table slides for comparisons.
- Chart slides for numerical data or statistics.
- Diagram slides for processes, systems, or models.
- Desmos slides for mathematical functions or relationships.
- End with a cards (mode:"grid", columns:2) slide summarising the most important terms.
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

  const systemPrompt = buildSystem();

  const completion = await client.chat.completions.create({
    model: chosenModel,
    response_format: { type: 'json_object' },
    ...(isReasoning ? {} : { temperature: 0.5 }),
    messages: [
      { role: 'system', content: systemPrompt },
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
