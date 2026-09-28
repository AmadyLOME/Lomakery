import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import BottomSheet from './BottomSheet';
import { AvailabilityIcon } from './Availability';
import { ShoppingGroup } from '../types';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { useStyles } from '../theme/ThemeProvider';

export interface MissingRow {
  key: string;          // nom normalisé
  name: string;         // nom affiché
  sources: string[];    // recettes qui en ont besoin
}

interface Props {
  visible: boolean;
  rows: MissingRow[];             // ingrédients absents de la liste
  alreadyToBuy: number;           // ingrédients déjà « À acheter » (rien à faire)
  groups: ShoppingGroup[];
  onConfirm: (items: { name: string; groupId?: string }[]) => Promise<void>;
  onClose: () => void;
}

// « Ajouter aux courses » : crée les ingrédients absents de la liste, « À acheter », dans le rayon choisi
export default function MissingToCartSheet({ visible, rows, alreadyToBuy, groups, onConfirm, onClose }: Props) {
  const styles = useStyles(makeStyles);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupOf, setGroupOf] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelected(new Set(rows.map((r) => r.key)));
    setGroupOf({});
  }, [visible]);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const chooseGroup = (row: MissingRow) =>
    Alert.alert(`Rayon pour « ${row.name} »`, undefined, [
      ...groups.map((g) => ({ text: g.name, onPress: () => setGroupOf((m) => ({ ...m, [row.key]: g.id })) })),
      { text: 'Autres (sans rayon)', onPress: () => setGroupOf((m) => ({ ...m, [row.key]: undefined })) },
      { text: 'Annuler', style: 'cancel' as const },
    ]);

  const count = rows.filter((r) => selected.has(r.key)).length;

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm(rows.filter((r) => selected.has(r.key)).map((r) => ({ name: r.name, groupId: groupOf[r.key] })));
    } catch (e: any) {
      Alert.alert('Erreur', "Les articles n'ont pas pu être ajoutés.\n" + (e?.message ?? ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Ajouter aux courses</Text>
          <Text style={styles.subtitle}>
            {rows.length} ingrédient{rows.length > 1 ? 's' : ''} absent{rows.length > 1 ? 's' : ''} de la liste, créé{rows.length > 1 ? 's' : ''} « À acheter »
          </Text>
        </View>
      </View>

      {alreadyToBuy > 0 && (
        <View style={styles.info}>
          <AvailabilityIcon status="toBuy" size={22} />
          <Text style={styles.infoText}>
            {alreadyToBuy} autre{alreadyToBuy > 1 ? 's' : ''} ingrédient{alreadyToBuy > 1 ? 's sont' : ' est'} déjà dans la liste à acheter.
          </Text>
        </View>
      )}

      {rows.map((row) => {
        const on = selected.has(row.key);
        const group = groups.find((g) => g.id === groupOf[row.key]);
        return (
          <View key={row.key} style={styles.row}>
            <TouchableOpacity
              onPress={() => toggle(row.key)}
              style={[styles.check, on && styles.checkOn]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={row.name}
            >
              {on && <Ionicons name="checkmark" size={17} color="#fff" />}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{row.name}</Text>
              <Text style={styles.sources} numberOfLines={1}>{row.sources.join(', ')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.groupChip, !group && styles.groupChipEmpty]}
              onPress={() => chooseGroup(row)}
              accessibilityRole="button"
              accessibilityLabel={`Rayon : ${group?.name ?? 'Autres'}. Changer`}
            >
              <Text style={styles.groupChipText} numberOfLines={1}>{group?.name ?? 'Autres'}</Text>
              <Ionicons name="chevron-down" size={13} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.submit, (count === 0 || busy) && { opacity: 0.4 }]}
        disabled={count === 0 || busy}
        onPress={confirm}
        accessibilityRole="button"
      >
        {busy ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="cart" size={19} color="#fff" />
            <Text style={styles.submitText}>Ajouter {count} article{count > 1 ? 's' : ''}</Text>
          </>
        )}
      </TouchableOpacity>
    </BottomSheet>
  );
}

const makeStyles = () => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginTop: 2 },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: SPACING.sm + 4,
    marginVertical: SPACING.sm,
  },
  infoText: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 4,
    paddingVertical: SPACING.sm + 3,
    borderTopWidth: 1,
    borderTopColor: COLORS.sand,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 2.5,
    borderColor: COLORS.sandDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  name: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  sources: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 130,
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.sand,
  },
  groupChipEmpty: { backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.sandDark },
  groupChipText: { fontSize: 13, fontWeight: '800', color: COLORS.text, flexShrink: 1 },
  submit: {
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
