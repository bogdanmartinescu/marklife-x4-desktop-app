import {
  applyProfilePrintSettings,
  getProfile,
  resolveRoute,
  type DiagnosticRouteId,
  type TransportKind,
} from '@thermalbridge/printer-profiles';
import { ThermalBridgeError, type PrinterBackend } from '@thermalbridge/shared';
import {
  buildPhomemoM110Job,
  buildPrintJob,
  encodeX4BluetoothJob,
  ProtocolUnimplementedError,
  type BuildPrintJobOptions,
  type RgbaImage,
} from '@thermalbridge/thermal-core';
import { encodeRgbaPng } from './encode-png.js';

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
    return buildPrintJob(clampTsplToProfile(options.profileId, options.tspl));
  }

  if (route.protocol === 'cups-png') {
    return encodeRgbaPng({
      width: options.image.width,
      height: options.image.height,
      data: options.image.data,
      dpi: options.tspl.dpi,
    });
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

function clampTsplToProfile(profileId: string, tspl: BuildPrintJobOptions): BuildPrintJobOptions {
  const profile = getProfile(profileId);
  if (profile === undefined) {
    return tspl;
  }
  const transform = tspl.transform;
  const applied = applyProfilePrintSettings(profile, {
    density: tspl.density,
    speed: tspl.speed,
    mediaMode: tspl.media.mode,
    offsetXmm: transform?.offsetXmm ?? 0,
    offsetYmm: transform?.offsetYmm ?? 0,
    mirrorX: transform?.mirrorX ?? false,
    mirrorY: transform?.mirrorY ?? false,
    negative: transform?.negative ?? false,
    widthMm: tspl.widthMm,
    heightMm: tspl.heightMm,
  });
  return {
    ...tspl,
    density: applied.density,
    speed: applied.speed,
    widthMm: applied.widthMm,
    heightMm: applied.heightMm,
  };
}
