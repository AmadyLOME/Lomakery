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

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={withFont(style)} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  return <RNTextInput {...props} style={withFont(style)} />;
}
