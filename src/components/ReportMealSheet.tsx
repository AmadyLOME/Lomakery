import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet from './BottomSheet';
import { Text } from './Text';
import SlotGrid from './SlotGrid';
import { SlotKey } from '../types';
import { DAY_SHORT, parseSlot } from '../utils/weeks';
import { COLORS, SPACING } from '../constants/theme';

interface Props {
  visible: boolean;
  weekId: string;
  dishName: string;
  slot: SlotKey | null;     // repas sauté
  ownSlots: SlotKey[];      // repas déjà prévus pour ce plat (non sélectionnables)
  busySlots: SlotKey[];     // créneaux occupés par d'autres plats (indiqués)
  onReport: (to: SlotKey | null) => void;
  onClose: () => void;
}

export function slotLabel(slot: SlotKey): string {
  const { day, meal } = parseSlot(slot);
  return `${DAY_SHORT[day].toLowerCase()}. ${meal}`;
}

// « Sauté » : reporter le repas sur un autre créneau de la semaine, ou le sauter simplement
export default function ReportMealSheet({ visible, weekId, dishName, slot, ownSlots, busySlots, onReport, onClose }: Props) {
  const [to, setTo] = useState<SlotKey | null>(null);

  useEffect(() => {
    if (visible) setTo(null);
  }, [visible]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <Text style={styles.title}>Reporter ce repas ?</Text>
        <Text style={styles.subtitle}>
          {dishName}{slot ? ` · ${slotLabel(slot)} sauté` : ''}
        </Text>

        <SlotGrid
          weekId={weekId}
          selected={to ? [to] : []}
          onToggle={(s) => setTo((cur) => (cur === s ? null : s))}
          disabled={slot ? [...ownSlots, slot] : ownSlots}
          busy={busySlots}
        />
        <Text style={styles.hint}>Un point indique un créneau où un autre plat est déjà prévu.</Text>

        <TouchableOpacity
          style={[styles.primary, !to && { opacity: 0.4 }]}
          disabled={!to}
          onPress={() => onReport(to)}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>{to ? `Reporter à ${slotLabel(to)}` : 'Choisis un créneau'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => onReport(null)} accessibilityRole="button">
          <Text style={styles.secondaryText}>Sauter sans reporter</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACING.md - 4 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted, marginTop: -6 },
  hint: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  primary: { height: 54, borderRadius: 27, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondary: { height: 48, borderRadius: 24, backgroundColor: COLORS.sand, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
});
