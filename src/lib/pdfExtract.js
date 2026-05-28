/**
 * Extract plain text from a PDF File object using pdfjs-dist.
 * Runs entirely in the browser — the PDF never leaves the device until
 * the extracted text is sent to the AI endpoint.
 */
export async function extractPdfText(file) {
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
    const pageText = content.items.map((item) => item.str).join(' ');
    pages.push(pageText);
  }

  return pages.join('\n\n').replace(/\s{3,}/g, ' ').trim();
}
