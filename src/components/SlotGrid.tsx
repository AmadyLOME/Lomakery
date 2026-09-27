import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Meal, SlotKey } from '../types';
import { DAY_SHORT, dateOf, slotKey } from '../utils/weeks';
import { COLORS } from '../constants/theme';

interface SlotGridProps {
  weekId: string;
  selected: SlotKey[];
  onToggle: (slot: SlotKey) => void;
  disabled?: SlotKey[];   // créneaux non sélectionnables (grisés)
  busy?: SlotKey[];       // créneaux déjà pris par un autre plat (point)
}

const MEALS: Meal[] = ['midi', 'soir'];

// Grille 7 jours × midi/soir
export default function SlotGrid({ weekId, selected, onToggle, disabled = [], busy = [] }: SlotGridProps) {
  return (
    <View style={styles.grid}>
      <View style={styles.labels}>
        <View style={styles.head} />
        <Text style={styles.mealLabel}>Midi</Text>
        <Text style={styles.mealLabel}>Soir</Text>
      </View>
      {DAY_SHORT.map((d, day) => (
        <View key={d} style={styles.col}>
          <View style={styles.head}>
            <Text style={styles.day}>{d}</Text>
            <Text style={styles.date}>{dateOf(weekId, day).getDate()}</Text>
          </View>
          {MEALS.map((meal) => {
            const key = slotKey(day, meal);
            const on = selected.includes(key);
            const off = disabled.includes(key);
            return (
              <TouchableOpacity
                key={key}
                onPress={() => onToggle(key)}
                disabled={off}
                style={[styles.cell, on && styles.cellOn, off && styles.cellOff]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on, disabled: off }}
                accessibilityLabel={`${d} ${meal}`}
              >
                {on ? (
                  <Ionicons name="checkmark" size={18} color="#fff" />
                ) : busy.includes(key) && !off ? (
                  <View style={styles.busyDot} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 5 },
  labels: { width: 38, gap: 5 },
  col: { flex: 1, gap: 5 },
  head: { height: 34, alignItems: 'center', justifyContent: 'center' },
  day: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  date: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  mealLabel: { height: 42, lineHeight: 42, fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  cell: { height: 42, borderRadius: 14, backgroundColor: COLORS.sand, alignItems: 'center', justifyContent: 'center' },
  cellOn: { backgroundColor: COLORS.primary },
  cellOff: { opacity: 0.35 },
  busyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textSecondary },
});
