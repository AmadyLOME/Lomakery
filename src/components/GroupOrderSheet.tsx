import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import BottomSheet from './BottomSheet';
import { ShoppingGroup } from '../types';
import { COLORS, SPACING } from '../constants/theme';

interface Props {
  visible: boolean;
  groups: ShoppingGroup[];           // dans l'ordre actuel
  onSave: (orderedIds: string[]) => Promise<void>;
  onClose: () => void;
}

// Ordre des rayons dans le magasin, réglé avec des flèches (commun à tout le foyer)
export default function GroupOrderSheet({ visible, groups, onSave, onClose }: Props) {
  const [order, setOrder] = useState<ShoppingGroup[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) setOrder(groups);
  }, [visible]);

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[index], next[j]] = [next[j], next[index]];
    setOrder(next);
  };

  const save = async () => {
    setBusy(true);
    try {
      await onSave(order.map((g) => g.id));
      onClose();
    } catch (e: any) {
      Alert.alert('Erreur', "L'ordre n'a pas pu être enregistré.\n" + (e?.message ?? ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Ordre des rayons</Text>
      <Text style={styles.subtitle}>Dans l'ordre où vous les traversez au magasin. Commun à tout le foyer.</Text>

      {order.map((g, i) => (
        <View key={g.id} style={styles.row}>
          <View style={styles.num}><Text style={styles.numText}>{i + 1}</Text></View>
          <Text style={styles.name} numberOfLines={1}>{g.name}</Text>
          <TouchableOpacity
            style={[styles.arrow, i === 0 && { opacity: 0.3 }]}
            disabled={i === 0}
            onPress={() => move(i, -1)}
            accessibilityRole="button"
            accessibilityLabel={`Monter ${g.name}`}
          >
            <Ionicons name="arrow-up" size={19} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.arrow, i === order.length - 1 && { opacity: 0.3 }]}
            disabled={i === order.length - 1}
            onPress={() => move(i, 1)}
            accessibilityRole="button"
            accessibilityLabel={`Descendre ${g.name}`}
          >
            <Ionicons name="arrow-down" size={19} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      ))}
      <Text style={styles.hint}>Les articles sans rayon (« Autres ») viennent toujours à la fin.</Text>

      <TouchableOpacity style={[styles.save, busy && { opacity: 0.5 }]} disabled={busy} onPress={save} accessibilityRole="button">
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Enregistrer</Text>}
      </TouchableOpacity>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginTop: 2, marginBottom: SPACING.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    minHeight: 56,
    borderTopWidth: 1,
    borderTopColor: COLORS.sand,
  },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.sand, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  name: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.text },
  arrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.sand, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginTop: SPACING.sm },
  save: { height: 54, borderRadius: 27, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.lg },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
