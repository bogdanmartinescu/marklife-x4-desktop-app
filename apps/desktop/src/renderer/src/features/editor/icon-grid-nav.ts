export function nextIconIndex(
  current: number,
  key: string,
  count: number,
  columns: number,
): number {
  if (count <= 0) {
    return 0;
  }
  const last = count - 1;
  switch (key) {
    case 'ArrowRight':
      return Math.min(last, current + 1);
    case 'ArrowLeft':
      return Math.max(0, current - 1);
    case 'ArrowDown':
      return Math.min(last, current + columns);
    case 'ArrowUp':
      return Math.max(0, current - columns);
    case 'Home':
      return 0;
    case 'End':
      return last;
    default:
      return current;
  }
}
