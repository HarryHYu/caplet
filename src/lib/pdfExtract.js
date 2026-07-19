/**
 * Extract plain text from a PDF File object using pdfjs-dist.
 * Runs entirely in the browser — the original file stays on the device and
 * only extracted text is sent to the deterministic subject-pack importer.
 */
function pageTextFromItems(items = []) {
  const lines = [];
  for (const item of items) {
    const text = String(item.str || '').trim();
    if (!text) continue;
    const y = Math.round(Number(item.transform?.[5] || 0) / 2) * 2;
    const x = Number(item.transform?.[4] || 0);
    let line = lines.find((candidate) => Math.abs(candidate.y - y) <= 2);
    if (!line) {
      line = { y, items: [] };
      lines.push(line);
    }
    line.items.push({ x, text });
  }
  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) => line.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

export async function extractPdfPages(file) {
  // Dynamic import keeps pdfjs out of the initial bundle.
  const pdfjsLib = await import('pdfjs-dist');

  // Point the worker at the copy shipped with the package.
  // Vite serves files from node_modules via ?url import.
  const workerUrl = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push({ pageNumber: i, text: pageTextFromItems(content.items) });
  }

  return pages;
}

export async function extractPdfText(file) {
  const pages = await extractPdfPages(file);
  return pages.map((page) => `[Page ${page.pageNumber}]\n${page.text}`).join('\n\n').trim();
}

export async function extractSyllabusFile(file) {
  const name = String(file?.name || '').toLowerCase();
  const type = String(file?.type || '').toLowerCase();
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    const pages = await extractPdfPages(file);
    return {
      format: 'pdf',
      pageCount: pages.length,
      pages,
      text: pages.map((page) => `[Page ${page.pageNumber}]\n${page.text}`).join('\n\n').trim(),
    };
  }
  if (type.includes('wordprocessingml') || name.endsWith('.docx')) {
    const mammoth = await import('mammoth/mammoth.browser.js');
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return { format: 'docx', pageCount: null, pages: [], text: String(result.value || '').trim() };
  }
  const text = await file.text();
  return { format: 'text', pageCount: null, pages: [], text: String(text || '').trim() };
}
