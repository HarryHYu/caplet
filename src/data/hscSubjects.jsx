/**
 * HSC subject catalogue — the single source of truth for the Resource Library
 * page and its homepage showcase. Each subject carries a unique hand-drawn glyph
 * (the inner SVG paths); render them through the <Glyph> frame in SubjectGlyph.jsx.
 */

// One unique glyph per subject, drawn from that subject's own world.
export const glyphs = {
  english: (
    <>
      <path d="M12 6.5v13" />
      <path d="M12 6.5C10.3 5.3 7.8 5 5.5 5.6v12.2c2.3-.6 4.8-.3 6.5.9" />
      <path d="M12 6.5c1.7-1.2 4.2-1.5 6.5-.9v12.2c-2.3-.6-4.8-.3-6.5.9" />
    </>
  ),
  modernHistory: (
    <>
      <circle cx="12" cy="13" r="6.4" />
      <path d="M12 13V9.5" />
      <path d="M12 13l2.6 1.5" />
      <path d="M10.5 3.6h3" />
      <path d="M12 3.6v3" />
    </>
  ),
  ancientHistory: (
    <>
      <path d="M5 6.5h14" />
      <path d="M4.5 18.5h15" />
      <path d="M6.6 6.5l.6 12M17.4 6.5l-.6 12" />
      <path d="M9 8.6v7.8M12 8.6v7.8M15 8.6v7.8" />
    </>
  ),
  geography: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M3.6 12h16.8" />
      <path d="M12 3.6c3.2 2.6 3.2 14.2 0 16.8M12 3.6c-3.2 2.6-3.2 14.2 0 16.8" />
    </>
  ),
  legal: (
    <>
      <path d="M12 4v16" />
      <path d="M7.5 20h9" />
      <path d="M5 8h14" />
      <path d="M12 5.2 5 8M12 5.2 19 8" />
      <path d="M5 8l-2.3 4.6a3 3 0 0 0 6 0L5 8Z" />
      <path d="M19 8l-2.3 4.6a3 3 0 0 0 6 0L19 8Z" />
    </>
  ),
  society: (
    <>
      <circle cx="9" cy="8.6" r="2.8" />
      <circle cx="16.4" cy="10" r="2.1" />
      <path d="M3.6 19c0-3.2 2.5-5.4 5.4-5.4s5.4 2.2 5.4 5.4" />
      <path d="M15 13.9c2.8-.3 5.4 1.6 5.4 5.1" />
    </>
  ),
  mathAdvanced: (
    <>
      <path d="M4.5 20V4" />
      <path d="M4.5 20h15" />
      <path d="M5.5 16.5c4-.5 5.5-9.5 8-9.5s3 6.5 5.5 6" />
    </>
  ),
  ext1: (
    <>
      <path d="M15.6 4.9c-2-.6-3 .6-3.4 3.2l-1.6 8.4c-.5 2.6-1.5 3.8-3.5 3.2" />
    </>
  ),
  ext2: (
    <>
      <path d="M16.6 5H7l6 7-6 7h9.6" />
    </>
  ),
  mathStandard: (
    <>
      <rect x="6" y="3.6" width="12" height="16.8" rx="1.8" />
      <path d="M8.5 7h7v3h-7z" />
      <path d="M9 13.5h.01M12 13.5h.01M15 13.5h.01M9 16.6h.01M12 16.6h.01M15 16.6h.01" />
    </>
  ),
  physics: (
    <>
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
    </>
  ),
  chemistry: (
    <>
      <path d="M9.5 3.6h5" />
      <path d="M10.5 3.6v5.2L6 17.2A2 2 0 0 0 7.8 20.4h8.4a2 2 0 0 0 1.8-3.2L13.5 8.8V3.6" />
      <path d="M8.2 14h7.6" />
    </>
  ),
  biology: (
    <>
      <path d="M8 3.6c0 4.2 8 5.7 8 8.4s-8 4.2-8 8.4" />
      <path d="M16 3.6c0 4.2-8 5.7-8 8.4s8 4.2 8 8.4" />
      <path d="M9 7h6M9.4 9.6h5.2M9.4 14.4h5.2M9 17h6" />
    </>
  ),
  investigating: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M15.6 15.6 20.5 20.5" />
      <path d="M4 4l.6 1.5L6 6l-1.4.5L4 8l-.6-1.5L2 6l1.4-.5z" fill="currentColor" stroke="none" />
    </>
  ),
  economics: (
    <>
      <path d="M4 17l5-5 3 3 7.5-7.6" />
      <path d="M15.4 7h4.6v4.6" />
    </>
  ),
  business: (
    <>
      <rect x="3.6" y="7.5" width="16.8" height="12" rx="1.8" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" />
      <path d="M3.6 13h16.8" />
      <path d="M11 13h2" />
    </>
  ),
};

export const faculties = [
  {
    name: 'English & Humanities',
    block: 'block-blue',
    text: 'text-blue',
    subjects: [
      { name: 'English', tag: 'Standard · Advanced · Extension', glyph: glyphs.english },
      { name: 'Modern History', tag: 'Year 11–12', glyph: glyphs.modernHistory },
      { name: 'Ancient History', tag: 'Year 11–12', glyph: glyphs.ancientHistory },
      { name: 'Geography', tag: 'Year 11–12', glyph: glyphs.geography },
      { name: 'Legal Studies', tag: 'Year 11–12', glyph: glyphs.legal },
      { name: 'Society & Culture', tag: 'Year 11–12', glyph: glyphs.society },
    ],
  },
  {
    name: 'Mathematics',
    block: 'block-green',
    text: 'text-green',
    subjects: [
      { name: 'Mathematics Advanced', tag: 'Year 11–12', glyph: glyphs.mathAdvanced },
      { name: 'Extension 1', tag: 'Year 11–12', glyph: glyphs.ext1 },
      { name: 'Extension 2', tag: 'Year 12', glyph: glyphs.ext2 },
      { name: 'Mathematics Standard', tag: 'Year 11–12', glyph: glyphs.mathStandard },
    ],
  },
  {
    name: 'Sciences',
    block: 'block-amber',
    text: 'text-amber',
    subjects: [
      { name: 'Physics', tag: 'Year 11–12', glyph: glyphs.physics },
      { name: 'Chemistry', tag: 'Year 11–12', glyph: glyphs.chemistry },
      { name: 'Biology', tag: 'Year 11–12', glyph: glyphs.biology },
      { name: 'Investigating Science', tag: 'Year 11–12', glyph: glyphs.investigating },
    ],
  },
  {
    name: 'Commerce',
    block: 'block-coral',
    text: 'text-coral',
    subjects: [
      { name: 'Economics', tag: 'Year 11–12', glyph: glyphs.economics, slug: 'economics', available: true },
      { name: 'Business Studies', tag: 'Year 11–12', glyph: glyphs.business },
    ],
  },
];

export const subjectCount = faculties.reduce((n, f) => n + f.subjects.length, 0);
