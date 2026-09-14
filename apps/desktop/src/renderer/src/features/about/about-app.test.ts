import { describe, expect, it } from 'vitest';
import { aboutWebsiteHref, APP_MAINTAINER } from './about-app.js';

describe('APP_MAINTAINER', () => {
  it('keeps the legal identity and contact channels', () => {
    expect(APP_MAINTAINER.name).toBe('MLB DIGITAL COMMERCE SRL');
    expect(APP_MAINTAINER.cui).toBe('50914870');
    expect(APP_MAINTAINER.address).toContain('Moșilor');
    expect(APP_MAINTAINER.email).toBe('hi@mlb.ro');
    expect(APP_MAINTAINER.websiteUrl).toBe('https://www.mlb.ro');
    expect(APP_MAINTAINER.mailtoUrl).toBe('mailto:hi@mlb.ro');
  });
});

describe('aboutWebsiteHref', () => {
  it('adds https when the label is a bare host', () => {
    expect(aboutWebsiteHref('www.mlb.ro')).toBe('https://www.mlb.ro');
    expect(aboutWebsiteHref('https://www.mlb.ro')).toBe('https://www.mlb.ro');
  });
});
