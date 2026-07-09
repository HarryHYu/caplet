/**
 * textExtract — turn a fetched resource into plain text.
 *
 * - Plain/markdown/html/json text: returned (HTML lightly stripped).
 * - PDF: parsed with `pdf-parse` (cd backend && npm install pdf-parse).
 * - Images / scanned PDFs: need OCR. A hook is provided but intentionally
 *   left unconfigured — wire in Tesseract or a vision model when you reach
 *   the marking past-papers work. See ocrImage() below.
 *
 * Returns a plain string ('' if nothing could be extracted).
 */

const path = require('path');

function stripHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function extractPdf(buffer) {
  let pdfParse;
  try {
    pdfParse = require('pdf-parse');
  } catch (e) {
    throw new Error('PDF support needs the `pdf-parse` package. Run: cd backend && npm install pdf-parse');
  }
  const data = await pdfParse(buffer);
  return (data.text || '').trim();
}

/**
 * OCR hook for images and scanned PDFs. NOT configured by default.
 * To enable: install an OCR engine (e.g. `tesseract.js`) or call a vision
 * model, and return the recognised text here.
 */
async function ocrImage(/* buffer */) {
  throw new Error(
    'OCR is not configured. Images / scanned PDFs need an OCR step ' +
    '(e.g. tesseract.js or a vision model) before they can be ingested as text.'
  );
}

/**
 * @param {{name, mimeType, buffer?, text?}} resource
 * @returns {Promise<string>}
 */
async function extractText(resource) {
  // Already-text sources (txt, md, exported Google Docs).
  if (typeof resource.text === 'string') {
    const ext = path.extname(resource.name || '').toLowerCase();
    if (ext === '.html' || ext === '.htm' || (resource.mimeType || '').includes('html')) {
      return stripHtml(resource.text);
    }
    return resource.text.trim();
  }

  const buf = resource.buffer;
  if (!buf) return '';
  const mime = resource.mimeType || '';
  const ext = path.extname(resource.name || '').toLowerCase();

  if (mime.includes('pdf') || ext === '.pdf') {
    return extractPdf(buf);
  }
  if (mime.startsWith('text/') || ext === '.txt' || ext === '.md') {
    return buf.toString('utf8').trim();
  }
  if (mime.includes('html') || ext === '.html' || ext === '.htm') {
    return stripHtml(buf.toString('utf8'));
  }
  if (mime.startsWith('image/')) {
    return ocrImage(buf); // throws until OCR is configured
  }

  // .docx and others not yet supported in the skeleton.
  throw new Error(`No text extractor for "${resource.name}" (${mime || ext || 'unknown type'}).`);
}

module.exports = { extractText, stripHtml, ocrImage };
