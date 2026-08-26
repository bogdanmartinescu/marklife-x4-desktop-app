import type { MediaSettings } from './types.js';

function assertFinite(name: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid ${name}: ${String(value)}`);
  }
  return value;
}

function assertInt(name: string, value: number): number {
  if (!Number.isInteger(value)) {
    throw new Error(`Invalid integer ${name}: ${String(value)}`);
  }
  return value;
}

export function sizeCommand(widthMm: number, heightMm: number): string {
  return `SIZE ${assertFinite('widthMm', widthMm)} mm,${assertFinite('heightMm', heightMm)} mm\r\n`;
}

export function gapCommand(heightMm: number, offsetMm: number): string {
  return `GAP ${assertFinite('gapHeightMm', heightMm)} mm,${assertFinite('gapOffsetMm', offsetMm)} mm\r\n`;
}

export function continuousCommand(): string {
  return 'GAP 0,0\r\n';
}

export function blineCommand(heightMm: number, offsetMm: number): string {
  return `BLINE ${assertFinite('markHeightMm', heightMm)} mm,${assertFinite('markOffsetMm', offsetMm)} mm\r\n`;
}

export function encodeMedia(settings: MediaSettings): string {
  switch (settings.mode) {
    case 'continuous':
      return continuousCommand();
    case 'gap':
      return gapCommand(settings.gapHeightMm, settings.gapOffsetMm);
    case 'black-mark':
      return blineCommand(settings.markHeightMm, settings.markOffsetMm);
  }
}

export function referenceCommand(x: number, y: number): string {
  return `REFERENCE ${assertInt('referenceX', x)},${assertInt('referenceY', y)}\r\n`;
}

export function offsetCommand(offsetMm: number): string {
  return `OFFSET ${assertFinite('offsetMm', offsetMm)} mm\r\n`;
}

export function densityCommand(density: number): string {
  return `DENSITY ${assertInt('density', density)}\r\n`;
}

export function speedCommand(speed: number): string {
  return `SPEED ${assertFinite('speed', speed)}\r\n`;
}

export function directionCommand(feed: 0 | 1, mirror: 0 | 1): string {
  return `DIRECTION ${feed},${mirror}\r\n`;
}

export function clearCommand(): string {
  return 'CLS\r\n';
}

export function printCommand(sets: number, copies: number): string {
  return `PRINT ${assertInt('sets', sets)},${assertInt('copies', copies)}\r\n`;
}
