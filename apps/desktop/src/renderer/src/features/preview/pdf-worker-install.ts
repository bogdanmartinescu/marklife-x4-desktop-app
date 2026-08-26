export interface PdfjsWorkerModule {
  WorkerMessageHandler?: unknown;
  default?: { WorkerMessageHandler?: unknown };
}

export function installPdfjsWorkerModule(module: PdfjsWorkerModule): void {
  const handler = module.WorkerMessageHandler ?? module.default?.WorkerMessageHandler;
  if (handler === undefined) {
    throw new Error('pdf.js worker module did not export WorkerMessageHandler');
  }
  (globalThis as typeof globalThis & {
    pdfjsWorker?: { WorkerMessageHandler: unknown };
  }).pdfjsWorker = { WorkerMessageHandler: handler };
}
