import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Dimensions de référence (iPhone 14 / 15)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// Mise à l'échelle proportionnelle à la largeur de l'écran
export function scale(size: number): number {
  return Math.round((screenWidth / BASE_WIDTH) * size);
}

// Mise à l'échelle proportionnelle à la hauteur de l'écran
export function verticalScale(size: number): number {
  return Math.round((screenHeight / BASE_HEIGHT) * size);
}

// Mise à l'échelle atténuée (factor 0.5 = moitié de l'écart) — pour les polices
export function moderateScale(size: number, factor = 0.5): number {
  return Math.round(size + (scale(size) - size) * factor);
}

// Pourcentage de la largeur / hauteur de l'écran
export function wp(percent: number): number {
  return Math.round((screenWidth * percent) / 100);
}

export function hp(percent: number): number {
  return Math.round((screenHeight * percent) / 100);
}

export { screenWidth, screenHeight };
