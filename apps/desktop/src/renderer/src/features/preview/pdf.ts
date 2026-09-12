import './pdfjs-polyfills.js';
import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
import { copyToUint8Array } from '../import/source-bytes.js';
import { installPdfjsWorkerModule } from './pdf-worker-install.js';
import { installPromiseTry } from './pdfjs-polyfills.js';
import { installUint8ArrayHex } from './uint8array-hex.js';

installPromiseTry();
installUint8ArrayHex();

let workerReady: Promise<void> | undefined;

async function ensurePdfjsWorker(): Promise<void> {
  if (!workerReady) {
    // @ts-expect-error pdfjs-dist worker has no declaration file
    workerReady = import('pdfjs-dist/build/pdf.worker.mjs').then((module) => {
      installPdfjsWorkerModule(module);
    });
  }
  await workerReady;
}

const cache = new WeakMap<Uint8Array, Promise<PDFDocumentProxy>>();

export async function loadPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  installPromiseTry();
  installUint8ArrayHex();
  await ensurePdfjsWorker();
  const existing = cache.get(bytes);
  if (existing) {
    return existing;
  }
  const loading = getDocument({
    data: copyToUint8Array(bytes),
    useWasm: false,
    useWorkerFetch: false,
    isOffscreenCanvasSupported: false,
    isImageDecoderSupported: false,
  }).promise;
  cache.set(bytes, loading);
  loading.catch(() => {
    cache.delete(bytes);
  });
  return loading;
}

function createPageCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export async function renderPdfPage(
  bytes: Uint8Array,
  pageNumber: number,
  dpi: number,
): Promise<HTMLCanvasElement> {
  const pdf = await loadPdf(bytes);
  const page = await pdf.getPage(pageNumber);
  const scale = dpi / 72;
  const viewport = page.getViewport({ scale });
  const canvas = createPageCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is unavailable');
  }
  await page.render({
    canvas,
    canvasContext: context,
    viewport,
  }).promise;
  return canvas;
}

export async function pdfPageCount(bytes: Uint8Array): Promise<number> {
  const pdf = await loadPdf(bytes);
  return pdf.numPages;
}
