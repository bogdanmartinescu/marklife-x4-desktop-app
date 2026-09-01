import type { FontStyle } from './overlay.js';

export function toggleFontStyle(current: FontStyle, toggle: 'bold' | 'italic'): FontStyle {
  const bold = current.includes('bold');
  const italic = current.includes('italic');
  const nextBold = toggle === 'bold' ? !bold : bold;
  const nextItalic = toggle === 'italic' ? !italic : italic;
  if (nextBold && nextItalic) {
    return 'bold italic';
  }
  if (nextBold) {
    return 'bold';
  }
  if (nextItalic) {
    return 'italic';
  }
  return '';
}
