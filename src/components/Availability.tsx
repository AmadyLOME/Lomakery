import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { COLORS, BORDER_RADIUS } from '../constants/theme';

// Disponibilité d'un ingrédient par rapport à la liste de courses.
// Chaque état a sa couleur ET sa forme (coche, caddie, point d'exclamation) : lisible sans les couleurs.
export type Availability = 'available' | 'toBuy' | 'missing';

export const AVAILABILITY: Record<Availability, {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  fg: string;
  bg: string;
  solid: boolean;
}> = {
  available: { label: 'À la casa', icon: 'checkmark', fg: '#FFFFFF', bg: COLORS.green, solid: true },
  toBuy: { label: 'À acheter', icon: 'cart', fg: COLORS.primary, bg: '#F9E2D3', solid: false },
  missing: { label: 'Absent de la liste', icon: 'alert', fg: COLORS.dangerText, bg: COLORS.dangerSoft, solid: false },
};

export function AvailabilityIcon({ status, size = 26 }: { status: Availability; size?: number }) {
  const a = AVAILABILITY[status];
  return (
    <View
      style={[styles.icon, { width: size, height: size, borderRadius: size / 2, backgroundColor: a.bg }]}
      accessible
      accessibilityLabel={a.label}
    >
      <Ionicons name={a.icon} size={size * 0.58} color={a.fg} />
    </View>
  );
}

// Pastille compacte avec compteur (listes et carrousel de recettes)
export function AvailabilityBadge({ status, count, label }: { status: Availability; count?: number; label?: string }) {
  const a = AVAILABILITY[status];
  const text = label ?? `${count ?? ''}`;
  return (
    <View
      style={[styles.badge, { backgroundColor: a.solid ? '#E2EBE4' : a.bg }]}
      accessible
      accessibilityLabel={label ?? `${count} ${a.label.toLowerCase()}`}
    >
      <Ionicons name={a.icon} size={13} color={a.solid ? COLORS.green : a.fg} />
      <Text style={[styles.badgeText, { color: a.solid ? COLORS.green : a.fg }]}>{text}</Text>
    </View>
  );
}

export function AvailabilityLegend() {
  return (
    <View style={styles.legend}>
      {(Object.keys(AVAILABILITY) as Availability[]).map((s) => (
        <View key={s} style={styles.legendItem}>
          <AvailabilityIcon status={s} size={18} />
          <Text style={styles.legendText}>{AVAILABILITY[s].label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 13, fontWeight: '800' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
});
