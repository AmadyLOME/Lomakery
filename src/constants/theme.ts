import { applySoftScheme } from './palette';

// Palette claire (référence). Les écrans lisent COLORS, mis à jour sur place par applyScheme().
export const LIGHT_COLORS = {
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
  indigo: '#3F4575',        // minuteurs, sélection secondaire
  indigoSoft: '#E4E6F5',
  segmentActive: '#FFFFFF', // pastille choisie d'un sélecteur
  primarySoft: '#F9E2D3',   // fond pâle orangé (« À acheter »)
  mustardSoft: '#F6ECCF',   // fond pâle moutarde (mot épinglé)
  onAccent: '#1E2E1E',      // texte posé sur une pastille moutarde / orange clair (reste foncé en sombre)
  paper: '#FFFFFF',         // papier des polaroïds (reste clair en sombre)
  overlay: 'rgba(0,0,0,0.4)',
};

export type Palette = typeof LIGHT_COLORS;

// Palette sombre : fonds vert nuit, orange éclairci pour garder le contraste
export const DARK_COLORS: Palette = {
  primary: '#D8622B',
  primaryLight: '#EE7A3E',
  primaryDark: '#F2925F',
  mustard: '#E0B030',
  mustardLight: '#E8BC3A',
  green: '#72B386',
  greenLight: '#8FC7A0',
  background: '#141A14',
  surface: '#1F2A20',
  surfaceWarm: '#242F24',
  text: '#EEE9DC',
  textSecondary: '#A69D8A',
  border: '#2F3A2E',
  success: '#72B386',
  danger: '#E5675A',
  warning: '#E8BC3A',
  sand: '#2B362A',
  sandDark: '#3B4739',
  textMuted: '#C4BBA8',
  ink: '#34463A',
  inkSoft: '#CFE0CF',
  dangerSoft: '#3D2522',
  dangerText: '#F08A7A',
  greenSoft: '#233629',
  mustardText: '#E3BF55',
  indigo: '#A9AFEF',
  indigoSoft: '#2A2E48',
  segmentActive: '#46553F',
  primarySoft: '#40291D',
  mustardSoft: '#3A321B',
  onAccent: '#1E2E1E',
  paper: '#F4EFE4',
  overlay: 'rgba(0,0,0,0.6)',
};

export type ColorScheme = 'light' | 'dark';

export const COLORS: Palette = { ...LIGHT_COLORS };

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
  handwritten: 'Caveat_700Bold', // légendes des polaroïds
};

export function fontForWeight(weight?: string | number): string {
  const w = String(weight ?? '400');
  if (w === '800' || w === '900') return FONTS.extrabold;
  if (w === '700' || w === 'bold') return FONTS.bold;
  if (w === '500' || w === '600') return FONTS.semibold;
  return FONTS.regular;
}

const LIGHT_SHADOWS = {
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

type ShadowSet = typeof LIGHT_SHADOWS;

// En sombre, les ombres chaudes ne se voient pas : ombre noire plus marquée
const DARK_SHADOWS: ShadowSet = {
  sm: { ...LIGHT_SHADOWS.sm, shadowOpacity: 0.3 },
  md: { ...LIGHT_SHADOWS.md, shadowOpacity: 0.35 },
  soft: { ...LIGHT_SHADOWS.soft, shadowColor: '#000', shadowOpacity: 0.35 },
};

export const SHADOWS: ShadowSet = {
  sm: { ...LIGHT_SHADOWS.sm },
  md: { ...LIGHT_SHADOWS.md },
  soft: { ...LIGHT_SHADOWS.soft },
};

// Bascule toutes les couleurs partagées (COLORS, SHADOWS, teintes douces) sur place
export function applyScheme(scheme: ColorScheme) {
  Object.assign(COLORS, scheme === 'dark' ? DARK_COLORS : LIGHT_COLORS);
  const shadows = scheme === 'dark' ? DARK_SHADOWS : LIGHT_SHADOWS;
  (Object.keys(shadows) as (keyof ShadowSet)[]).forEach((k) => Object.assign(SHADOWS[k], shadows[k]));
  applySoftScheme(scheme);
}

// Espace à laisser en bas des écrans sous la barre d'onglets flottante
export const TAB_BAR_SPACE = 120;
