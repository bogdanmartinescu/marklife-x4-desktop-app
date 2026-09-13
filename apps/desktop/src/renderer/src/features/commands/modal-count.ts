export function nextModalCount(current: number, delta: 1 | -1): number {
  return Math.max(0, current + delta);
}
