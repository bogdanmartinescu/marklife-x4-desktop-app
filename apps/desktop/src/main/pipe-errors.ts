import type { EventEmitter } from 'node:events';

const CLOSED_PIPE_CODES = new Set(['EPIPE', 'ERR_STREAM_DESTROYED']);
const CLOSED_PIPE_MARK = Symbol.for('thermalbridge.ignoreClosedPipe');

export function isClosedPipeError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const code = (error as NodeJS.ErrnoException).code;
  return code !== undefined && CLOSED_PIPE_CODES.has(code);
}

export function ignoreClosedPipe(stream: EventEmitter): void {
  const tagged = stream as EventEmitter & { [CLOSED_PIPE_MARK]?: true };
  if (tagged[CLOSED_PIPE_MARK]) {
    return;
  }
  tagged[CLOSED_PIPE_MARK] = true;
  stream.on('error', (error: Error) => {
    if (!isClosedPipeError(error)) {
      throw error;
    }
  });
}

interface WritableLineStream {
  writable?: boolean;
  write: (chunk: string, callback?: (error?: Error | null) => void) => boolean;
}

export function writeLine(stream: WritableLineStream, line: string): void {
  if (stream.writable === false) {
    return;
  }
  try {
    stream.write(line, (error) => {
      if (error && !isClosedPipeError(error)) {
        return;
      }
    });
  } catch (error: unknown) {
    if (!isClosedPipeError(error)) {
      return;
    }
  }
}
