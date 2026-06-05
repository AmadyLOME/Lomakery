import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput,
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
  const [search, setSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const aAcheter = items.filter((i) => !i.checked);
  const disponible = items.filter((i) => i.checked);
  const displayed = activeView === 'acheter' ? aAcheter : disponible;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? displayed.filter((i) => i.name.toLowerCase().includes(q)) : displayed;
  }, [displayed, search]);

  const grouped = groups
    .map((g) => ({ group: g, groupItems: filtered.filter((i) => i.groupId === g.id) }))
    .filter((s) => s.groupItems.length > 0);

  const ungrouped = filtered.filter(
    (i) => !i.groupId || !groups.find((g) => g.id === i.groupId)
  );

  function toggleGroup(id: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleCheckboxPress(item: ShoppingItem) {
    const hasThreshold = item.threshold !== undefined;
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

  function renderGroup(groupId: string, label: string, groupItems: ShoppingItem[]) {
    const isCollapsed = collapsedGroups.has(groupId);
    return (
      <View key={groupId} style={styles.card}>
        <TouchableOpacity style={styles.groupHeader} onPress={() => toggleGroup(groupId)}>
          <Text style={styles.groupName}>{label}</Text>
          <Text style={styles.groupChevron}>{isCollapsed ? '▶' : '▼'}</Text>
          <Text style={styles.groupCount}>{groupItems.length}</Text>
        </TouchableOpacity>
        {!isCollapsed && groupItems.map(renderItem)}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toggle À acheter / À la casa */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, activeView === 'acheter' && styles.toggleBtnActive]}
          onPress={() => { setActiveView('acheter'); setSearch(''); }}
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
          onPress={() => { setActiveView('dispo'); setSearch(''); }}
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

      {/* Barre de recherche */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un article…"
          placeholderTextColor={COLORS.textSecondary}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>
              {search ? '🔍' : activeView === 'acheter' ? '🎉' : '🏠'}
            </Text>
            <Text style={styles.emptyText}>
              {search
                ? `Aucun article pour "${search}"`
                : activeView === 'acheter' ? 'Rien à acheter !' : 'Rien à la casa'}
            </Text>
          </View>
        ) : (
          <>
            {grouped.map(({ group, groupItems }) =>
              renderGroup(group.id, `📦 ${group.name}`, groupItems)
            )}
            {ungrouped.length > 0 && renderGroup('__ungrouped', 'Autres', ungrouped)}
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
    marginBottom: SPACING.sm,
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
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleBtnDispoActive: { backgroundColor: COLORS.green },
  toggleText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textSecondary },
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

  searchRow: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },

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
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surfaceWarm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  groupName: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.mustard,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupChevron: { fontSize: 11, color: COLORS.textSecondary, marginRight: SPACING.xs },
  groupCount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
    overflow: 'hidden',
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
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
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
  emptyText: { fontSize: FONT_SIZE.lg, color: COLORS.textSecondary, textAlign: 'center' },
});
