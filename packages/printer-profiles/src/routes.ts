export type TransportKind =
  | 'windows-spooler'
  | 'cups'
  | 'tcp'
  | 'usb'
  | 'bluetooth-spp'
  | 'bluetooth-ble';

export type ProtocolId =
  | 'tspl'
  | 'esc-pos'
  | 'phomemo-m110'
  | 'marklife-x4-bt-v7'
  | 'marklife-d210-bt-v5'
  | 'marklife-p50-bt-v3';

export type CodecId = 'raw-mono-1bpp' | 'jbig-t85' | 'marklife-d210';

export type SessionProfileId =
  | 'none'
  | 'raw-stream'
  | 'marklife-spp'
  | 'marklife-ble-credit'
  | 'phomemo-ble-paced';

export type RouteStatus = 'verified' | 'candidate' | 'experimental';

export type DiagnosticRouteId = 'x4-spp-raw-tspl';

export interface PrinterRoute {
  id: string;
  modelId: string;
  transport: TransportKind;
  protocol: ProtocolId;
  codec: CodecId;
  session: SessionProfileId;
  status: RouteStatus;
}

export interface ResolveRouteInput {
  modelId: string;
  transport: TransportKind;
  advertised?: {
    ble?: boolean;
    spp?: boolean;
  };
  diagnostic?: DiagnosticRouteId;
}

export type ResolveRouteResult =
  | { kind: 'resolved'; route: PrinterRoute }
  | { kind: 'candidate'; route: PrinterRoute }
  | { kind: 'unsupported'; reason: string };
