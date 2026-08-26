import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ignoreClosedPipe, writeLine } from './pipe-errors.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEvent {
  ts: string;
  level: LogLevel;
  scope: string;
  msg: string;
  [key: string]: unknown;
}

export function createLogger(scope: string, filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true });

  const write = (level: LogLevel, msg: string, extra: Record<string, unknown> = {}): void => {
    const event: LogEvent = {
      ts: new Date().toISOString(),
      level,
      scope,
      msg,
      ...extra,
    };
    const line = `${JSON.stringify(event)}\n`;
    try {
      appendFileSync(filePath, line, 'utf8');
    } catch {
      // Logging must never break printing.
    }
    if (level === 'error' || level === 'warn') {
      ignoreClosedPipe(process.stderr);
      writeLine(process.stderr, line);
    } else {
      ignoreClosedPipe(process.stdout);
      writeLine(process.stdout, line);
    }
  };

  return {
    debug: (msg: string, extra?: Record<string, unknown>) => write('debug', msg, extra ?? {}),
    info: (msg: string, extra?: Record<string, unknown>) => write('info', msg, extra ?? {}),
    warn: (msg: string, extra?: Record<string, unknown>) => write('warn', msg, extra ?? {}),
    error: (msg: string, extra?: Record<string, unknown>) => write('error', msg, extra ?? {}),
  };
}

export type Logger = ReturnType<typeof createLogger>;
