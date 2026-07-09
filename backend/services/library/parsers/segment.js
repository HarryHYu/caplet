/**
 * segment — split a long document into chunks small enough to fit one LLM
 * extraction call, breaking on paragraph boundaries so context isn't cut mid-idea.
 * (Bigger than retrieval chunks: we want the model to see whole sections.)
 */
function segment(text, maxChars = 6000) {
  const paras = String(text || '').split(/\n\s*\n+/);
  const segs = [];
  let cur = '';
  for (const p of paras) {
    const candidate = cur ? `${cur}\n\n${p}` : p;
    if (candidate.length > maxChars && cur) {
      segs.push(cur);
      cur = p;
    } else {
      cur = candidate;
    }
  }
  if (cur.trim()) segs.push(cur);
  return segs;
}

module.exports = { segment };
