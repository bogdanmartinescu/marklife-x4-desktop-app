import { describe, expect, it } from 'vitest';
import { installPdfjsWorkerModule } from './pdf-worker-install.js';

describe('installPdfjsWorkerModule', () => {
  it('assigns WorkerMessageHandler so pdf.js uses a fake worker in this realm', () => {
    const handler = { setup: () => undefined };
    const previous = (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker;
    try {
      delete (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker;
      installPdfjsWorkerModule({ WorkerMessageHandler: handler });
      expect(
        (globalThis as { pdfjsWorker?: { WorkerMessageHandler?: unknown } }).pdfjsWorker
          ?.WorkerMessageHandler,
      ).toBe(handler);
    } finally {
      (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = previous;
    }
  });

  it('reads WorkerMessageHandler from a default export (Vite interop)', () => {
    const handler = { setup: () => undefined };
    const previous = (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker;
    try {
      installPdfjsWorkerModule({ default: { WorkerMessageHandler: handler } });
      expect(
        (globalThis as { pdfjsWorker?: { WorkerMessageHandler?: unknown } }).pdfjsWorker
          ?.WorkerMessageHandler,
      ).toBe(handler);
    } finally {
      (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = previous;
    }
  });

  it('throws when the worker module has no handler', () => {
    expect(() => installPdfjsWorkerModule({})).toThrow(/WorkerMessageHandler/);
  });
});
