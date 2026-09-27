import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { COLORS, SPACING } from '../constants/theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  activeColor?: string; // défaut : pastille blanche
}

interface SegmentedProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  stretch?: boolean; // occupe toute la largeur
}

// Sélecteur en pilule (ex. « À acheter / À la casa », « Liste / Carrousel »)
export default function Segmented<T extends string>({ options, value, onChange, stretch }: SegmentedProps<T>) {
  return (
    <View style={[styles.track, stretch ? styles.trackStretch : styles.trackHug]}>
      {options.map((opt) => {
        const active = opt.value === value;
        const filled = active && !!opt.activeColor;
        const fg = filled ? '#fff' : active ? COLORS.text : COLORS.textMuted;
        return (
          <TouchableOpacity
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              stretch && { flex: 1 },
              active && (filled ? { backgroundColor: opt.activeColor, ...styles.filledShadow } : styles.activeSurface),
            ]}
          >
            {opt.icon ? <Ionicons name={opt.icon} size={16} color={fg} /> : null}
            <Text style={[styles.label, { color: fg }, active && styles.labelActive]}>{opt.label}</Text>
            {opt.count !== undefined && opt.count > 0 ? (
              <View style={[styles.count, { backgroundColor: filled ? 'rgba(255,255,255,0.25)' : COLORS.sandDark }]}>
                <Text style={[styles.countText, { color: fg }]}>{opt.count}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: COLORS.sand, borderRadius: 999, padding: 4 },
  trackStretch: { alignSelf: 'stretch' },
  trackHug: { alignSelf: 'flex-start' },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs + 2,
    minHeight: 40,
    paddingHorizontal: SPACING.md - 2,
    borderRadius: 999,
  },
  activeSurface: {
    backgroundColor: COLORS.surface,
    shadowColor: '#3C280A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  filledShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  label: { fontSize: 15, fontWeight: '700' },
  labelActive: { fontWeight: '800' },
  count: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  countText: { fontSize: 13, fontWeight: '700' },
});
