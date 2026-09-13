export function displayAccelerator(accelerator: string): string {
  if (accelerator === 'Backspace') {
    return '⌫';
  }
  if (accelerator === 'Delete') {
    return 'Del';
  }
  if (accelerator === 'Escape') {
    return 'Esc';
  }
  return accelerator.replace('CmdOrCtrl+', '⌘');
}
