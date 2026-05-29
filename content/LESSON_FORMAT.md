# Lesson content format

A lesson is an ordered array of **slides**. Each slide is one of fourteen canonical types. The player renders them one at a time; interactive types (`choice`, `fillblank`, `match`, `order`, `hotspot`, `timeline`) record a right/wrong score against the user's progress.

The legacy short types (`image`, `video`, `audio`, `question`, `flashcard`, `matching`, `ordering`, `truefalse`) are still accepted on input — the server normalizes them into the canonical shape on save.

## Top-level shape (for import / API)

```json
{
  "courseTitle": "Corporate Finance (I)",
  "courseShortDescription": "Optional one-line description.",
  "courseDescription": "Optional longer description.",
  "courseCategory": "corporate-finance",
  "courseLevel": "beginner",
  "moduleTitle": "Content",
  "lessonTitle": "Understanding Stakeholders 1.0",
  "lessonOrder": 1,
  "slides": [
    { "type": "text", "content": "Markdown or plain text..." }
  ]
}
```

## The 9 canonical slide types

### 1. `text` — written content
```json
{
  "type": "text",
  "content": "## Heading\nBody markdown.",
  "caption": "Optional source / footnote",
  "layout": "default",
  "tone": "neutral"
}
```
- `layout`: `default` | `hero` | `centered` | `callout`
- `tone`: `neutral` | `info` | `tip` | `warning` | `example` | `quote`

### 2. `media` — image / video / audio / embed
```json
{
  "type": "media",
  "source": "image",
  "url": "https://example.com/diagram.png",
  "caption": "Optional caption",
  "aspect": "auto"
}
```
- `source`: `image` | `video` (YouTube link) | `audio` | `embed`
- Legacy `{ "type": "image", "content": "..." }` and `{ "type": "video", "content": "..." }` still work.

### 3. `choice` — multiple choice / true-false
```json
{
  "type": "choice",
  "question": "Who are shareholders?",
  "options": ["...", "...", "People who own shares", "..."],
  "correctIndices": [2],
  "mode": "single",
  "explanation": "Optional feedback shown after submit."
}
```
- `mode`: `single` (one right answer), `multiple` (select all that apply), `truefalse` (forces options to `["True", "False"]`).
- Legacy `{ "type": "question", ..., "correctIndex": 2 }` is accepted.

### 4. `fillblank` — fill in the blanks
```json
{
  "type": "fillblank",
  "template": "Adults have {{0}} bones. Babies have {{1}}.",
  "blanks": [
    { "answers": ["206"] },
    { "answers": ["around 300", "300", "270"], "caseSensitive": false }
  ],
  "mode": "textbox",
  "explanation": "Optional"
}
```
- Use `{{0}}`, `{{1}}` placeholders in `template`.
- Each blank in `blanks` lists acceptable answers. Optionally pass `options: ["a","b","c"]` and set `mode: "dropdown"` for multiple choice per blank.

### 5. `cards` — flashcards
```json
{
  "type": "cards",
  "mode": "carousel",
  "columns": 2,
  "cards": [
    { "front": "Asset", "back": "Something you own that has value" },
    { "front": "Liability", "back": "Something you owe" }
  ],
  "caption": "Optional"
}
```
- `mode`: `carousel` (one at a time, tap to flip), `flip` (grid of flippable cards), `grid` (front+back shown together).

### 6. `match` — match the pairs
```json
{
  "type": "match",
  "pairs": [
    { "left": "Asset", "right": "Something you own" },
    { "left": "Liability", "right": "Something you owe" }
  ],
  "explanation": "Optional"
}
```
The right-hand column is shuffled in the player.

### 7. `order` — sort into the right order
```json
{
  "type": "order",
  "prompt": "Order these from largest to smallest.",
  "items": ["Sun", "Earth", "Moon"],
  "correctOrder": [0, 1, 2]
}
```
- `items` is the canonical (correct) sequence by default; the player shuffles it.
- `correctOrder` (optional) lets you list `items` in any order while specifying the correct sequence via indices into `items`.

### 8. `table` — reference table
```json
{
  "type": "table",
  "headers": "row",
  "rows": [
    ["Year", "Population"],
    ["2000", "6.1B"],
    ["2020", "7.8B"]
  ],
  "align": ["left", "right"]
}
```
- `headers`: `none` | `row` | `column` | `both`.

### 9. `divider` — section break
```json
{ "type": "divider", "title": "Part 2: Practice", "subtitle": "Optional kicker" }
```

### 10. `chart` — interactive data chart
```json
{
  "type": "chart",
  "chartType": "bar",
  "title": "GDP Growth 2010–2020",
  "data": [
    { "x": "2010", "y": 2.5 },
    { "x": "2015", "y": 3.1 },
    { "x": "2020", "y": 1.8 }
  ],
  "xLabel": "Year",
  "yLabel": "% Growth",
  "caption": "Source: World Bank"
}
```
- `chartType`: `bar` | `line` | `area` | `pie` | `scatter`.
- For **pie**: data uses `{ "name": "Category", "value": 30 }` keys.
- For all others: data uses `{ "x": "label", "y": number }` keys.

### 11. `diagram` — Mermaid diagram
```json
{
  "type": "diagram",
  "code": "graph TD\n  Demand --> Price\n  Supply --> Price\n  Price --> Equilibrium",
  "caption": "Supply and demand model"
}
```
- `code` must be valid [Mermaid](https://mermaid.js.org/) syntax.
- Supported: `graph`/`flowchart`, `sequenceDiagram`, `classDiagram`, `erDiagram`, `pie`, `mindmap`, `timeline`, `gantt`.

### 12. `embed` — iframe embed (Desmos, PhET, GeoGebra, etc.)
```json
{
  "type": "embed",
  "url": "https://www.desmos.com/calculator",
  "title": "Desmos Graph",
  "aspect": "16:9",
  "caption": "Explore the function below"
}
```
- `aspect`: `16:9` | `4:3` | `1:1` | `tall`.
- Common URLs: Desmos (`https://www.desmos.com/calculator`), GeoGebra (`https://www.geogebra.org/classic`), PhET sims (`https://phet.colorado.edu/sims/html/<name>/latest/<name>_en.html`).

### 13. `hotspot` — click the correct region on an image
```json
{
  "type": "hotspot",
  "image": "https://...",
  "question": "Click on the mitochondria",
  "regions": [
    { "id": 0, "label": "Mitochondria", "x": 45, "y": 30, "w": 10, "h": 8, "correct": true },
    { "id": 1, "label": "Nucleus", "x": 20, "y": 50, "w": 15, "h": 12, "correct": false }
  ],
  "explanation": "The mitochondria produces ATP via cellular respiration."
}
```
- `x`, `y`, `w`, `h` are **percentage** values (0–100) of the image dimensions.
- At least one region must have `"correct": true`.

### 14. `timeline` — drag events into chronological order
```json
{
  "type": "timeline",
  "prompt": "Put these events in chronological order",
  "events": [
    { "label": "World War I begins", "year": "1914" },
    { "label": "Treaty of Versailles", "year": "1919" },
    { "label": "Great Depression begins", "year": "1929" }
  ],
  "explanation": "WWI began in 1914 when..."
}
```
- Events must be stored in the **correct chronological order** — the player shuffles them for the student.
- `year` is optional but is revealed as feedback after submission.

## Scoring

| Type        | Records a quiz score? |
|-------------|----------------------|
| `text`      | No                   |
| `media`     | No                   |
| `choice`    | Yes (right/wrong)    |
| `fillblank` | Yes (all blanks must match) |
| `cards`     | No                   |
| `match`     | Yes (all pairs must align) |
| `order`     | Yes (sequence must equal `correctOrder`) |
| `table`     | No                   |
| `divider`   | No                   |
| `chart`     | No                   |
| `diagram`   | No                   |
| `embed`     | No                   |
| `hotspot`   | Yes (clicked region must be correct) |
| `timeline`  | Yes (sequence must be chronological) |

Scores are stored per-slide on `UserProgress.quizScores` keyed by slide index.

## Importing

1. Save your lesson JSON, e.g. `content/lessons/my-lesson.json`.
2. From the repo root:
   `cd backend && node scripts/import-lesson.js ../content/lessons/my-lesson.json`
3. Publish the course and lesson via the admin UI.
