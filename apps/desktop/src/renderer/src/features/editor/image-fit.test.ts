import { describe, expect, it } from 'vitest';
import { fitImageInRect, mmRectToDots } from './image-fit.js';

describe('fitImageInRect', () => {
  it('fills the box when the aspect ratio matches', () => {
    expect(fitImageInRect(200, 100, 40, 20)).toEqual({ x: 0, y: 0, width: 40, height: 20 });
  });

  it('letterboxes a wide image so left and right stay equal', () => {
    expect(fitImageInRect(400, 100, 40, 20)).toEqual({ x: 0, y: 5, width: 40, height: 10 });
  });

  it('pillarboxes a tall image so left and right stay equal', () => {
    expect(fitImageInRect(100, 400, 40, 20)).toEqual({ x: 17.5, y: 0, width: 5, height: 20 });
  });
});

describe('mmRectToDots', () => {
  it('maps millimetres as a fraction of the label, matching the editor stage', () => {
    const canvasW = 320;
    const canvasH = 240;
    const box = mmRectToDots(
      { xMm: 10, yMm: 6, widthMm: 20, heightMm: 12 },
      40,
      30,
      canvasW,
      canvasH,
    );
    expect(box).toEqual({
      x: Math.round((10 / 40) * canvasW),
      y: Math.round((6 / 30) * canvasH),
      width: Math.round((30 / 40) * canvasW) - Math.round((10 / 40) * canvasW),
      height: Math.round((18 / 30) * canvasH) - Math.round((6 / 30) * canvasH),
    });
  });

  it('keeps a full-width image on the label edges', () => {
    expect(mmRectToDots({ xMm: 0, yMm: 0, widthMm: 40, heightMm: 30 }, 40, 30, 320, 240)).toEqual({
      x: 0,
      y: 0,
      width: 320,
      height: 240,
    });
  });
});
