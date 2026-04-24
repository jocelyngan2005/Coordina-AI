import * as pdfjsLib from 'pdfjs-dist';

// Point the worker at the bundled worker file served by Vite's static assets.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/** One rendered page as a JPEG Blob. */
export interface PdfPageBlob {
  /** 1-based page number */
  pageNumber: number;
  blob: Blob;
}

/** Progress callback shape for PDF rendering. */
export type PdfRenderProgress = {
  /** How many pages have finished rendering so far. */
  pagesRendered: number;
  /** Total number of pages in the document. */
  totalPages: number;
};

/**
 * Converts every page of a PDF File into a JPEG Blob by rendering via PDF.js
 * onto an HTMLCanvasElement (required by pdfjs-dist v5 RenderParameters).
 *
 * @param file        - The PDF File to convert.
 * @param scale       - Rendering scale (default 2 = 2× for crisp OCR output).
 * @param onProgress  - Optional callback called after each page finishes.
 * @returns Array of {pageNumber, blob} objects in page order.
 */
export async function pdfToJpegBlobs(
  file: File,
  scale = 2,
  onProgress?: (p: PdfRenderProgress) => void,
): Promise<PdfPageBlob[]> {
  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const results: PdfPageBlob[] = [];

  // Reuse a single off-DOM canvas element across all pages.
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context for PDF rendering');

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // pdfjs-dist v5: `canvas` is the required field; `canvasContext` is optional
    // (kept for compat). Pass both so older and newer internal paths both work.
    await page.render({ canvas, viewport }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error(`toBlob returned null for page ${pageNum}`))),
        'image/jpeg',
        0.92,
      );
    });

    results.push({ pageNumber: pageNum, blob });
    onProgress?.({ pagesRendered: pageNum, totalPages });
  }

  return results;
}
