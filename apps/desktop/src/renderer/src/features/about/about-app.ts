export const APP_MAINTAINER = {
  name: 'MLB DIGITAL COMMERCE SRL',
  cui: '50914870',
  address: 'Calea Moșilor nr. 88',
  email: 'hi@mlb.ro',
  websiteLabel: 'www.mlb.ro',
  websiteUrl: 'https://www.mlb.ro',
  mailtoUrl: 'mailto:hi@mlb.ro',
} as const;

export function aboutWebsiteHref(label: string): string {
  if (label.startsWith('https://') || label.startsWith('http://')) {
    return label;
  }
  return `https://${label}`;
}
