/**
 * Shared limits and helpers for an essay's context library — the source
 * material (marker notes, quote banks, PDFs) the assistant reasons from.
 * Kept out of the component file so both the composer and the workspace can
 * import them without tripping react-refresh's component-only rule.
 */

export const MAX_CONTEXT_DOCS = 12;
export const MAX_DOC_CHARS = 150000;

/** PDF page markers are an extraction artifact, not part of the source. */
export const cleanExtractedText = (text) => String(text || '')
  .replace(/^\s*\[Page \d+\]\s*$/gm, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

export const wordsIn = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;
