export type FitMode = 'fit' | 'fill' | 'actual' | 'stretch';
export type Rotation = 0 | 90 | 180 | 270;

export interface LabelTransform {
  rotation: Rotation;
  mirrorX: boolean;
  mirrorY: boolean;
  negative: boolean;
  offsetXmm: number;
  offsetYmm: number;
  fitMode: FitMode;
}

export const DEFAULT_LABEL_TRANSFORM: LabelTransform = {
  rotation: 0,
  mirrorX: false,
  mirrorY: false,
  negative: false,
  offsetXmm: 0,
  offsetYmm: 0,
  fitMode: 'fit',
};
