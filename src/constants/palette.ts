// Teintes douces partagées (fiches d'infos, pastilles) : fond + texte lisible dessus
export const SOFT_COLORS = [
  { bg: '#E3E4F3', fg: '#3F4575' },
  { bg: '#E2EBE4', fg: '#3E6B4C' },
  { bg: '#F9E2D3', fg: '#7A4A2E' },
  { bg: '#F6ECCF', fg: '#7A5A0E' },
  { bg: '#F3DDE6', fg: '#7A3553' },
  { bg: '#F1E8D6', fg: '#5E574A' },
];

export const softColor = (index: number) => SOFT_COLORS[((index % SOFT_COLORS.length) + SOFT_COLORS.length) % SOFT_COLORS.length];
