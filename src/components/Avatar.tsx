import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Text } from './Text';
import { toDataUri } from '../services/photos';
import { COLORS } from '../constants/theme';

interface AvatarProps {
  name?: string;
  photo?: string; // JPEG base64
  size: number;
}

// Photo de profil ronde, ou initiale sur fond vert si pas de photo
export default function Avatar({ name, photo, size }: AvatarProps) {
  const dims = { width: size, height: size, borderRadius: size / 2 };
  if (photo) {
    return <Image source={{ uri: toDataUri(photo) }} style={[styles.base, dims]} />;
  }
  return (
    <View style={[styles.base, styles.placeholder, dims]}>
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>
        {(name?.trim() || '?')[0].toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 2, borderColor: COLORS.mustard },
  placeholder: { backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontWeight: '700' },
});
