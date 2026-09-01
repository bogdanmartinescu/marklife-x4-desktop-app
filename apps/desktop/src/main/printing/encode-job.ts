import { resolveRoute, type DiagnosticRouteId, type TransportKind } from '@thermalbridge/printer-profiles';
import { ThermalBridgeError, type PrinterBackend } from '@thermalbridge/shared';
import {
  buildPhomemoM110Job,
  buildPrintJob,
  encodeX4BluetoothJob,
  ProtocolUnimplementedError,
  type BuildPrintJobOptions,
  type RgbaImage,
} from '@thermalbridge/thermal-core';

export async function encodeJobForRoute(options: {
  profileId: string;
  transport: PrinterBackend;
  diagnosticRoute?: DiagnosticRouteId;
  image: RgbaImage;
  tspl: BuildPrintJobOptions;
}): Promise<Uint8Array> {
  const resolved = resolveRoute({
    modelId: options.profileId,
    transport: options.transport as TransportKind,
    ...(options.diagnosticRoute !== undefined
      ? { diagnostic: options.diagnosticRoute }
      : {}),
  });

  if (resolved.kind === 'unsupported') {
    throw new ThermalBridgeError('ROUTE_UNSUPPORTED', resolved.reason);
  }

  const route = resolved.route;
  if (route.protocol === 'marklife-x4-bt-v7') {
    try {
      return await encodeX4BluetoothJob({
        width: options.image.width,
        height: options.image.height,
        gray: new Uint8Array(options.image.width * options.image.height),
        paperType: 0,
        density: options.tspl.density,
        copies: options.tspl.copies ?? 1,
      });
    } catch (error: unknown) {
      if (error instanceof ProtocolUnimplementedError) {
        throw new ThermalBridgeError('PROTOCOL_UNIMPLEMENTED', error.message);
      }
      throw error;
    }
  }

  if (route.protocol === 'tspl') {
    return buildPrintJob(options.tspl);
  }

  if (route.protocol === 'phomemo-m110') {
    return buildPhomemoM110Job({
      image: options.image,
      widthMm: options.tspl.widthMm,
      heightMm: options.tspl.heightMm,
      dpi: options.tspl.dpi,
      density: options.tspl.density,
      speed: options.tspl.speed,
      media: options.tspl.media,
      ...(options.tspl.transform !== undefined ? { transform: options.tspl.transform } : {}),
      ...(options.tspl.dither !== undefined ? { dither: options.tspl.dither } : {}),
      ...(options.tspl.threshold !== undefined ? { threshold: options.tspl.threshold } : {}),
    });
  }

  if (
    route.protocol === 'esc-pos' ||
    route.protocol === 'marklife-d210-bt-v5' ||
    route.protocol === 'marklife-p50-bt-v3'
  ) {
    throw new ThermalBridgeError(
      'PROTOCOL_UNIMPLEMENTED',
      `Protocol ${route.protocol} is not implemented yet.`,
    );
  }

  throw new ThermalBridgeError(
    'ROUTE_UNSUPPORTED',
    `No encoder is registered for protocol ${route.protocol}`,
  );
}
