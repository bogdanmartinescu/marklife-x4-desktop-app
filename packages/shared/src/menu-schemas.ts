import { z } from 'zod';
import { MenuActionIdSchema } from './commands.js';
import { LOCALES } from './settings.js';

export const SCREENS = [
  'print',
  'setup',
  'calibration',
  'diagnostics',
  'history',
  'library',
] as const;

export type Screen = (typeof SCREENS)[number];

export const FIT_MODES = ['fit', 'fill', 'actual', 'stretch'] as const;
export type MenuFitMode = (typeof FIT_MODES)[number];

export const LabelSizeStateSchema = z.object({
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  displayName: z.string().min(1),
});

export const MenuStateSchema = z.object({
  screen: z.enum(SCREENS),
  locale: z.enum(LOCALES),
  hasSelection: z.boolean(),
  hasSource: z.boolean(),
  canPrint: z.boolean(),
  isEnhanced: z.boolean(),
  showGrid: z.boolean(),
  fitMode: z.enum(FIT_MODES),
  pageCount: z.number().int().positive(),
  modalOpen: z.boolean(),
  labelSizes: z.array(LabelSizeStateSchema),
  activeLabelSize: z.object({
    widthMm: z.number().positive(),
    heightMm: z.number().positive(),
  }),
  printers: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })),
  activePrinterId: z.string(),
  profiles: z.array(z.object({ id: z.string().min(1), displayName: z.string().min(1) })),
  activeProfileId: z.string(),
  templates: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })),
});

export type MenuState = z.infer<typeof MenuStateSchema>;

export const MenuCommandSchema = z.object({
  action: MenuActionIdSchema,
  payload: z.unknown().optional(),
});

export type MenuCommand = z.infer<typeof MenuCommandSchema>;

export const DEFAULT_MENU_STATE: MenuState = {
  screen: 'print',
  locale: 'ro',
  hasSelection: false,
  hasSource: false,
  canPrint: false,
  isEnhanced: false,
  showGrid: false,
  fitMode: 'fit',
  pageCount: 1,
  modalOpen: false,
  labelSizes: [],
  activeLabelSize: { widthMm: 100, heightMm: 150 },
  printers: [],
  activePrinterId: '',
  profiles: [],
  activeProfileId: '',
  templates: [],
};

export const SCREEN_ACCELERATORS: Record<Screen, string> = {
  print: 'CmdOrCtrl+1',
  setup: 'CmdOrCtrl+2',
  history: 'CmdOrCtrl+3',
  library: 'CmdOrCtrl+4',
  calibration: 'CmdOrCtrl+5',
  diagnostics: 'CmdOrCtrl+6',
};

export const SCREEN_LABEL_KEYS = {
  print: 'viewScreenPrint',
  setup: 'viewScreenPrinters',
  history: 'viewScreenHistory',
  library: 'viewScreenLibrary',
  calibration: 'viewScreenCalibration',
  diagnostics: 'viewScreenDiagnostics',
} as const;
