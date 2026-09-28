import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Animated, Easing, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { toDataUri } from '../services/photos';
import { FamilyPhoto } from '../types';
import { COLORS, FONTS } from '../constants/theme';
import { useStyles } from '../theme/ThemeProvider';

const FRAME = 104;               // largeur d'un polaroïd
const PHOTO = FRAME - 14;        // photo carrée dans le cadre
const HEIGHT = 196;
const PINS = [COLORS.mustard, COLORS.primary, COLORS.green];
// Balancement de chaque polaroïd : angles et durées légèrement différents
const SWING = [
  { from: -5, to: -2, duration: 4000 },
  { from: 3, to: 6, duration: 4600 },
  { from: -2, to: 1, duration: 5200 },
];
const CYCLE_MS = 8000;           // au-delà de 3 photos, la guirlande change de photos

interface Props {
  photos: FamilyPhoto[];
  animate: boolean;              // false : écran quitté ou « Réduire les animations »
  onPress: () => void;
}

export default function PolaroidGarland({ photos, animate, onPress }: Props) {
  const styles = useStyles(makeStyles);
  const { width } = useWindowDimensions();
  const [offset, setOffset] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  // Plus de 3 photos : fondu vers le groupe suivant
  useEffect(() => {
    if (!animate || photos.length <= 3) return;
    const t = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setOffset((o) => (o + 3) % photos.length);
        Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      });
    }, CYCLE_MS);
    return () => clearInterval(t);
  }, [animate, photos.length]);

  const shown: (FamilyPhoto | null)[] = [0, 1, 2].map((i) =>
    photos.length > 3 ? photos[(offset + i) % photos.length] : photos[i] ?? null
  );

  // Positions le long du fil (le milieu pend un peu plus bas)
  const lefts = [22, width / 2 - FRAME / 2, width - 22 - FRAME];
  const tops = [14, 24, 14];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={{ height: HEIGHT }}
      accessibilityRole="button"
      accessibilityLabel={`Photos de famille, ${photos.length} photo${photos.length > 1 ? 's' : ''}. Toucher pour gérer.`}
    >
      <Svg width={width} height={40} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path
          d={`M -4 6 C ${width * 0.23} 34, ${width * 0.77} 34, ${width + 4} 6`}
          stroke="#B9A98A"
          strokeWidth={2}
          fill="none"
        />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        {shown.map((photo, i) => (
          <Polaroid
            key={photo ? `${photo.id}-${i}` : `empty-${i}`}
            photo={photo}
            left={lefts[i]}
            top={tops[i]}
            pin={PINS[i]}
            swing={SWING[i]}
            animate={animate}
          />
        ))}
      </Animated.View>
    </TouchableOpacity>
  );
}

interface PolaroidProps {
  photo: FamilyPhoto | null;
  left: number;
  top: number;
  pin: string;
  swing: { from: number; to: number; duration: number };
  animate: boolean;
}

function Polaroid({ photo, left, top, pin, swing, animate }: PolaroidProps) {
  const styles = useStyles(makeStyles);
  const sway = useRef(new Animated.Value(0)).current;
  const zoom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      sway.setValue(0.5);
      zoom.setValue(0);
      return;
    }
    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: swing.duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: swing.duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    // Zoom très lent sur la photo (effet « Ken Burns »)
    const zoomLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(zoom, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(zoom, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    swayLoop.start();
    if (photo) zoomLoop.start();
    return () => { swayLoop.stop(); zoomLoop.stop(); };
  }, [animate, !!photo]);

  const rotate = sway.interpolate({ inputRange: [0, 1], outputRange: [`${swing.from}deg`, `${swing.to}deg`] });
  const scale = zoom.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <Animated.View style={[styles.hanger, { left, top, transform: [{ rotate }] }]}>
      <View style={[styles.pin, { backgroundColor: pin }]} />
      <View style={styles.frame}>
        <View style={styles.photoBox}>
          {photo ? (
            <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
              <Image source={{ uri: toDataUri(photo.data) }} style={styles.photo} />
            </Animated.View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="camera-outline" size={24} color={COLORS.textSecondary} />
            </View>
          )}
        </View>
        <Text style={styles.caption} numberOfLines={1}>
          {photo ? photo.caption || ' ' : 'Ajouter'}
        </Text>
      </View>
    </Animated.View>
  );
}

const makeStyles = () => StyleSheet.create({
  hanger: { position: 'absolute', width: FRAME, transformOrigin: 'top' },
  pin: { position: 'absolute', top: -8, left: FRAME / 2 - 6, width: 12, height: 20, borderRadius: 3, zIndex: 2 },
  frame: {
    width: FRAME,
    backgroundColor: COLORS.paper,
    paddingTop: 7,
    paddingHorizontal: 7,
    shadowColor: '#3C280A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  photoBox: { width: PHOTO, height: PHOTO, overflow: 'hidden', backgroundColor: '#F1E8D6' },
  photo: { width: '100%', height: '100%' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  caption: {
    height: 30,
    lineHeight: 30,
    textAlign: 'center',
    fontFamily: FONTS.handwritten,
    fontSize: 18,
    color: '#3A3226',
  },
});
