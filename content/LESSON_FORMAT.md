# Lesson content format (for AI → import pipeline)

When you paste a lesson in the chat (with slides, video/image URLs, and quiz), the AI will return **one JSON file** in this format. Save it and run the import script to add the lesson to Caplet.

## JSON structure

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
    { "type": "text", "content": "Markdown or plain text...", "caption": "Optional" },
    { "type": "video", "content": "https://www.youtube.com/watch?v=...", "caption": "Optional title" },
    { "type": "image", "content": "https://example.com/image.jpg", "caption": "Optional caption" }
  ],
  "quiz": [
    {
      "question": "Who are shareholders?",
      "options": ["A. ...", "B. ...", "C. People who own part of a company by buying shares", "D. ..."],
      "correctIndex": 2
    }
  ]
}
```

## Field reference

| Field | Required | Notes |
|-------|----------|--------|
| `courseTitle` | Yes | Creates or matches course by title. |
| `courseShortDescription` | No | Defaults to courseTitle if missing. |
| `courseDescription` | No | Defaults to short description if missing. |
| `courseCategory` | No | One of: budgeting, superannuation, tax, loans, investment, planning, corporate-finance, other. Default: `other`. |
| `courseLevel` | No | beginner, intermediate, advanced. Default: `beginner`. |
| `moduleTitle` | No | Module name (Course → Module → Lesson). Creates or matches module by title. Default: `Content`. |
| `lessonTitle` | Yes | Lesson name. |
| `lessonOrder` | No | 1-based order within module. Default: append. |
| `slides` | Yes (for slide-based) | Array of content slides: `{ type: "text"|"image"|"video", content: string, caption?: string }`. You can also put question slides inline: `{ type: "question", question, options: string[], correctIndex: number, explanation?: string }`. |
| `quiz` | No | Array of `{ question, options: string[], correctIndex: number, explanation?: string }` (0-based). On import, each quiz item is appended as a **separate slide** (type `question`), so the lesson is one linear flow: content slides then question slides. Progress is tracked by slide index; question answers are stored per slide. |

## Paste workflow

1. Paste your lesson text in the chat (with (SLIDE 1), (SLIDE 2), VIDEO: url, Image link: url, Q1/Q2/Correct: X).
2. AI returns one JSON file in the format above.
3. Save as e.g. `content/lessons/corporate-finance-stakeholders.json`.
4. From repo root, run: `cd backend && node scripts/import-lesson.js ../content/lessons/corporate-finance-stakeholders.json`  
   Or from `backend`: `node scripts/import-lesson.js ../content/example-lesson.json`
5. Course and lesson appear in the DB. Publish the course and lesson in admin to show them on the site.

**Note:** The backend must have been run at least once (so the DB has the `slides` and `lastSlideIndex` columns) before running the import script.

## Media

- **Video**: use full URL (e.g. YouTube watch link). Stored as-is; player embeds it.
- **Image**: use full URL. Stored as-is; displayed as `<img src="...">`.
