import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/theme';
import { useStyles } from '../theme/ThemeProvider';

interface RoundButtonProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string; // lu par VoiceOver
  onPress: () => void;
  variant?: 'primary' | 'surface';
  size?: number;
  busy?: boolean;
}

// Bouton rond à icône (44 px minimum pour le doigt)
export default function RoundButton({ icon, label, onPress, variant = 'surface', size = 44, busy }: RoundButtonProps) {
  const styles = useStyles(makeStyles);
  const primary = variant === 'primary';
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={busy}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        primary ? styles.primary : styles.surface,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={primary ? '#fff' : COLORS.text} />
      ) : (
        <Ionicons name={icon} size={size * 0.48} color={primary ? '#fff' : COLORS.text} />
      )}
    </TouchableOpacity>
  );
}

const makeStyles = () => StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  surface: { backgroundColor: COLORS.surface, ...SHADOWS.soft },
  primary: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
});
