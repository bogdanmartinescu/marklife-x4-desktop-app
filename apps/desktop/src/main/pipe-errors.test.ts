import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { ignoreClosedPipe, isClosedPipeError, writeLine } from './pipe-errors.js';

describe('isClosedPipeError', () => {
  it('recognizes EPIPE and destroyed streams', () => {
    expect(isClosedPipeError(Object.assign(new Error('write EPIPE'), { code: 'EPIPE' }))).toBe(
      true,
    );
    expect(
      isClosedPipeError(Object.assign(new Error('destroyed'), { code: 'ERR_STREAM_DESTROYED' })),
    ).toBe(true);
    expect(isClosedPipeError(new Error('printbridge timed out'))).toBe(false);
  });
});

describe('ignoreClosedPipe', () => {
  it('swallows EPIPE so Node does not treat it as uncaught', () => {
    const stream = new EventEmitter();
    ignoreClosedPipe(stream);
    expect(() =>
      stream.emit('error', Object.assign(new Error('write EPIPE'), { code: 'EPIPE' })),
    ).not.toThrow();
  });
});

describe('writeLine', () => {
  it('does not throw when the write callback reports EPIPE', () => {
    const stream = {
      writable: true,
      write: (_chunk: string, callback?: (error?: Error | null) => void) => {
        callback?.(Object.assign(new Error('write EPIPE'), { code: 'EPIPE' }));
        return true;
      },
    };
    expect(() => writeLine(stream, 'hello\n')).not.toThrow();
  });

  it('skips writes when the stream is already closed', () => {
    let wrote = false;
    const stream = {
      writable: false,
      write: () => {
        wrote = true;
        return false;
      },
    };
    writeLine(stream, 'hello\n');
    expect(wrote).toBe(false);
  });
});
