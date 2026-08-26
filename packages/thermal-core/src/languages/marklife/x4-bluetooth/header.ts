/**
 * Observed Android `X4Protocol.getHeader()` inputs. The on-wire layout is
 * unverified — fields stay named, unknown bytes stay `unknownXX`, and nothing
 * here is serialized until hardware captures exist.
 */
export type X4BluetoothHeaderInput = {
  width: number;
  height: number;
  paperType: number;
  density: number;
  copies: number;
  payloadLength: number;
};

export type X4BluetoothHeaderFieldStatus = 'observed-input' | 'unverified';

export const X4_BLUETOOTH_HEADER_FIELDS: ReadonlyArray<{
  name: keyof X4BluetoothHeaderInput | 'unknownXX';
  status: X4BluetoothHeaderFieldStatus;
}> = [
  { name: 'width', status: 'observed-input' },
  { name: 'height', status: 'observed-input' },
  { name: 'paperType', status: 'observed-input' },
  { name: 'density', status: 'observed-input' },
  { name: 'copies', status: 'observed-input' },
  { name: 'payloadLength', status: 'observed-input' },
  { name: 'unknownXX', status: 'unverified' },
];
