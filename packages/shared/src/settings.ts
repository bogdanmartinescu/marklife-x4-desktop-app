import { z } from 'zod';

export const LOCALES = ['en', 'ro'] as const;
export type Locale = (typeof LOCALES)[number];

export const PrinterBindingSchema = z.object({
  printerId: z.string().min(1),
  profileId: z.string().min(1),
  backend: z.enum([
    'windows-spooler',
    'cups',
    'tcp',
    'usb',
    'bluetooth-spp',
    'bluetooth-ble',
  ]),
  systemName: z.string().min(1),
  displayName: z.string().min(1),
  tcpHost: z.string().optional(),
  tcpPort: z.number().int().positive().max(65535).optional(),
  usbVidPid: z.string().optional(),
  usbInterface: z.number().int().nonnegative().optional(),
  usbOutEndpoint: z.number().int().positive().optional(),
  serialPort: z.string().optional(),
  btAddress: z.string().optional(),
  btServiceUuid: z.string().optional(),
  btTxCharUuid: z.string().optional(),
  offsetXmm: z.number().finite().optional(),
  offsetYmm: z.number().finite().optional(),
  density: z.number().int().min(0).max(15).optional(),
  speed: z.number().positive().optional(),
});

export type PrinterBinding = z.infer<typeof PrinterBindingSchema>;

export const LabelSizeSchema = z.object({
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  displayName: z.string().min(1),
});

export const AppSettingsSchema = z.object({
  schemaVersion: z.literal(1),
  lastPrinterId: z.string().optional(),
  locale: z.enum(['en', 'ro']).default('ro'),
  bindings: z.array(PrinterBindingSchema),
  defaultLabelSize: LabelSizeSchema,
  defaultMediaMode: z.enum(['continuous', 'gap', 'black-mark']),
  defaultGapHeightMm: z.number().finite(),
  defaultGapOffsetMm: z.number().finite(),
  defaultCopies: z.number().int().positive(),
  defaultDither: z.enum(['threshold', 'floyd-steinberg']),
  defaultThreshold: z.number().int().min(0).max(255),
  sidebarCollapsed: z.boolean().default(false),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

export const AppSettingsPatchSchema = AppSettingsSchema.partial();
export type AppSettingsPatch = z.infer<typeof AppSettingsPatchSchema>;

export const SETTINGS_SCHEMA_VERSION = 1 as const;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  schemaVersion: 1,
  locale: 'ro',
  bindings: [],
  defaultLabelSize: {
    widthMm: 100,
    heightMm: 150,
    displayName: 'AWB 100 × 150 mm',
  },
  defaultMediaMode: 'gap',
  defaultGapHeightMm: 2,
  defaultGapOffsetMm: 0,
  defaultCopies: 1,
  defaultDither: 'threshold',
  defaultThreshold: 128,
  sidebarCollapsed: false,
};
