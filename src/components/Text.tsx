import React from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  TextProps,
  TextInputProps,
  StyleSheet,
  StyleProp,
  TextStyle,
} from 'react-native';
import { fontForWeight } from '../constants/theme';

// Nunito existe en une famille par graisse : on convertit `fontWeight` en `fontFamily`
// (sinon iOS/Android retombent sur la police système pour les graisses non chargées).
function withFont(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return style;
  return [style, { fontFamily: fontForWeight(flat.fontWeight), fontWeight: 'normal' }];
}

// Le texte suit la taille choisie dans iOS (Réglages › Affichage), plafonnée pour ne pas casser la mise en page
const MAX_FONT_SCALE = 1.3;

export function Text({ style, maxFontSizeMultiplier = MAX_FONT_SCALE, ...props }: TextProps) {
  return <RNText {...props} maxFontSizeMultiplier={maxFontSizeMultiplier} style={withFont(style)} />;
}

export function TextInput({ style, maxFontSizeMultiplier = MAX_FONT_SCALE, ...props }: TextInputProps) {
  return <RNTextInput {...props} maxFontSizeMultiplier={maxFontSizeMultiplier} style={withFont(style)} />;
}
