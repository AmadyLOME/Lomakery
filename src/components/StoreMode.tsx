import React, { useState } from 'react';
import { View, Modal, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import GroupOrderSheet from './GroupOrderSheet';
import { ShoppingItem, ShoppingGroup } from '../types';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface Props {
  items: ShoppingItem[];
  groups: ShoppingGroup[];          // déjà dans l'ordre du magasin
  onToggle: (itemId: string, checked: boolean) => void;
  onCheckWithStock: (itemId: string, addedQty: number, currentStock: number, threshold: number) => void;
  onSaveOrder: (orderedIds: string[]) => Promise<void>;
  onClose: () => void;
}

// Mode « En magasin » : seuls les articles à acheter, rayon par rayon dans l'ordre du parcours,
// gros ronds à cocher, écran maintenu allumé. Les articles cochés restent visibles (barrés) jusqu'à la sortie.
export default function StoreMode({ items, groups, onToggle, onCheckWithStock, onSaveOrder, onClose }: Props) {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  // Articles achetés pendant cette visite (ils restent affichés, barrés)
  const [bought, setBought] = useState<Set<string>>(new Set());
  const [reordering, setReordering] = useState(false);

  const list = items.filter((i) => !i.checked || bought.has(i.id));
  const done = list.filter((i) => bought.has(i.id)).length;
  const total = list.length;
  const allDone = total > 0 && done === total;

  const mark = (item: ShoppingItem, on: boolean) =>
    setBought((prev) => {
      const next = new Set(prev);
      on ? next.add(item.id) : next.delete(item.id);
      return next;
    });

  const press = (item: ShoppingItem) => {
    if (bought.has(item.id)) {
      mark(item, false);
      onToggle(item.id, false);
      return;
    }
    if (item.threshold !== undefined) {
      Alert.prompt(
        item.name,
        `Combien en avez-vous pris ?${item.unit ? ` (${item.unit})` : ''}\nStock actuel : ${item.stock ?? 0} · Seuil : ${item.threshold}`,
        (input) => {
          const qty = parseInt(input, 10);
          if (!isNaN(qty) && qty > 0) {
            mark(item, true);
            onCheckWithStock(item.id, qty, item.stock ?? 0, item.threshold!);
          }
        },
        'plain-text',
        '1',
        'number-pad'
      );
      return;
    }
    mark(item, true);
    onToggle(item.id, true);
  };

  const sections = groups
    .map((g) => ({ key: g.id, label: g.name, rows: list.filter((i) => i.groupId === g.id) }))
    .filter((s) => s.rows.length > 0);
  const others = list.filter((i) => !i.groupId || !groups.some((g) => g.id === i.groupId));
  if (others.length > 0) sections.push({ key: '__others', label: 'Autres', rows: others });

  const renderRow = (item: ShoppingItem) => {
    const on = bought.has(item.id);
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.row}
        onPress={() => press(item)}
        activeOpacity={0.7}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on }}
        accessibilityLabel={item.name}
      >
        <View style={[styles.check, on && styles.checkOn]}>
          {on && <Ionicons name="checkmark" size={24} color="#fff" />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, on && styles.nameDone]}>{item.name}</Text>
          {item.threshold !== undefined && !on ? (
            <Text style={styles.stock}>Stock {item.stock ?? 0}{item.unit ? ` ${item.unit}` : ''} · seuil {item.threshold}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top + SPACING.sm }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>EN MAGASIN · ÉCRAN ALLUMÉ</Text>
            <Text style={styles.title}>{allDone ? 'Tout est pris !' : `${done} / ${total}`}</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setReordering(true)} accessibilityRole="button" accessibilityLabel="Ordre des rayons">
            <Ionicons name="swap-vertical" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.finish} onPress={onClose} accessibilityRole="button">
            <Text style={styles.finishText}>Terminer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${total ? (done / total) * 100 : 0}%` }]} />
        </View>

        {total === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🛒</Text>
            <Text style={styles.emptyTitle}>Rien à acheter</Text>
            <Text style={styles.emptyText}>La liste « À acheter » est vide.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xl }}>
            {sections.map((s) => {
              const left = s.rows.filter((i) => !bought.has(i.id)).length;
              return (
                <View key={s.key} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{s.label}</Text>
                    <Text style={[styles.cardCount, left === 0 && { color: COLORS.green }]}>
                      {left === 0 ? '✓ fini' : `${left} à prendre`}
                    </Text>
                  </View>
                  {s.rows.map(renderRow)}
                </View>
              );
            })}
            {allDone && (
              <TouchableOpacity style={styles.doneBtn} onPress={onClose} accessibilityRole="button">
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.doneBtnText}>Courses terminées</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
        {/* Rendue dans ce Modal pour s'afficher par-dessus sur iOS */}
        <GroupOrderSheet visible={reordering} groups={groups} onSave={onSaveOrder} onClose={() => setReordering(false)} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg - 4 },
  kicker: { fontSize: 12, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.8 },
  title: { fontSize: 30, fontWeight: '800', color: COLORS.text },
  headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', ...SHADOWS.soft },
  finish: { height: 44, paddingHorizontal: SPACING.md, borderRadius: 22, backgroundColor: COLORS.ink, justifyContent: 'center' },
  finishText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  progress: {
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.sand,
    marginHorizontal: SPACING.lg - 4,
    marginTop: SPACING.sm + 2,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: COLORS.green },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    marginHorizontal: SPACING.lg - 4,
    marginBottom: SPACING.md - 4,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
    ...SHADOWS.soft,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: SPACING.md - 2, paddingBottom: SPACING.xs },
  cardTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  cardCount: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md - 2, minHeight: 62, borderTopWidth: 1, borderTopColor: COLORS.sand },
  check: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: COLORS.sandDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  name: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  nameDone: { color: COLORS.textSecondary, textDecorationLine: 'line-through' },
  stock: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginTop: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyEmoji: { fontSize: 52, marginBottom: SPACING.sm },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  emptyText: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted, marginTop: 4 },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.green,
    marginHorizontal: SPACING.lg - 4,
    marginTop: SPACING.md,
  },
  doneBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
