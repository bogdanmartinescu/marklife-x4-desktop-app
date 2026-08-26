import { describe, expect, it } from 'vitest';
import { computeFitRect, dotsToMm, mmToDots } from '@thermalbridge/thermal-core';
import {
  CONTENT_SCALE_MAX,
  CONTENT_SCALE_MIN,
  boxCssPercent,
  boxFromFit,
  contentBoxToRect,
  contentOverflowMm,
  lockAspectForFitMode,
  moveBox,
  pointerDeltaToMm,
  resizeBox,
  scaleBoxToPercent,
  scalePercentFromBox,
  type ContentBox,
} from './content-placement.js';

const LABEL = { labelWidthMm: 100, labelHeightMm: 150, dpi: 203 } as const;

function sampleBox(): ContentBox {
  return { xMm: 10, yMm: 20, widthMm: 40, heightMm: 20 };
}

describe('boxFromFit', () => {
  it('matches computeFitRect converted to millimetres', () => {
    const sourceWidthPx = 200;
    const sourceHeightPx = 100;
    const dstW = mmToDots(LABEL.labelWidthMm, LABEL.dpi);
    const dstH = mmToDots(LABEL.labelHeightMm, LABEL.dpi);
    const rect = computeFitRect(sourceWidthPx, sourceHeightPx, dstW, dstH, 'fit');
    expect(
      boxFromFit({
        sourceWidthPx,
        sourceHeightPx,
        ...LABEL,
        fitMode: 'fit',
      }),
    ).toEqual({
      xMm: dotsToMm(rect.x, LABEL.dpi),
      yMm: dotsToMm(rect.y, LABEL.dpi),
      widthMm: dotsToMm(rect.width, LABEL.dpi),
      heightMm: dotsToMm(rect.height, LABEL.dpi),
    });
  });

  it('fills the label for stretch', () => {
    expect(
      boxFromFit({
        sourceWidthPx: 200,
        sourceHeightPx: 100,
        ...LABEL,
        fitMode: 'stretch',
      }),
    ).toEqual({
      xMm: 0,
      yMm: 0,
      widthMm: dotsToMm(mmToDots(100, 203), 203),
      heightMm: dotsToMm(mmToDots(150, 203), 203),
    });
  });
});

describe('moveBox', () => {
  it('nudges the document without changing size', () => {
    expect(moveBox(sampleBox(), 5, -3)).toEqual({
      xMm: 15,
      yMm: 17,
      widthMm: 40,
      heightMm: 20,
    });
  });
});

describe('resizeBox', () => {
  it('grows from the south-east handle without locking aspect', () => {
    const next = resizeBox({
      box: sampleBox(),
      handle: 'se',
      dxMm: 10,
      dyMm: 5,
      lockAspect: false,
      minWidthMm: 5,
      minHeightMm: 5,
    });
    expect(next).toEqual({ xMm: 10, yMm: 20, widthMm: 50, heightMm: 25 });
  });

  it('keeps the opposite corner fixed when aspect is locked', () => {
    const next = resizeBox({
      box: sampleBox(),
      handle: 'se',
      dxMm: 10,
      dyMm: 0,
      lockAspect: true,
      minWidthMm: 5,
      minHeightMm: 5,
    });
    expect(next.xMm).toBe(10);
    expect(next.yMm).toBe(20);
    expect(next.widthMm / next.heightMm).toBeCloseTo(2);
    expect(next.widthMm).toBeCloseTo(50);
    expect(next.heightMm).toBeCloseTo(25);
  });

  it('keeps the south-east corner fixed when resizing from the north-west', () => {
    const next = resizeBox({
      box: sampleBox(),
      handle: 'nw',
      dxMm: -10,
      dyMm: 0,
      lockAspect: true,
      minWidthMm: 5,
      minHeightMm: 5,
    });
    expect(next.xMm + next.widthMm).toBeCloseTo(50);
    expect(next.yMm + next.heightMm).toBeCloseTo(40);
    expect(next.widthMm / next.heightMm).toBeCloseTo(2);
  });

  it('does not shrink below the minimum size', () => {
    const next = resizeBox({
      box: sampleBox(),
      handle: 'se',
      dxMm: -100,
      dyMm: -100,
      lockAspect: false,
      minWidthMm: 8,
      minHeightMm: 6,
    });
    expect(next.widthMm).toBe(8);
    expect(next.heightMm).toBe(6);
    expect(next.xMm).toBe(10);
    expect(next.yMm).toBe(20);
  });
});

describe('scale around the current centre', () => {
  it('reports size relative to the fit box', () => {
    const fit = { xMm: 0, yMm: 25, widthMm: 100, heightMm: 50 };
    const box = { xMm: 10, yMm: 20, widthMm: 50, heightMm: 25 };
    expect(scalePercentFromBox(box, fit)).toBe(50);
  });

  it('scales around the current centre and clamps the range', () => {
    const fit = { xMm: 0, yMm: 25, widthMm: 100, heightMm: 50 };
    const box = { xMm: 10, yMm: 30, widthMm: 40, heightMm: 20 };
    const next = scaleBoxToPercent(box, fit, 200);
    expect(next.widthMm).toBeCloseTo(200);
    expect(next.heightMm).toBeCloseTo(100);
    expect(next.xMm + next.widthMm / 2).toBeCloseTo(30);
    expect(next.yMm + next.heightMm / 2).toBeCloseTo(40);

    expect(scaleBoxToPercent(box, fit, 1).widthMm).toBeCloseTo(fit.widthMm * (CONTENT_SCALE_MIN / 100));
    expect(scaleBoxToPercent(box, fit, 999).widthMm).toBeCloseTo(fit.widthMm * (CONTENT_SCALE_MAX / 100));
  });
});

describe('preview mapping', () => {
  it('converts a millimetre box to CSS percentages of the label', () => {
    expect(boxCssPercent(sampleBox(), 100, 150)).toEqual({
      left: '10%',
      top: `${(20 / 150) * 100}%`,
      width: '40%',
      height: `${(20 / 150) * 100}%`,
    });
  });

  it('maps pointer pixels to millimetres using the on-screen label size', () => {
    expect(
      pointerDeltaToMm({
        dxPx: 40,
        dyPx: -30,
        labelWidthPx: 400,
        labelHeightPx: 600,
        labelWidthMm: 100,
        labelHeightMm: 150,
      }),
    ).toEqual({ dxMm: 10, dyMm: -7.5 });
  });

  it('measures how far the document sticks out of the label', () => {
    expect(
      contentOverflowMm({ xMm: -10, yMm: -20, widthMm: 120, heightMm: 200 }, 100, 150),
    ).toEqual({ leftMm: 10, topMm: 20, rightMm: 10, bottomMm: 30 });
    expect(contentOverflowMm(sampleBox(), 100, 150)).toEqual({
      leftMm: 0,
      topMm: 0,
      rightMm: 0,
      bottomMm: 0,
    });
  });

  it('converts the box to printer dots for the same geometry as print', () => {
    const box = sampleBox();
    expect(contentBoxToRect(box, 203)).toEqual({
      x: mmToDots(box.xMm, 203),
      y: mmToDots(box.yMm, 203),
      width: mmToDots(box.widthMm, 203),
      height: mmToDots(box.heightMm, 203),
    });
  });

  it('locks aspect for every fit mode except stretch', () => {
    expect(lockAspectForFitMode('fit')).toBe(true);
    expect(lockAspectForFitMode('fill')).toBe(true);
    expect(lockAspectForFitMode('actual')).toBe(true);
    expect(lockAspectForFitMode('stretch')).toBe(false);
  });
});
