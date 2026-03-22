# Year 10 AT2 Revision

- **Revision** module: normal lessons (add via `import-lesson.js` with `"moduleTitle": "Revision"`)
- **Tools** module: flashcards, matching, fill-in-blank, ordering (add via `import-lesson.js` with `"moduleTitle": "Tools"`)

Example for a lesson in Revision:
```json
{
  "courseTitle": "Year 10 AT2 Revision",
  "moduleTitle": "Revision",
  "lessonTitle": "Your lesson title",
  "slides": [...]
}
```

Example for a lesson in Tools:
```json
{
  "courseTitle": "Year 10 AT2 Revision",
  "moduleTitle": "Tools",
  "lessonTitle": "Your tool title",
  "slides": [
    { "type": "flashcard", "cards": [...] },
    { "type": "matching", "pairs": [...] },
    ...
  ]
}
```
