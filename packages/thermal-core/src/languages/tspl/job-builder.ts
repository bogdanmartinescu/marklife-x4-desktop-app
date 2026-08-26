import { DEFAULT_BITMAP_ENCODING, type BitmapEncoding, type MonoBitmap } from '../../bitmap/types.js';
import {
  blineCommand,
  clearCommand,
  continuousCommand,
  densityCommand,
  directionCommand,
  encodeMedia,
  gapCommand,
  offsetCommand,
  printCommand,
  referenceCommand,
  sizeCommand,
  speedCommand,
} from './commands.js';
import { BinaryWriter } from './encoder.js';
import { type MediaSettings, TsplJobOptionsSchema, type TsplJobOptions } from './types.js';

export interface BitmapCommandOptions {
  x: number;
  y: number;
  bitmap: MonoBitmap;
  encoding?: BitmapEncoding;
}

export class TsplJobBuilder {
  private readonly writer = new BinaryWriter();
  private readonly encoding: BitmapEncoding;

  constructor(options: TsplJobOptions = {}) {
    const parsed = TsplJobOptionsSchema.parse(options);
    this.encoding = parsed.encoding ?? DEFAULT_BITMAP_ENCODING;
  }

  sizeMm(widthMm: number, heightMm: number): this {
    this.writer.text(sizeCommand(widthMm, heightMm));
    return this;
  }

  gapMm(heightMm: number, offsetMm: number): this {
    this.writer.text(gapCommand(heightMm, offsetMm));
    return this;
  }

  blineMm(heightMm: number, offsetMm: number): this {
    this.writer.text(blineCommand(heightMm, offsetMm));
    return this;
  }

  continuous(): this {
    this.writer.text(continuousCommand());
    return this;
  }

  media(settings: MediaSettings): this {
    this.writer.text(encodeMedia(settings));
    return this;
  }

  reference(x: number, y: number): this {
    this.writer.text(referenceCommand(x, y));
    return this;
  }

  offsetMm(offsetMm: number): this {
    this.writer.text(offsetCommand(offsetMm));
    return this;
  }

  density(value: number): this {
    this.writer.text(densityCommand(value));
    return this;
  }

  speed(value: number): this {
    this.writer.text(speedCommand(value));
    return this;
  }

  direction(feed: 0 | 1 = 0, mirror: 0 | 1 = 0): this {
    this.writer.text(directionCommand(feed, mirror));
    return this;
  }

  clear(): this {
    this.writer.text(clearCommand());
    return this;
  }

  bitmap(options: BitmapCommandOptions): this {
    const encoding = options.encoding ?? this.encoding;
    const { x, y, bitmap } = options;
    this.writer.text(
      `BITMAP ${x},${y},${bitmap.bytesPerRow},${bitmap.height},${encoding.tsplMode},`,
    );
    this.writer.bytes(bitmap.data);
    this.writer.text('\r\n');
    return this;
  }

  print(sets = 1, copies = 1): this {
    this.writer.text(printCommand(sets, copies));
    return this;
  }

  encode(): Uint8Array {
    return this.writer.concat();
  }
}
