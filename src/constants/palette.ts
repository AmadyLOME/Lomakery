// Teintes douces partagées (fiches d'infos, pastilles) : fond + texte lisible dessus
const LIGHT_SOFT = [
  { bg: '#E3E4F3', fg: '#3F4575' },
  { bg: '#E2EBE4', fg: '#3E6B4C' },
  { bg: '#F9E2D3', fg: '#7A4A2E' },
  { bg: '#F6ECCF', fg: '#7A5A0E' },
  { bg: '#F3DDE6', fg: '#7A3553' },
  { bg: '#F1E8D6', fg: '#5E574A' },
];

const DARK_SOFT = [
  { bg: '#2A2E48', fg: '#B9BEF0' },
  { bg: '#233629', fg: '#9FD2AE' },
  { bg: '#3E2B20', fg: '#F2B892' },
  { bg: '#3A321B', fg: '#E8C96A' },
  { bg: '#3D2331', fg: '#F0A8C8' },
  { bg: '#2E3327', fg: '#D2C9B5' },
];

export const SOFT_COLORS = LIGHT_SOFT.map((c) => ({ ...c }));

export function applySoftScheme(scheme: 'light' | 'dark') {
  const src = scheme === 'dark' ? DARK_SOFT : LIGHT_SOFT;
  src.forEach((c, i) => Object.assign(SOFT_COLORS[i], c));
}

export const softColor = (index: number) => SOFT_COLORS[((index % SOFT_COLORS.length) + SOFT_COLORS.length) % SOFT_COLORS.length];
