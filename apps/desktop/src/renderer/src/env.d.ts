/// <reference types="vite/client" />

import type { ThermalBridgeAPI } from '@thermalbridge/shared';

declare global {
  interface Window {
    thermalBridge: ThermalBridgeAPI;
  }
}

export {};
