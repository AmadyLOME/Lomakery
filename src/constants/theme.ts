export const COLORS = {
  primary: '#C4501A',       // orange (texte blanc lisible : contraste 4,6:1)
  primaryLight: '#E8621A',
  primaryDark: '#A3441A',
  mustard: '#D4A017',       // jaune moutarde
  mustardLight: '#E8BC3A',
  green: '#4A7C59',         // vert
  greenLight: '#6A9E78',
  background: '#FDF8EE',    // crème chaud (fond logo)
  surface: '#FFFFFF',
  surfaceWarm: '#FFF8F0',   // surface légèrement chaude
  text: '#1E2E1E',          // vert très foncé
  textSecondary: '#7A7060',
  border: '#EDE8DC',
  success: '#4A7C59',
  danger: '#C0392B',
  warning: '#D4A017',
  // UI arrondie
  sand: '#F1E8D6',          // fonds de pilules, sélecteurs
  sandDark: '#E3D9C3',
  textMuted: '#5E574A',     // texte secondaire lisible sur blanc
  ink: '#1F2E1F',           // barre d'onglets flottante
  inkSoft: '#CFE0CF',
  dangerSoft: '#F7E1DC',
  dangerText: '#A3301F',
  greenSoft: '#E2EBE4',
  mustardText: '#9A7412',   // moutarde lisible pour du texte
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const FONT_SIZE = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 24,
  title: 28,
};

export const BORDER_RADIUS = {
  sm: 12,
  md: 20,
  lg: 28,
  full: 999,
};

// Police Nunito : une famille par graisse (chargées dans App.tsx)
export const FONTS = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
};

export function fontForWeight(weight?: string | number): string {
  const w = String(weight ?? '400');
  if (w === '800' || w === '900') return FONTS.extrabold;
  if (w === '700' || w === 'bold') return FONTS.bold;
  if (w === '500' || w === '600') return FONTS.semibold;
  return FONTS.regular;
}

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  // Ombre diffuse et chaude des cartes arrondies
  soft: {
    shadowColor: '#3C280A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
};

// Espace à laisser en bas des écrans sous la barre d'onglets flottante
export const TAB_BAR_SPACE = 120;
