/**
 * Real OCR Engine — extracts text from PDF and image files in the browser.
 *
 * Uses Tesseract.js for OCR and PDF.js for rasterizing PDF pages.
 * This actually reads the pixels from your uploaded documents.
 */

import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface OcrProgress {
  phase: string;
  progress: number;
}

export type ProgressCallback = (progress: OcrProgress) => void;

/**
 * Extract text from a File (PDF, PNG, or JPG).
 * Returns the raw text recognized from the document.
 */
export async function extractTextFromFile(
  file: File,
  onProgress?: ProgressCallback
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isPdf = file.type === 'application/pdf' || ext === 'pdf';
  const isImage = file.type.startsWith('image/') || ['png', 'jpg', 'jpeg'].includes(ext);

  if (!isPdf && !isImage) {
    throw new Error(`Unsupported file type: ${file.type || ext}`);
  }

  if (isImage) {
    return ocrImageFile(file, onProgress);
  }

  return ocrPdfFile(file, onProgress);
}

async function ocrImageFile(file: File, onProgress?: ProgressCallback): Promise<string> {
  const imageUrl = URL.createObjectURL(file);
  try {
    return await ocrImage(imageUrl, onProgress);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function ocrPdfFile(file: File, onProgress?: ProgressCallback): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const allText: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    onProgress?.({ phase: `Rendering page ${i} of ${numPages}`, progress: (i - 1) / numPages * 0.3 });

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

    onProgress?.({ phase: `OCR page ${i} of ${numPages}`, progress: (i - 1) / numPages * 0.3 + 0.05 });

    const pageText = await ocrCanvas(canvas, (p) => {
      onProgress?.({
        phase: `OCR page ${i} of ${numPages}`,
        progress: (i - 1) / numPages * 0.3 + p.progress * 0.3 / numPages,
      });
    });

    allText.push(pageText);
  }

  return allText.join('\n\n');
}

async function ocrImage(imageUrl: string, onProgress?: ProgressCallback): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        const maxDim = 2000;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          const scale = maxDim / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);

        const text = await ocrCanvas(canvas, onProgress);
        resolve(text);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

async function ocrCanvas(canvas: HTMLCanvasElement, onProgress?: ProgressCallback): Promise<string> {
  const result = await Tesseract.recognize(canvas, 'eng', {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress({ phase: 'Recognizing text', progress: m.progress });
      }
    },
  });
  return result.data.text;
}

/**
 * Render a PDF file's first page to a canvas for preview.
 * Returns a data URL.
 */
export async function renderPdfPreview(file: File, scale = 1.5): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
  return canvas.toDataURL('image/png');
}
