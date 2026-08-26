import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  AppSettingsPatchSchema,
  AppSettingsSchema,
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type AppSettingsPatch,
} from '@thermalbridge/shared';

export class SettingsStore {
  constructor(private readonly filePath: string) {}

  get(): AppSettings {
    try {
      const raw: unknown = JSON.parse(readFileSync(this.filePath, 'utf8'));
      return migrate(raw);
    } catch {
      return { ...DEFAULT_APP_SETTINGS, bindings: [] };
    }
  }

  update(patch: AppSettingsPatch): AppSettings {
    const parsed = AppSettingsPatchSchema.parse(patch);
    const next = AppSettingsSchema.parse({
      ...this.get(),
      ...parsed,
      schemaVersion: 1,
    });
    this.write(next);
    return next;
  }

  private write(settings: AppSettings): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  }
}

function migrate(raw: unknown): AppSettings {
  const record =
    typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const parsed = AppSettingsSchema.safeParse({
    ...DEFAULT_APP_SETTINGS,
    ...record,
    schemaVersion: 1,
  });
  return parsed.success ? parsed.data : { ...DEFAULT_APP_SETTINGS, bindings: [] };
}
