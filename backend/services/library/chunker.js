/**
 * chunker — split a document's text into retrieval-sized pieces.
 *
 * Why chunk: you retrieve and embed small passages, not whole documents, so
 * retrieval is precise and prompts stay small/cheap. Defaults below are sane
 * starting points (see how-a-library-works.md, Part 2.2): ~300 words/chunk
 * with a small overlap so ideas aren't sliced in half at a boundary.
 *
 * This is the GENERIC chunker (split prose by length on paragraph boundaries).
 * For real syllabus / marking content you'll eventually write a STRUCTURED
 * parser that emits one chunk per outcome content-point or per marking
 * criterion, carrying its codes as metadata — that beats blind length
 * splitting. The ingestion script calls chunkText() for now; swap in a
 * structured parser per source type when you have the source format.
 */

const DEFAULT_MAX_WORDS = 300;
const DEFAULT_OVERLAP_WORDS = 40;

function wordCount(s) {
  return s.split(/\s+/).filter(Boolean).length;
}

/**
 * Split text into chunks of ~maxWords, packing whole paragraphs together and
 * carrying `overlapWords` from the end of one chunk into the next.
 * @returns {string[]}
 */
function chunkText(text, { maxWords = DEFAULT_MAX_WORDS, overlapWords = DEFAULT_OVERLAP_WORDS } = {}) {
  const clean = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!clean) return [];

  // Split into paragraphs first (natural boundaries).
  const paragraphs = clean.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);

  const chunks = [];
  let current = [];
  let currentWords = 0;

  const flush = () => {
    if (!current.length) return;
    const chunk = current.join('\n\n').trim();
    if (chunk) chunks.push(chunk);
    // Seed the next chunk with the tail of this one (overlap).
    if (overlapWords > 0) {
      const tail = chunk.split(/\s+/).slice(-overlapWords).join(' ');
      current = tail ? [tail] : [];
      currentWords = wordCount(current.join(' '));
    } else {
      current = [];
      currentWords = 0;
    }
  };

  for (const para of paragraphs) {
    const w = wordCount(para);
    // A single huge paragraph: hard-split it by words.
    if (w > maxWords) {
      flush();
      const words = para.split(/\s+/);
      for (let i = 0; i < words.length; i += maxWords - overlapWords) {
        chunks.push(words.slice(i, i + maxWords).join(' '));
      }
      current = [];
      currentWords = 0;
      continue;
    }
    if (currentWords + w > maxWords) flush();
    current.push(para);
    currentWords += w;
  }
  flush();

  // De-dupe accidental repeats from overlap seeding at the very end.
  return chunks.filter((c, i) => c && c !== chunks[i - 1]);
}

/**
 * Is this line a heading / section start? (markdown #, "Topic:/Outcome:" labels,
 * or a short ALL-CAPS line). Used by chunkStructured to split on real boundaries.
 */
function isHeading(line) {
  const t = line.trim();
  if (!t) return false;
  if (/^#{1,6}\s+/.test(t)) return true; // markdown heading
  if (/^(topic|outcome|content|unit|module|section|stage|strand)\b.*:?\s*$/i.test(t)) return true;
  // Short line with letters, all uppercase, no sentence punctuation -> heading-like.
  if (t.length <= 60 && /[A-Za-z]/.test(t) && t === t.toUpperCase() && !/[.?!]/.test(t)) return true;
  return false;
}

/**
 * Structure-aware chunking: split text into sections on heading lines, then
 * chunk each section's body — but PREFIX every chunk with its heading so the
 * chunk is self-describing (much better retrieval than bare fragments).
 * Falls back to plain chunkText() when no headings are detected.
 * @returns {string[]}
 */
function chunkStructured(text, opts = {}) {
  const clean = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!clean) return [];

  const lines = clean.split('\n');
  const sections = [];
  let heading = '';
  let buf = [];
  const flush = () => {
    const body = buf.join('\n').trim();
    if (body) sections.push({ heading, body });
    buf = [];
  };
  for (const line of lines) {
    if (isHeading(line)) {
      flush();
      heading = line.replace(/^#{1,6}\s+/, '').trim();
    } else {
      buf.push(line);
    }
  }
  flush();

  const out = [];
  for (const sec of sections) {
    for (const piece of chunkText(sec.body, opts)) {
      out.push(sec.heading ? `${sec.heading}\n${piece}` : piece);
    }
  }
  return out.length ? out : chunkText(clean, opts);
}

module.exports = { chunkText, chunkStructured, isHeading, DEFAULT_MAX_WORDS, DEFAULT_OVERLAP_WORDS };
