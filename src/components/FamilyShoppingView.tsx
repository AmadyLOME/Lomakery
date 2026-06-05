import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { ShoppingItem, ShoppingGroup } from '../types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';

interface Props {
  items: ShoppingItem[];
  groups: ShoppingGroup[];
  onToggle: (itemId: string, checked: boolean) => void;
  onCheckWithStock: (itemId: string, addedQty: number, currentStock: number, threshold: number) => void;
  onDecrement: (item: ShoppingItem) => void;
  onIncrement: (item: ShoppingItem) => void;
}

type ActiveView = 'acheter' | 'dispo';

export default function FamilyShoppingView({ items, groups, onToggle, onCheckWithStock, onDecrement, onIncrement }: Props) {
  const [activeView, setActiveView] = useState<ActiveView>('acheter');

  const aAcheter = items.filter((i) => !i.checked);
  const disponible = items.filter((i) => i.checked);

  const displayed = activeView === 'acheter' ? aAcheter : disponible;

  const grouped = groups
    .map((g) => ({ group: g, groupItems: displayed.filter((i) => i.groupId === g.id) }))
    .filter((s) => s.groupItems.length > 0);

  const ungrouped = displayed.filter(
    (i) => !i.groupId || !groups.find((g) => g.id === i.groupId)
  );

  function handleCheckboxPress(item: ShoppingItem) {
    const hasThreshold = item.threshold !== undefined;
    // Passage À acheter → À la casa avec seuil : demander la quantité achetée
    if (!item.checked && hasThreshold) {
      Alert.prompt(
        `${item.name}`,
        `Combien en avez-vous acheté ?${item.unit ? ` (${item.unit})` : ''}\nStock actuel : ${item.stock ?? 0} · Seuil : ${item.threshold}`,
        (input) => {
          const qty = parseInt(input, 10);
          if (!isNaN(qty) && qty > 0) {
            onCheckWithStock(item.id, qty, item.stock ?? 0, item.threshold!);
          }
        },
        'plain-text',
        String(item.stock ?? 0),
        'numeric'
      );
    } else {
      onToggle(item.id, !item.checked);
    }
  }

  function renderItem(item: ShoppingItem) {
    const hasStock = item.stock !== undefined && item.threshold !== undefined;
    const isLow = hasStock && item.stock! <= item.threshold!;

    return (
      <View key={item.id} style={styles.itemRow}>
        <TouchableOpacity
          style={[styles.checkbox, item.checked && styles.checkboxChecked]}
          onPress={() => handleCheckboxPress(item)}
        >
          {item.checked && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
            {item.name}
          </Text>
          {hasStock && (
            <Text style={[styles.stockInfo, isLow && styles.stockLow]}>
              Stock : {item.stock}{item.unit ? ' ' + item.unit : ''}
              {' '}· seuil : {item.threshold}
              {isLow ? '  ⚠️' : ''}
            </Text>
          )}
        </View>

        {item.checked && hasStock ? (
          <View style={styles.stockControls}>
            <TouchableOpacity style={styles.stockBtn} onPress={() => onDecrement(item)}>
              <Text style={styles.stockBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stockValue}>{item.stock}</Text>
            <TouchableOpacity style={styles.stockBtn} onPress={() => onIncrement(item)}>
              <Text style={styles.stockBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.moveHint}>
            {item.checked ? '→ À acheter' : '→ Dispo'}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toggle À acheter / Disponible */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, activeView === 'acheter' && styles.toggleBtnActive]}
          onPress={() => setActiveView('acheter')}
        >
          <Text style={[styles.toggleText, activeView === 'acheter' && styles.toggleTextActive]}>
            🛒 À acheter
          </Text>
          {aAcheter.length > 0 && (
            <View style={[styles.badge, activeView === 'acheter' ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={[styles.badgeText, activeView === 'acheter' && styles.badgeTextActive]}>
                {aAcheter.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, activeView === 'dispo' && styles.toggleBtnDispoActive]}
          onPress={() => setActiveView('dispo')}
        >
          <Text style={[styles.toggleText, activeView === 'dispo' && styles.toggleTextDispoActive]}>
            🏠 À la casa
          </Text>
          {disponible.length > 0 && (
            <View style={[styles.badge, activeView === 'dispo' ? styles.badgeDispoActive : styles.badgeInactive]}>
              <Text style={[styles.badgeText, activeView === 'dispo' && styles.badgeTextActive]}>
                {disponible.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingTop: SPACING.md }}>
        {grouped.length === 0 && ungrouped.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>
              {activeView === 'acheter' ? '🎉' : '🏠'}
            </Text>
            <Text style={styles.emptyText}>
              {activeView === 'acheter' ? 'Rien à acheter !' : 'Rien à la casa'}
            </Text>
          </View>
        ) : (
          <>
            {grouped.map(({ group, groupItems }) => (
              <View key={group.id} style={styles.card}>
                <Text style={styles.groupName}>📦 {group.name}</Text>
                {groupItems.map(renderItem)}
              </View>
            ))}
            {ungrouped.length > 0 && (
              <View style={styles.card}>
                {ungrouped.map(renderItem)}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  toggleRow: {
    flexDirection: 'row',
    margin: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.xs,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  toggleBtnDispoActive: {
    backgroundColor: COLORS.green,
  },
  toggleText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  toggleTextActive: { color: '#fff' },
  toggleTextDispoActive: { color: '#fff' },

  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  badgeDispoActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  badgeInactive: { backgroundColor: COLORS.border },
  badgeText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  badgeTextActive: { color: '#fff' },

  card: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  groupName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.mustard,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surfaceWarm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  itemName: { fontSize: FONT_SIZE.lg, color: COLORS.text },
  itemNameChecked: { color: COLORS.textSecondary },
  stockInfo: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  stockLow: { color: COLORS.danger, fontWeight: '600' },
  moveHint: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginLeft: SPACING.xs },
  stockControls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  stockBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.mustard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  stockValue: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, minWidth: 28, textAlign: 'center' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.lg, color: COLORS.textSecondary },
});
