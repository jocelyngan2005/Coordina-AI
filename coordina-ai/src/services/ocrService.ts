import Tesseract from 'tesseract.js';
import { pdfToJpegBlobs } from './pdfService';

export type OcrProgress = {
  status: string;
  progress: number; // 0–1
};

// ─── Supported types ──────────────────────────────────────────────────────────

/**
 * Supported image MIME types for OCR.
 */
export const OCR_SUPPORTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/bmp',
  'image/tiff',
];

/**
 * Returns true if the given File can be processed by Tesseract OCR directly
 * (i.e. it is a raster image).
 */
export function isOcrSupported(file: File): boolean {
  return OCR_SUPPORTED_TYPES.includes(file.type) || file.type === 'application/pdf';
}

/**
 * Returns true if the file is a PDF.
 */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

// ─── Core Tesseract helper ────────────────────────────────────────────────────

/**
 * Runs Tesseract.js OCR on a single image File or Blob.
 *
 * @param source     - The image source (File or Blob).
 * @param onProgress - Optional callback receiving progress updates (0–1).
 * @returns Promise resolving to the extracted text string.
 */
export async function extractTextFromImage(
  source: File | Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  const result = await Tesseract.recognize(source, 'eng', {
    logger: (m) => {
      if (onProgress && typeof m.progress === 'number') {
        onProgress({ status: m.status, progress: m.progress });
      }
    },
  });

  return result.data.text.trim();
}

// ─── PDF → OCR pipeline ───────────────────────────────────────────────────────

/**
 * Converts a PDF file page-by-page to JPEG images via PDF.js, then runs
 * Tesseract OCR on each page image.
 *
 * Progress is reported as a unified 0–1 value across all phases:
 *   [0, 0.4)  → PDF rendering  (all pages)
 *   [0.4, 1]  → Tesseract OCR  (all pages)
 *
 * @param file       - The PDF File to process.
 * @param onProgress - Optional callback receiving unified progress updates.
 * @returns Promise resolving to the concatenated extracted text for all pages.
 */
export async function extractTextFromPdf(
  file: File,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  // ── Phase 1: render all pages to JPEG blobs (0 → 0.4) ──────────────────────
  onProgress?.({ status: 'rendering_pdf_pages', progress: 0 });

  const pages = await pdfToJpegBlobs(file, 2, ({ pagesRendered, totalPages }) => {
    const fraction = pagesRendered / totalPages;
    onProgress?.({
      status: `rendering_page_${pagesRendered}_of_${totalPages}`,
      progress: fraction * 0.4,
    });
  });

  const totalPages = pages.length;
  const pageTexts: string[] = [];

  // ── Phase 2: OCR each page image (0.4 → 1) ─────────────────────────────────
  for (let i = 0; i < pages.length; i++) {
    const { blob, pageNumber } = pages[i];
    const pageBaseProgress = 0.4 + (i / totalPages) * 0.6;
    const pageShare = 0.6 / totalPages;

    const text = await extractTextFromImage(blob, (p) => {
      onProgress?.({
        status: `ocr_page_${pageNumber}_of_${totalPages}__${p.status}`,
        progress: pageBaseProgress + p.progress * pageShare,
      });
    });

    pageTexts.push(text);
  }

  return pageTexts.join('\n\n--- Page Break ---\n\n').trim();
}
