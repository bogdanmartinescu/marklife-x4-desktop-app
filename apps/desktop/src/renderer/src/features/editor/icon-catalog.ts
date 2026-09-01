import type { MessageKey } from '@/i18n/messages.js';

export interface PrintIcon {
  id: string;
  labelKey: MessageKey;
  viewBox: number;
  fill: string[];
  stroke: string[];
  strokeWidth: number;
}

export const PRINT_ICONS: readonly PrintIcon[] = [
  {
    id: 'warning',
    labelKey: 'editorIconWarning',
    viewBox: 64,
    fill: ['M30 26h4v16h-4z', 'M30 46h4v4h-4z'],
    stroke: ['M32 10 L56 54 H8 Z'],
    strokeWidth: 4,
  },
  {
    id: 'info',
    labelKey: 'editorIconInfo',
    viewBox: 64,
    fill: ['M30 18h4v4h-4z', 'M30 28h4v18h-4z'],
    stroke: ['M32 8a24 24 0 1 1 0 48a24 24 0 1 1 0-48'],
    strokeWidth: 4,
  },
  {
    id: 'prohibited',
    labelKey: 'editorIconProhibited',
    viewBox: 64,
    fill: [],
    stroke: ['M32 8a24 24 0 1 1 0 48a24 24 0 1 1 0-48', 'M16 16 L48 48'],
    strokeWidth: 5,
  },
  {
    id: 'check',
    labelKey: 'editorIconCheck',
    viewBox: 64,
    fill: ['M10 32 l12 14 32-30-6-6-26 24-8-8z'],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'cross',
    labelKey: 'editorIconCross',
    viewBox: 64,
    fill: ['M16 12 L32 28 48 12 52 16 36 32 52 48 48 52 32 36 16 52 12 48 28 32 12 16z'],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'recycle',
    labelKey: 'editorIconRecycle',
    viewBox: 64,
    fill: [],
    stroke: [
      'M20 22 A16 16 0 0 1 48 20',
      'M48 20 L42 13 M48 20 L41 26',
      'M50 36 A16 16 0 0 1 26 50',
      'M26 50 L33 53 M26 50 L23 43',
      'M18 44 A16 16 0 0 1 20 22',
      'M20 22 L13 26 M20 22 L26 28',
    ],
    strokeWidth: 4,
  },
  {
    id: 'arrowUp',
    labelKey: 'editorIconArrowUp',
    viewBox: 64,
    fill: ['M32 8 L54 32 H40 V56 H24 V32 H10z'],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'arrowRight',
    labelKey: 'editorIconArrowRight',
    viewBox: 64,
    fill: ['M56 32 L32 54 V40 H8 V24 H32 V10z'],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'arrowDown',
    labelKey: 'editorIconArrowDown',
    viewBox: 64,
    fill: ['M32 56 L10 32 H24 V8 H40 V32 H54z'],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'arrowLeft',
    labelKey: 'editorIconArrowLeft',
    viewBox: 64,
    fill: ['M8 32 L32 10 V24 H56 V40 H32 V54z'],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'star',
    labelKey: 'editorIconStar',
    viewBox: 64,
    fill: ['M32 6 L39 24 H58 L43 36 L49 56 L32 44 L15 56 L21 36 L6 24 H25z'],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'heart',
    labelKey: 'editorIconHeart',
    viewBox: 64,
    fill: [
      'M32 54C32 54 8 36 8 22C8 12 18 8 26 14L32 20L38 14C46 8 56 12 56 22C56 36 32 54 32 54z',
    ],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'plus',
    labelKey: 'editorIconPlus',
    viewBox: 64,
    fill: ['M28 12h8v16h16v8H36v16h-8V36H12v-8h16z'],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'minus',
    labelKey: 'editorIconMinus',
    viewBox: 64,
    fill: ['M12 28h40v8H12z'],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'battery',
    labelKey: 'editorIconBattery',
    viewBox: 64,
    fill: ['M50 24h6v16h-6z', 'M16 24h12v16H16z'],
    stroke: ['M10 18h40v28H10z'],
    strokeWidth: 4,
  },
  {
    id: 'flame',
    labelKey: 'editorIconFlame',
    viewBox: 64,
    fill: [
      'M32 6C44 22 54 30 54 42A22 22 0 0 1 10 42C10 30 20 22 32 6zM32 32C27 38 27 46 32 52C37 46 37 38 32 32z',
    ],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'snowflake',
    labelKey: 'editorIconSnowflake',
    viewBox: 64,
    fill: [],
    stroke: [
      'M32 6 V58',
      'M10 19 L54 45',
      'M10 45 L54 19',
      'M32 6 L26 14 M32 6 L38 14',
      'M32 58 L26 50 M32 58 L38 50',
      'M10 19 L18 17 M10 19 L13 27',
      'M54 45 L46 47 M54 45 L51 37',
      'M10 45 L18 47 M10 45 L13 37',
      'M54 19 L46 17 M54 19 L51 27',
    ],
    strokeWidth: 3.5,
  },
  {
    id: 'droplet',
    labelKey: 'editorIconDroplet',
    viewBox: 64,
    fill: ['M32 8 C32 8 52 32 52 42 A20 20 0 0 1 12 42 C12 32 32 8 32 8z'],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'lightning',
    labelKey: 'editorIconLightning',
    viewBox: 64,
    fill: ['M36 8 L16 36 H30 L24 56 L50 28 H34z'],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'phone',
    labelKey: 'editorIconPhone',
    viewBox: 64,
    fill: [
      'M14 8c8-2 16 0 18 8l4 12-10 4c3 8 11 16 20 18l4-10 14 5v12c-6 6-36 2-42-18C10 18 10 9 14 8z',
    ],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'mail',
    labelKey: 'editorIconMail',
    viewBox: 64,
    fill: [],
    stroke: ['M8 18h48v28H8z', 'M8 18 L32 36 L56 18'],
    strokeWidth: 4,
  },
  {
    id: 'location',
    labelKey: 'editorIconLocation',
    viewBox: 64,
    fill: [
      'M32 4C44 4 54 14 54 26C54 42 32 60 32 60C32 60 10 42 10 26C10 14 20 4 32 4zM32 18A8 8 0 1 0 32 34A8 8 0 1 0 32 18z',
    ],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'clock',
    labelKey: 'editorIconClock',
    viewBox: 64,
    fill: ['M30 18h4v16l10 8-2 4-12-10z'],
    stroke: ['M32 8a24 24 0 1 1 0 48a24 24 0 1 1 0-48'],
    strokeWidth: 4,
  },
  {
    id: 'fragile',
    labelKey: 'editorIconFragile',
    viewBox: 64,
    fill: ['M18 6h28l-8 24c0 6-3 10-6 12v10h12v4H20v-4h12V42c-3-2-6-6-6-12z'],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'umbrella',
    labelKey: 'editorIconUmbrella',
    viewBox: 64,
    fill: ['M6 34A26 26 0 0 1 58 34H6z'],
    stroke: ['M32 34 V50 a7 7 0 0 1-14 0'],
    strokeWidth: 4,
  },
  {
    id: 'thisWayUp',
    labelKey: 'editorIconThisWayUp',
    viewBox: 64,
    fill: ['M32 6 L48 24 H36 V30 H28 V24 H16z M32 28 L48 46 H36 V58 H28 V46 H16z'],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'ce',
    labelKey: 'editorIconCe',
    viewBox: 64,
    fill: [],
    stroke: ['M34 14 A16 16 0 1 0 34 50', 'M60 14 A16 16 0 1 0 60 50', 'M46 32 H60'],
    strokeWidth: 5,
  },
  {
    id: 'package',
    labelKey: 'editorIconPackage',
    viewBox: 64,
    fill: ['M8 22 L32 10 L56 22 L32 34z', 'M8 22 V44 L32 56 V34z', 'M56 22 V44 L32 56 V34z'],
    stroke: ['M32 10 V34', 'M8 22 L32 34 L56 22'],
    strokeWidth: 4,
  },
  {
    id: 'doNotStack',
    labelKey: 'editorIconDoNotStack',
    viewBox: 64,
    fill: ['M18 34h28v16H18z', 'M22 14h20v16H22z'],
    stroke: ['M12 10 L52 54'],
    strokeWidth: 5,
  },
  {
    id: 'sun',
    labelKey: 'editorIconSun',
    viewBox: 64,
    fill: ['M32 22a10 10 0 1 1 0 20a10 10 0 1 1 0-20z'],
    stroke: [
      'M32 8 V16 M32 48 V56 M8 32 H16 M48 32 H56',
      'M14 14 L20 20 M44 44 L50 50 M50 14 L44 20 M14 50 L20 44',
    ],
    strokeWidth: 4,
  },
  {
    id: 'food',
    labelKey: 'editorIconFood',
    viewBox: 64,
    fill: [
      'M15 8h4v20h-4z',
      'M22 8h4v20h-4z',
      'M29 8h4v20h-4z',
      'M21 26h8v30h-4V32h-4z',
      'M42 8l12 3-7 37h-7L38 14z',
      'M40 48h10v8H40z',
    ],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'medical',
    labelKey: 'editorIconMedical',
    viewBox: 64,
    fill: ['M28 22h8v8h8v8h-8v8h-8v-8h-8v-8h8z'],
    stroke: ['M12 16h40v40H12z'],
    strokeWidth: 4,
  },
  {
    id: 'leaf',
    labelKey: 'editorIconLeaf',
    viewBox: 64,
    fill: ['M12 50C12 22 28 8 54 12C48 38 30 54 12 50z'],
    stroke: ['M12 50 L40 22'],
    strokeWidth: 4,
  },
  {
    id: 'truck',
    labelKey: 'editorIconTruck',
    viewBox: 64,
    fill: [
      'M6 18h32v24H6z',
      'M38 26h14l6 8v8H38z',
      'M16 44a6 6 0 1 1 0 12a6 6 0 1 1 0-12z',
      'M48 44a6 6 0 1 1 0 12a6 6 0 1 1 0-12z',
    ],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'lock',
    labelKey: 'editorIconLock',
    viewBox: 64,
    fill: ['M16 28h32v26H16z'],
    stroke: ['M22 28 V20 a10 10 0 0 1 20 0 v8'],
    strokeWidth: 4,
  },
  {
    id: 'person',
    labelKey: 'editorIconPerson',
    viewBox: 64,
    fill: ['M32 8a8 8 0 1 1 0 16a8 8 0 1 1 0-16z', 'M14 56V46a18 18 0 0 1 36 0v10z'],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'house',
    labelKey: 'editorIconHouse',
    viewBox: 64,
    fill: ['M8 30 L32 10 L56 30 V56 H38 V40 H26 V56 H8z'],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'tag',
    labelKey: 'editorIconTag',
    viewBox: 64,
    fill: ['M10 24 L26 8 H56 V38 L40 54 H10z M22 18a4 4 0 1 0 0 8a4 4 0 1 0 0-8z'],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'cart',
    labelKey: 'editorIconCart',
    viewBox: 64,
    fill: [
      'M26 47a5 5 0 1 1 0 10a5 5 0 1 1 0-10z',
      'M48 47a5 5 0 1 1 0 10a5 5 0 1 1 0-10z',
    ],
    stroke: ['M10 16 H20 L26 40 H52 L58 22 H28'],
    strokeWidth: 4,
  },
  {
    id: 'scissors',
    labelKey: 'editorIconScissors',
    viewBox: 64,
    fill: [],
    stroke: [
      'M14 8a8 8 0 1 1 0 16a8 8 0 1 1 0-16',
      'M14 40a8 8 0 1 1 0 16a8 8 0 1 1 0-16',
      'M20 18 L50 48',
      'M20 46 L50 16',
    ],
    strokeWidth: 4,
  },
  {
    id: 'wifi',
    labelKey: 'editorIconWifi',
    viewBox: 64,
    fill: ['M32 44a5 5 0 1 1 0 10a5 5 0 1 1 0-10z'],
    stroke: [
      'M12 26 A28 28 0 0 1 52 26',
      'M16 32 A20 20 0 0 1 48 32',
      'M20 38 A16 16 0 0 1 44 38',
    ],
    strokeWidth: 4,
  },
  {
    id: 'thermometer',
    labelKey: 'editorIconThermometer',
    viewBox: 64,
    fill: ['M29 6h6v32a11 11 0 1 1-6 0z'],
    stroke: ['M32 14 V40'],
    strokeWidth: 3,
  },
  {
    id: 'speaker',
    labelKey: 'editorIconSpeaker',
    viewBox: 64,
    fill: ['M8 24h12l16-12v40L20 40H8z'],
    stroke: ['M44 22 A12 12 0 0 1 44 42', 'M50 16 A20 20 0 0 1 50 48'],
    strokeWidth: 4,
  },
  {
    id: 'globe',
    labelKey: 'editorIconGlobe',
    viewBox: 64,
    fill: [],
    stroke: [
      'M32 8a24 24 0 1 1 0 48a24 24 0 1 1 0-48',
      'M32 8 C18 22 18 42 32 56 C46 42 46 22 32 8',
      'M10 32 H54',
    ],
    strokeWidth: 4,
  },
  {
    id: 'scale',
    labelKey: 'editorIconScale',
    viewBox: 64,
    fill: ['M14 18h36v8H14z', 'M28 26h8v20H28z', 'M10 46h44v10H10z'],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'barcodeMark',
    labelKey: 'editorIconBarcodeMark',
    viewBox: 64,
    fill: [
      'M8 12h5v40H8z',
      'M16 12h3v40h-3z',
      'M22 12h7v40h-7z',
      'M32 12h3v40h-3z',
      'M38 12h5v40h-5z',
      'M46 12h3v40h-3z',
      'M52 12h4v40h-4z',
    ],
    stroke: [],
    strokeWidth: 4,
  },
  {
    id: 'shield',
    labelKey: 'editorIconShield',
    viewBox: 64,
    fill: ['M32 6 L54 14 V32 C54 46 32 58 32 58 C32 58 10 46 10 32 V14z'],
    stroke: [],
    strokeWidth: 4,
  },
];

const BY_ID = new Map(PRINT_ICONS.map((icon) => [icon.id, icon]));

export function getPrintIcon(id: string): PrintIcon | undefined {
  return BY_ID.get(id);
}

export function iconSvgMarkup(icon: PrintIcon): string {
  const fills = icon.fill
    .map((d) => `<path d="${d}" fill="black" fill-rule="evenodd"/>`)
    .join('');
  const strokes = icon.stroke
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="black" stroke-width="${String(icon.strokeWidth)}" stroke-linejoin="round" stroke-linecap="round"/>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(icon.viewBox)} ${String(icon.viewBox)}">${fills}${strokes}</svg>`;
}

export function drawPrintIcon(
  ctx: CanvasRenderingContext2D,
  icon: PrintIcon,
  width: number,
  height: number,
): void {
  const scale = Math.min(width, height) / icon.viewBox;
  const x = (width - icon.viewBox * scale) / 2;
  const y = (height - icon.viewBox * scale) / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = icon.strokeWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const d of icon.fill) {
    ctx.fill(new Path2D(d), 'evenodd');
  }
  for (const d of icon.stroke) {
    ctx.stroke(new Path2D(d));
  }
  ctx.restore();
}
