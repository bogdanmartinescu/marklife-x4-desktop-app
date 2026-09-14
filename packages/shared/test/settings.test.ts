import { describe, expect, it } from 'vitest';
import { AppSettingsSchema, DEFAULT_APP_SETTINGS, PrinterBindingSchema } from '../src/settings.js';

describe('DEFAULT_APP_SETTINGS', () => {
  it('parses as schema version 1 with AWB defaults', () => {
    const parsed = AppSettingsSchema.parse(DEFAULT_APP_SETTINGS);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.defaultLabelSize).toEqual({
      widthMm: 100,
      heightMm: 150,
      displayName: 'AWB 100 × 150 mm',
    });
    expect(parsed.locale).toBe('ro');
    expect(parsed.sidebarCollapsed).toBe(false);
    expect(parsed.syncFolderPath).toBeUndefined();
  });

  it('accepts an optional syncFolderPath', () => {
    const parsed = AppSettingsSchema.parse({
      ...DEFAULT_APP_SETTINGS,
      syncFolderPath: '/Users/test/Dropbox/ThermalBridge',
    });
    expect(parsed.syncFolderPath).toBe('/Users/test/Dropbox/ThermalBridge');
  });

  it('accepts absence of syncFolderPath (undefined / missing)', () => {
    const parsed = AppSettingsSchema.parse(DEFAULT_APP_SETTINGS);
    expect(parsed.syncFolderPath).toBeUndefined();
  });

  it('defaults sidebarCollapsed when the field is missing', () => {
    expect(
      AppSettingsSchema.parse({
        schemaVersion: 1,
        locale: 'ro',
        bindings: [],
        defaultLabelSize: DEFAULT_APP_SETTINGS.defaultLabelSize,
        defaultMediaMode: 'gap',
        defaultGapHeightMm: 2,
        defaultGapOffsetMm: 0,
        defaultCopies: 1,
        defaultDither: 'threshold',
        defaultThreshold: 128,
      }).sidebarCollapsed,
    ).toBe(false);
  });
});

describe('PrinterBindingSchema', () => {
  it('accepts a CUPS binding and rejects an empty printer id', () => {
    const ok = PrinterBindingSchema.safeParse({
      printerId: 'cups:Canon_TS3300_series',
      profileId: 'canon-inkjet',
      backend: 'cups',
      systemName: 'Canon_TS3300_series',
      displayName: 'Canon TS3300',
    });
    expect(ok.success).toBe(true);
    if (!ok.success) {
      return;
    }
    expect(PrinterBindingSchema.safeParse({ ...ok.data, printerId: '' }).success).toBe(false);
  });
});
