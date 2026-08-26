import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import { ThermalBridgeError } from '@thermalbridge/shared';
import type { Logger } from '../logger.js';

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class BridgeManager {
  private process: ChildProcessWithoutNullStreams | null = null;
  private buffer = '';
  private requestSeq = 0;
  private readonly pending = new Map<string, Pending>();
  private restarts = 0;
  private stopping = false;

  constructor(
    private readonly binaryPath: string,
    private readonly jobDir: string,
    private readonly logger: Logger,
  ) {}

  start(): void {
    if (this.process) {
      return;
    }
    this.stopping = false;
    this.spawnProcess();
  }

  stop(): void {
    this.stopping = true;
    this.process?.kill();
    this.process = null;
    this.rejectAllPending('printbridge stopped');
  }

  async request<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.process?.stdin.writable) {
      this.spawnProcess();
    }
    const child = this.process;
    if (!child?.stdin.writable) {
      throw new ThermalBridgeError(
        'PRINTBRIDGE_START_FAILED',
        'printbridge is not running. Build native/printbridge and restart the app.',
      );
    }

    this.requestSeq += 1;
    const id = `req_${this.requestSeq}`;
    const line = `${JSON.stringify({ id, method, params })}\n`;

    return await new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new ThermalBridgeError('PRINTBRIDGE_PROTOCOL_ERROR', `printbridge timed out for ${method}`),
        );
      }, 45_000);
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });
      child.stdin.write(line, (error) => {
        if (error) {
          clearTimeout(timer);
          this.pending.delete(id);
          reject(
            new ThermalBridgeError(
              'PRINTBRIDGE_PROTOCOL_ERROR',
              `Failed to write to printbridge: ${error.message}`,
            ),
          );
        }
      });
    });
  }

  private spawnProcess(): void {
    this.logger.info('starting printbridge', { path: this.binaryPath });
    if (!existsSync(this.binaryPath)) {
      this.logger.error('printbridge binary is missing', { path: this.binaryPath });
      this.process = null;
      return;
    }

    try {
      this.process = spawn(this.binaryPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          THERMALBRIDGE_JOB_DIR: this.jobDir,
          THERMALBRIDGE_DEV: process.env['THERMALBRIDGE_DEV'] ?? '1',
        },
      });
    } catch (error) {
      this.logger.error('printbridge spawn failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.process = null;
      return;
    }

    this.process.stdout.setEncoding('utf8');
    this.process.stderr.setEncoding('utf8');
    this.process.stdin.on('error', (error: Error) => {
      this.logger.warn('printbridge stdin error', { error: error.message });
      this.process = null;
      this.rejectAllPending(`Failed to write to printbridge: ${error.message}`);
    });
    this.process.stdout.on('error', (error: Error) => {
      this.logger.warn('printbridge stdout error', { error: error.message });
    });
    this.process.stderr.on('error', (error: Error) => {
      this.logger.warn('printbridge stderr error', { error: error.message });
    });
    this.process.stdout.on('data', (chunk: string) => this.onStdout(chunk));
    this.process.stderr.on('data', (chunk: string) => {
      this.logger.warn('printbridge stderr', { chunk: chunk.trim() });
    });
    this.process.on('error', (error) => {
      this.logger.error('printbridge spawn failed', {
        error: error.message,
        path: this.binaryPath,
      });
      this.process = null;
      this.stopping = true;
    });
    this.process.on('exit', (code, signal) => {
      this.logger.warn('printbridge exited', { code, signal });
      this.process = null;
      this.rejectAllPending('printbridge exited');
      if (!this.stopping && this.restarts < 5) {
        this.restarts += 1;
        setTimeout(() => this.spawnProcess(), 1000);
      }
    });
  }

  private rejectAllPending(message: string): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new ThermalBridgeError('PRINTBRIDGE_PROTOCOL_ERROR', message));
      this.pending.delete(id);
    }
  }

  private onStdout(chunk: string): void {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      this.handleLine(line);
    }
  }

  private handleLine(line: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      this.logger.error('invalid printbridge NDJSON', {});
      return;
    }
    if (typeof parsed !== 'object' || parsed === null) {
      return;
    }
    const record = parsed as Record<string, unknown>;
    const id = typeof record['id'] === 'string' ? record['id'] : null;
    if (!id) {
      return;
    }
    const pending = this.pending.get(id);
    if (!pending) {
      return;
    }
    clearTimeout(pending.timer);
    this.pending.delete(id);

    if (record['ok'] === true) {
      pending.resolve(record['result']);
      return;
    }

    const errorValue = record['error'];
    const errorRecord =
      typeof errorValue === 'object' && errorValue !== null
        ? (errorValue as Record<string, unknown>)
        : {};
    const code = typeof errorRecord['code'] === 'string' ? errorRecord['code'] : 'UNKNOWN';
    const message =
      typeof errorRecord['message'] === 'string' ? errorRecord['message'] : 'printbridge error';
    pending.reject(new ThermalBridgeError(isKnown(code) ? code : 'UNKNOWN', message));
  }
}

function isKnown(
  code: string,
): code is import('@thermalbridge/shared').ErrorCode {
  return [
    'NO_PRINTER_SELECTED',
    'PRINTER_NOT_FOUND',
    'PRINTER_OFFLINE',
    'RAW_PRINT_UNSUPPORTED',
    'PRINTBRIDGE_START_FAILED',
    'PRINTBRIDGE_PROTOCOL_ERROR',
    'INVALID_LABEL_SIZE',
    'INVALID_BITMAP',
    'PDF_RENDER_FAILED',
    'FILE_UNSUPPORTED',
    'TCP_CONNECTION_FAILED',
    'PRINT_WRITE_FAILED',
    'USB_DRIVER_CONFLICT',
    'BLUETOOTH_SCAN_FAILED',
    'PARSE_ERROR',
    'METHOD_NOT_FOUND',
    'UNKNOWN',
  ].includes(code);
}
