# Content Pipeline

This document covers how course content is created, formatted, and imported into Caplet.

---

## Table of Contents

1. [Overview](#overview)
2. [Lesson JSON Format](#lesson-json-format)
3. [Field Reference](#field-reference)
4. [Slide Types](#slide-types)
5. [Import Workflow](#import-workflow)
6. [Course Seeding Scripts](#course-seeding-scripts)
7. [Media Guidelines](#media-guidelines)

---

## Overview

Caplet uses a **slides-based lesson format**. Each lesson is a linear sequence of slides (text, video, image, or question). Content is stored as JSON in the database.

The pipeline is:
1. Author lesson content (slides + quiz)
2. Format as a JSON file following the spec below
3. Run the import script to add it to the database
4. Publish the course and lesson in the admin panel

---

## Lesson JSON Format

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
    { "type": "image", "content": "https://example.com/image.jpg", "caption": "Optional caption" },
    {
      "type": "question",
      "question": "Who are shareholders?",
      "options": ["A. ...", "B. ...", "C. People who own part of a company by buying shares", "D. ..."],
      "correctIndex": 2,
      "explanation": "Optional explanation shown after answering."
    }
  ],
  "quiz": [
    {
      "question": "Who are shareholders?",
      "options": ["A. ...", "B. ...", "C. People who own part of a company by buying shares", "D. ..."],
      "correctIndex": 2,
      "explanation": "Optional explanation."
    }
  ]
}
```

> **Note:** You can put question slides inline in `slides` **or** in the `quiz` array. On import, each `quiz` item is appended as a separate `question` slide at the end of the lesson. The lesson is one linear flow: content slides → question slides.

---

## Field Reference

| Field | Required | Notes |
|---|---|---|
| `courseTitle` | ✅ Yes | Creates or matches course by title |
| `courseShortDescription` | No | Defaults to `courseTitle` if missing |
| `courseDescription` | No | Defaults to `courseShortDescription` if missing |
| `courseCategory` | No | One of: `budgeting`, `superannuation`, `tax`, `loans`, `investment`, `planning`, `corporate-finance`, `other`. Default: `other` |
| `courseLevel` | No | `beginner`, `intermediate`, `advanced`. Default: `beginner` |
| `moduleTitle` | No | Module name within the course. Creates or matches by title. Default: `Content` |
| `lessonTitle` | ✅ Yes | Lesson name |
| `lessonOrder` | No | 1-based order within module. Default: append to end |
| `slides` | ✅ Yes | Array of content slides (see Slide Types below) |
| `quiz` | No | Array of quiz questions — appended as `question` slides after content slides |

---

## Slide Types

### Text Slide
```json
{ "type": "text", "content": "Markdown or plain text content here.", "caption": "Optional label" }
```

### Video Slide
```json
{ "type": "video", "content": "https://www.youtube.com/watch?v=VIDEOID", "caption": "Optional title" }
```
- Use the full YouTube watch URL. The player embeds it automatically.

### Image Slide
```json
{ "type": "image", "content": "https://example.com/image.jpg", "caption": "Optional caption" }
```
- Use a full URL. Displayed as `<img src="...">`.

### Question Slide
```json
{
  "type": "question",
  "question": "What is a budget?",
  "options": ["A. A type of bank account", "B. A plan for income and expenses", "C. A tax form", "D. A savings account"],
  "correctIndex": 1,
  "explanation": "A budget is a plan that outlines expected income and expenses over a period."
}
```
- `correctIndex` is 0-based.
- `explanation` is optional but recommended — shown to the user after they answer.
- Progress is tracked by slide index; answers are stored in `UserProgress.quizScores`.

---

## Import Workflow

### Using AI to Generate the JSON

1. Paste your lesson text in the chat (with `(SLIDE 1)`, `(SLIDE 2)`, `VIDEO: url`, `Image link: url`, `Q1/Q2/Correct: X` markers).
2. AI returns one JSON file in the format above.
3. Save it to `content/lessons/your-lesson-name.json`.

### Running the Import Script

From the **project root**:
```bash
cd backend && node scripts/import-lesson.js ../content/lessons/your-lesson-name.json
```

From the **`backend/` directory**:
```bash
node scripts/import-lesson.js ../content/lessons/your-lesson-name.json
```

> **Prerequisite:** The backend must have been run at least once (so the DB has the `slides` and `lastSlideIndex` columns) before running the import script.

### After Import

1. The course and lesson will appear in the database.
2. Go to the admin panel to **publish** the course and lesson so they appear on the site.

---

## Course Seeding Scripts

Existing courses are seeded via standalone scripts in `backend/scripts/`:

```bash
# From project root
cd backend && node scripts/setup-budgeting-101.js
cd backend && node scripts/add-investment-course.js
cd backend && node scripts/add-quantitative-finance-course.js

# Run against Railway (set DATABASE_URL first)
cd backend && node scripts/setup-corporate-finance-part1.js

# Database cleanup
cd backend && node cleanup-database.js
```

### Setting DATABASE_URL for Railway

Add to `backend/.env`:
```bash
DATABASE_URL=postgres://user:password@host:port/railway
```

Get the URL from: **Railway dashboard → your Postgres service → Connect → copy the Postgres connection URL**.

> ⚠️ Don't paste the URL in chat — add it to `backend/.env` only.

---

## Media Guidelines

| Type | Format | Notes |
|---|---|---|
| Video | Full YouTube watch URL | e.g. `https://www.youtube.com/watch?v=VIDEOID` |
| Image | Full HTTPS URL | e.g. `https://example.com/image.jpg` |

- Videos are stored as-is; the lesson player embeds them automatically.
- Images are stored as-is; displayed as `<img src="...">`.
- Host images on a reliable CDN or public storage (e.g. Cloudinary, S3, or direct URLs).
