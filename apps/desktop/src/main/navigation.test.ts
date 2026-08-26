import { describe, expect, it } from 'vitest';
import { shouldAllowRendererNavigation } from './navigation.js';

describe('shouldAllowRendererNavigation', () => {
  it('blocks file:// drops so a PDF cannot replace the app', () => {
    expect(shouldAllowRendererNavigation('file:///Users/me/awb.pdf', 'http://localhost:5175/')).toBe(
      false,
    );
  });

  it('allows the Vite renderer URL in development', () => {
    expect(shouldAllowRendererNavigation('http://localhost:5175/', 'http://localhost:5175/')).toBe(
      true,
    );
    expect(
      shouldAllowRendererNavigation('http://localhost:5175/src/App.tsx', 'http://localhost:5175/'),
    ).toBe(true);
  });

  it('blocks navigation when no renderer URL is configured', () => {
    expect(shouldAllowRendererNavigation('http://localhost:5175/', undefined)).toBe(false);
  });
});
