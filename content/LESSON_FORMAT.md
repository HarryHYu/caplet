# Lesson content format

A lesson is an ordered array of **slides**. Each slide is one of nine canonical types. The player renders them one at a time; interactive types (`choice`, `fillblank`, `match`, `order`) record a right/wrong score against the user's progress.

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

## Scoring

| Type        | Records a quiz score? |
|-------------|----------------------|
| `text`      | No                   |
| `media`     | No                   |
| `choice`    | Yes (right/wrong)    |
| `fillblank` | Yes (all blanks must match) |
| `cards`     | No                   |
| `match`     | Yes (all pairs must match) |
| `order`     | Yes (sequence must equal `correctOrder`) |
| `table`     | No                   |
| `divider`   | No                   |

Scores are stored per-slide on `UserProgress.quizScores` keyed by slide index.

## Importing

1. Save your lesson JSON, e.g. `content/lessons/my-lesson.json`.
2. From the repo root:
   `cd backend && node scripts/import-lesson.js ../content/lessons/my-lesson.json`
3. Publish the course and lesson via the admin UI.
