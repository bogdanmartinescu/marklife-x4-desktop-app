export const IpcChannel = {
  PRINTERS_LIST: 'printers:list',
  PRINTERS_REFRESH: 'printers:refresh',
  USB_LIST: 'usb:list',
  BLUETOOTH_SCAN: 'bluetooth:scan',
  BLUETOOTH_SPP_LIST: 'bluetooth:spp:list',
  BLUETOOTH_OPEN_PAIRING: 'bluetooth:open-pairing',
  PRINT_SUBMIT: 'print:submit',
  PRINT_TEST: 'print:test',
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  DIAGNOSTICS_SYSTEM: 'diagnostics:system',
  DIAGNOSTICS_EXPORT: 'diagnostics:export',
  SOURCES_OPEN: 'sources:open',
} as const;

export type IpcChannelName = (typeof IpcChannel)[keyof typeof IpcChannel];
