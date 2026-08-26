import { readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { decode as decodeJpeg } from 'jpeg-js';
import { PNG } from 'pngjs';
import { requireProfile } from '@thermalbridge/printer-profiles';
import { buildPrintJob, type MediaSettings, type RgbaImage } from '@thermalbridge/thermal-core';

interface CliArgs {
  input: string;
  output: string;
  size: string;
  profile: string;
  media: 'continuous' | 'gap' | 'black-mark';
  dither: 'threshold' | 'floyd-steinberg';
  copies: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Partial<CliArgs> = {
    profile: 'marklife-x4',
    media: 'gap',
    dither: 'threshold',
    copies: 1,
  };

  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--input' && value) {
      args.input = value;
      i += 1;
    } else if (key === '--output' && value) {
      args.output = value;
      i += 1;
    } else if (key === '--size' && value) {
      args.size = value;
      i += 1;
    } else if (key === '--profile' && value) {
      args.profile = value;
      i += 1;
    } else if (key === '--media' && value) {
      if (value !== 'continuous' && value !== 'gap' && value !== 'black-mark') {
        throw new Error(`Unsupported media mode: ${value}`);
      }
      args.media = value;
      i += 1;
    } else if (key === '--dither' && value) {
      if (value !== 'threshold' && value !== 'floyd-steinberg') {
        throw new Error(`Unsupported dither: ${value}`);
      }
      args.dither = value;
      i += 1;
    } else if (key === '--copies' && value) {
      args.copies = Number.parseInt(value, 10);
      i += 1;
    }
  }

  if (!args.input || !args.output || !args.size) {
    throw new Error(
      'Usage: pnpm label:build --input ./file.png --size 100x150 --profile marklife-x4 --output ./job.prn',
    );
  }

  return args as CliArgs;
}

function parseSize(size: string): { widthMm: number; heightMm: number } {
  const match = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/i.exec(size);
  if (!match) {
    throw new Error(`Invalid size "${size}". Expected WIDTHxHEIGHT in millimetres, e.g. 100x150`);
  }
  return {
    widthMm: Number(match[1]),
    heightMm: Number(match[2]),
  };
}

function decodeImage(filePath: string): RgbaImage {
  const buffer = readFileSync(filePath);
  const ext = extname(filePath).toLowerCase();

  if (ext === '.png') {
    const png = PNG.sync.read(buffer);
    return {
      width: png.width,
      height: png.height,
      data: new Uint8ClampedArray(png.data),
    };
  }

  if (ext === '.jpg' || ext === '.jpeg') {
    const jpeg = decodeJpeg(buffer, { useTArray: true });
    return {
      width: jpeg.width,
      height: jpeg.height,
      data: new Uint8ClampedArray(jpeg.data),
    };
  }

  throw new Error(`Unsupported input type: ${ext}. Use PNG or JPEG.`);
}

function mediaSettings(mode: CliArgs['media']): MediaSettings {
  switch (mode) {
    case 'continuous':
      return { mode: 'continuous' };
    case 'gap':
      return { mode: 'gap', gapHeightMm: 2, gapOffsetMm: 0 };
    case 'black-mark':
      return { mode: 'black-mark', markHeightMm: 3, markOffsetMm: 0 };
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const profile = requireProfile(args.profile);
  const { widthMm, heightMm } = parseSize(args.size);
  const image = decodeImage(resolve(args.input));

  const job = buildPrintJob({
    image,
    widthMm,
    heightMm,
    dpi: profile.dpi,
    density: profile.density.default,
    speed: profile.speed.default,
    media: mediaSettings(args.media),
    dither: args.dither,
    copies: args.copies,
  });

  writeFileSync(resolve(args.output), job);
  process.stdout.write(`Wrote ${job.length} bytes to ${args.output}\n`);
}

main();
