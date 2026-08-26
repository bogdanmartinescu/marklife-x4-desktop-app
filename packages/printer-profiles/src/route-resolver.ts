import type { PrinterRoute, ResolveRouteInput, ResolveRouteResult } from './routes.js';

const X4_OS_TSPL: PrinterRoute = {
  id: 'x4-os-tspl',
  modelId: 'marklife-x4',
  transport: 'cups',
  protocol: 'tspl',
  codec: 'raw-mono-1bpp',
  session: 'raw-stream',
  status: 'candidate',
};

const X4_SPP_V7: PrinterRoute = {
  id: 'x4-spp-v7',
  modelId: 'marklife-x4',
  transport: 'bluetooth-spp',
  protocol: 'marklife-x4-bt-v7',
  codec: 'jbig-t85',
  session: 'marklife-spp',
  status: 'candidate',
};

const X4_SPP_TSPL_DIAGNOSTIC: PrinterRoute = {
  id: 'x4-spp-raw-tspl',
  modelId: 'marklife-x4',
  transport: 'bluetooth-spp',
  protocol: 'tspl',
  codec: 'raw-mono-1bpp',
  session: 'raw-stream',
  status: 'experimental',
};

export function resolveRoute(input: ResolveRouteInput): ResolveRouteResult {
  if (input.modelId === 'marklife-x4') {
    return resolveX4(input);
  }
  if (input.modelId === 'marklife-d210') {
    return resolveD210(input);
  }
  if (input.modelId === 'marklife-p50') {
    return resolveP50(input);
  }
  if (input.modelId === 'generic-tspl-203') {
    return {
      kind: 'resolved',
      route: {
        id: `generic-tspl-${input.transport}`,
        modelId: input.modelId,
        transport: input.transport,
        protocol: 'tspl',
        codec: 'raw-mono-1bpp',
        session: 'raw-stream',
        status: 'candidate',
      },
    };
  }
  return { kind: 'unsupported', reason: `No routes registered for ${input.modelId}` };
}

function resolveX4(input: ResolveRouteInput): ResolveRouteResult {
  switch (input.transport) {
    case 'cups':
      return { kind: 'resolved', route: X4_OS_TSPL };
    case 'windows-spooler':
      return {
        kind: 'resolved',
        route: { ...X4_OS_TSPL, id: 'x4-windows-tspl', transport: 'windows-spooler' },
      };
    case 'usb':
      return {
        kind: 'resolved',
        route: { ...X4_OS_TSPL, id: 'x4-usb-tspl', transport: 'usb' },
      };
    case 'tcp':
      return {
        kind: 'resolved',
        route: { ...X4_OS_TSPL, id: 'x4-tcp-tspl', transport: 'tcp' },
      };
    case 'bluetooth-spp':
      if (input.diagnostic === 'x4-spp-raw-tspl') {
        return { kind: 'resolved', route: X4_SPP_TSPL_DIAGNOSTIC };
      }
      return { kind: 'resolved', route: X4_SPP_V7 };
    case 'bluetooth-ble':
      return {
        kind: 'unsupported',
        reason:
          'No X4 BLE print route exists until a physical X4 revision advertises BLE and protocol 7 is verified on that path.',
      };
  }
}

const D210_OS_ESC_POS: PrinterRoute = {
  id: 'd210-os-esc-pos',
  modelId: 'marklife-d210',
  transport: 'cups',
  protocol: 'esc-pos',
  codec: 'raw-mono-1bpp',
  session: 'raw-stream',
  status: 'candidate',
};

const D210_SPP_V5: PrinterRoute = {
  id: 'd210-spp-v5',
  modelId: 'marklife-d210',
  transport: 'bluetooth-spp',
  protocol: 'marklife-d210-bt-v5',
  codec: 'marklife-d210',
  session: 'marklife-spp',
  status: 'candidate',
};

function resolveD210(input: ResolveRouteInput): ResolveRouteResult {
  switch (input.transport) {
    case 'cups':
      return { kind: 'resolved', route: D210_OS_ESC_POS };
    case 'windows-spooler':
      return {
        kind: 'resolved',
        route: { ...D210_OS_ESC_POS, id: 'd210-windows-esc-pos', transport: 'windows-spooler' },
      };
    case 'usb':
      return {
        kind: 'resolved',
        route: { ...D210_OS_ESC_POS, id: 'd210-usb-esc-pos', transport: 'usb' },
      };
    case 'tcp':
      return {
        kind: 'resolved',
        route: { ...D210_OS_ESC_POS, id: 'd210-tcp-esc-pos', transport: 'tcp' },
      };
    case 'bluetooth-spp':
      return { kind: 'resolved', route: D210_SPP_V5 };
    case 'bluetooth-ble':
      return {
        kind: 'unsupported',
        reason:
          'No D210 BLE print route exists until a physical D210 revision advertises BLE and protocol 5 is verified on that path.',
      };
  }
}

const P50_SPP_V3: PrinterRoute = {
  id: 'p50-spp-v3',
  modelId: 'marklife-p50',
  transport: 'bluetooth-spp',
  protocol: 'marklife-p50-bt-v3',
  codec: 'raw-mono-1bpp',
  session: 'marklife-spp',
  status: 'candidate',
};

function resolveP50(input: ResolveRouteInput): ResolveRouteResult {
  if (input.transport === 'bluetooth-spp') {
    return { kind: 'resolved', route: P50_SPP_V3 };
  }
  return {
    kind: 'unsupported',
    reason:
      'P50 print routes are not implemented yet. Protocol 3 must be reconstructed before wiring this model.',
  };
}
