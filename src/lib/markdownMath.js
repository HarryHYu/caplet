/**
 * remark-math understands $...$ and $$...$$, while tutoring models also
 * commonly return the equivalent LaTeX delimiters \(...\) and \[...\].
 * Normalise those delimiters before Markdown parsing so formulas render as
 * maths instead of looking like source code to the learner.
 */
export function normalizeMarkdownMath(markdown = '') {
  return String(markdown)
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, expression) => `$$${expression}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, expression) => `$${expression}$`);
}
