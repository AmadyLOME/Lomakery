import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './Text';
import Segmented from './Segmented';
import CollapseAllButton from './CollapseAllButton';
import UndoToast, { useUndoToast } from './UndoToast';
import { normalizeName, findItem } from '../utils/ingredients';
import { useCollapsedGroups } from '../hooks/useCollapsedGroups';
import { ShoppingItem, ShoppingGroup } from '../types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS, TAB_BAR_SPACE } from '../constants/theme';
import { scale, moderateScale } from '../utils/responsive';

interface Props {
  items: ShoppingItem[];
  groups: ShoppingGroup[];
  onToggle: (itemId: string, checked: boolean) => void;
  onCheckWithStock: (itemId: string, addedQty: number, currentStock: number, threshold: number) => void;
  onDecrement: (item: ShoppingItem) => void;
  onIncrement: (item: ShoppingItem) => void;
  onQuickCreate: (name: string) => Promise<string>;   // crée un article « À acheter », renvoie son id
  onDelete: (itemId: string) => void;
}

type ActiveView = 'acheter' | 'dispo';

export default function FamilyShoppingView({ items, groups, onToggle, onCheckWithStock, onDecrement, onIncrement, onQuickCreate, onDelete }: Props) {
  const [activeView, setActiveView] = useState<ActiveView>('acheter');
  const [search, setSearch] = useState('');
  const { collapsed: collapsedGroups, toggle: toggleGroup, toggleAll, allCollapsed } = useCollapsedGroups('collapse:courses');
  const { toast, show: showToast, hide: hideToast } = useUndoToast();

  const aAcheter = items.filter((i) => !i.checked);
  const disponible = items.filter((i) => i.checked);
  const displayed = activeView === 'acheter' ? aAcheter : disponible;

  const filtered = useMemo(() => {
    const q = normalizeName(search);
    return q ? displayed.filter((i) => normalizeName(i.name).includes(q)) : displayed;
  }, [displayed, search]);

  // ── Ajout rapide : suggestions pendant la saisie ──────────────────────────
  const query = search.trim();
  const exact = query ? findItem(query, items) : undefined;
  // Articles de l'autre vue qui correspondent (ex. « Lait » à la casa quand on est dans « À acheter »)
  const otherViewMatches = query
    ? items
        .filter((i) => (activeView === 'acheter' ? i.checked : !i.checked))
        .filter((i) => normalizeName(i.name).includes(normalizeName(query)))
        .slice(0, 3)
    : [];

  const toggleWithUndo = (item: ShoppingItem, checked: boolean) => {
    onToggle(item.id, checked);
    showToast(
      checked ? `« ${item.name} » passé à la casa` : `« ${item.name} » remis à acheter`,
      () => onToggle(item.id, !checked)
    );
  };

  const quickCreate = async (name: string) => {
    setSearch('');
    try {
      const id = await onQuickCreate(name);
      showToast(`« ${name} » ajouté à acheter (rayon Autres)`, () => onDelete(id));
    } catch (e: any) {
      Alert.alert('Erreur', "L'article n'a pas pu être ajouté.\n" + (e?.message ?? ''));
    }
  };

  // Touche Entrée : met l'article existant dans la vue affichée, sinon le crée « À acheter »
  const submitQuick = () => {
    if (!query) return;
    if (exact) {
      const wanted = activeView === 'dispo';
      if (exact.checked !== wanted) toggleWithUndo(exact, wanted);
      setSearch('');
    } else {
      quickCreate(query);
    }
  };

  const grouped = groups
    .map((g) => ({ group: g, groupItems: filtered.filter((i) => i.groupId === g.id) }))
    .filter((s) => s.groupItems.length > 0);

  const ungrouped = filtered.filter(
    (i) => !i.groupId || !groups.find((g) => g.id === i.groupId)
  );

  const groupIds = [...grouped.map((g) => g.group.id), ...(ungrouped.length > 0 ? ['__ungrouped'] : [])];
  const searching = search.trim().length > 0;

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
      toggleWithUndo(item, !item.checked);
    }
  }

  function renderItem(item: ShoppingItem) {
    const hasStock = item.stock !== undefined && item.threshold !== undefined;
    const isLow = hasStock && item.stock! <= item.threshold!;

    return (
      <View key={item.id} style={styles.itemRow}>
        <TouchableOpacity
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.checked }}
          accessibilityLabel={item.checked ? `${item.name} : remettre à acheter` : `${item.name} : marquer à la casa`}
          hitSlop={8}
          style={[styles.checkbox, item.checked && styles.checkboxChecked]}
          onPress={() => handleCheckboxPress(item)}
        >
          {item.checked && <Ionicons name="checkmark" size={moderateScale(17)} color="#fff" />}
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.itemName}>{item.name}</Text>
          {hasStock && (
            <View style={[styles.stockChip, isLow && styles.stockChipLow]}>
              <Text style={[styles.stockChipText, isLow && styles.stockChipTextLow]}>
                Stock {item.stock}{item.unit ? ' ' + item.unit : ''} · seuil {item.threshold}
              </Text>
            </View>
          )}
        </View>

        {item.checked && hasStock ? (
          <View style={styles.stockControls}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Retirer un ${item.name}`}
              style={styles.stockBtn}
              onPress={() => onDecrement(item)}
            >
              <Ionicons name="remove" size={18} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.stockValue}>{item.stock}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Ajouter un ${item.name}`}
              style={styles.stockBtn}
              onPress={() => onIncrement(item)}
            >
              <Ionicons name="add" size={18} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  }

  function renderGroup(groupId: string, label: string, groupItems: ShoppingItem[]) {
    // Pendant une recherche, tous les rayons sont ouverts pour ne cacher aucun résultat
    const isCollapsed = !searching && collapsedGroups.has(groupId);
    return (
      <View key={groupId} style={styles.card}>
        <TouchableOpacity
          style={styles.groupHeader}
          onPress={() => toggleGroup(groupId)}
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${groupItems.length} articles, ${isCollapsed ? 'déplier' : 'replier'}`}
        >
          <Text style={styles.groupName}>{label}</Text>
          <View style={styles.groupCount}>
            <Text style={styles.groupCountText}>{groupItems.length}</Text>
          </View>
          <View style={styles.groupChevron}>
            <Ionicons name={isCollapsed ? 'chevron-forward' : 'chevron-down'} size={16} color={COLORS.textSecondary} />
          </View>
        </TouchableOpacity>
        {!isCollapsed && groupItems.map(renderItem)}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sélecteur À acheter / À la casa */}
      <View style={styles.toggleRow}>
        <Segmented
          stretch
          value={activeView}
          onChange={(v) => { setActiveView(v); setSearch(''); }}
          options={[
            { value: 'acheter', label: 'À acheter', count: aAcheter.length, activeColor: COLORS.primary },
            { value: 'dispo', label: 'À la casa', count: disponible.length, activeColor: COLORS.green },
          ]}
        />
      </View>

      {/* Rechercher ou ajouter */}
      <View style={[styles.searchBox, query ? styles.searchBoxActive : null]}>
        <Ionicons name={query ? 'add' : 'search'} size={19} color={query ? COLORS.primary : COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher ou ajouter un article…"
          placeholderTextColor={COLORS.textSecondary}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={submitQuick}
          returnKeyType={exact ? 'done' : 'go'}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>

      {query ? (
        <View style={styles.suggestions}>
          {otherViewMatches.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.suggestion}
              onPress={() => { toggleWithUndo(item, activeView === 'dispo'); setSearch(''); }}
              accessibilityRole="button"
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestionName}>{item.name}</Text>
                <Text style={styles.suggestionMeta}>
                  {(groups.find((g) => g.id === item.groupId)?.name ?? 'Autres')} · {item.checked ? 'à la casa' : 'à acheter'}
                </Text>
              </View>
              <View style={styles.suggestionAction}>
                <Text style={styles.suggestionActionText}>
                  {activeView === 'acheter' ? 'Mettre à acheter' : 'Passer à la casa'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          {!exact && (
            <TouchableOpacity style={styles.suggestion} onPress={() => quickCreate(query)} accessibilityRole="button">
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestionName}>« {query} »</Text>
                <Text style={styles.suggestionMeta}>Nouvel article, ajouté à acheter</Text>
              </View>
              <View style={[styles.suggestionAction, { backgroundColor: COLORS.ink }]}>
                <Text style={[styles.suggestionActionText, { color: '#fff' }]}>+ Créer</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}>
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
            <View style={styles.listToolbar}>
              <Text style={styles.toolbarText}>
                {filtered.length} article{filtered.length > 1 ? 's' : ''} · {groupIds.length} rayon{groupIds.length > 1 ? 's' : ''}
              </Text>
              {!searching && groupIds.length > 1 && (
                <CollapseAllButton allCollapsed={allCollapsed(groupIds)} onPress={() => toggleAll(groupIds)} />
              )}
            </View>
            {grouped.map(({ group, groupItems }) =>
              renderGroup(group.id, group.name, groupItems)
            )}
            {ungrouped.length > 0 && renderGroup('__ungrouped', 'Autres', ungrouped)}
          </>
        )}
      </ScrollView>

      <UndoToast toast={toast} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  toggleRow: { paddingHorizontal: SPACING.lg - 4, paddingBottom: SPACING.sm + 4 },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    marginHorizontal: SPACING.lg - 4,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md + 2,
    minHeight: 46,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.soft,
  },
  searchBoxActive: { borderWidth: 2, borderColor: COLORS.primary },
  suggestions: {
    marginHorizontal: SPACING.lg - 4,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.sm + 3,
    borderTopWidth: 1,
    borderTopColor: COLORS.sand,
  },
  suggestionName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  suggestionMeta: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  suggestionAction: { backgroundColor: '#F9E2D3', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 11, paddingVertical: 6 },
  suggestionActionText: { fontSize: 13, fontWeight: '800', color: COLORS.primaryDark },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: SPACING.sm + 2 },

  listToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 34,
    marginHorizontal: SPACING.lg - 4,
    marginBottom: SPACING.sm + 2,
  },
  toolbarText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  card: {
    marginHorizontal: SPACING.lg - 4,
    marginBottom: SPACING.md - 2,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    paddingVertical: SPACING.xs + 2,
    ...SHADOWS.soft,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md + 2,
    paddingTop: SPACING.sm + 2,
    paddingBottom: SPACING.xs + 2,
  },
  groupName: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.text },
  groupCount: { backgroundColor: COLORS.sand, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 2 },
  groupCountText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  groupChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md - 2,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm + 2,
  },
  checkbox: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    borderWidth: 2.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  itemName: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  stockChip: {
    alignSelf: 'flex-start',
    marginTop: 3,
    backgroundColor: COLORS.sand,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 9,
    paddingVertical: 1,
  },
  stockChipLow: { backgroundColor: COLORS.dangerSoft },
  stockChipText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textMuted },
  stockChipTextLow: { color: COLORS.dangerText },
  stockControls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  stockBtn: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    backgroundColor: COLORS.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockValue: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.text, minWidth: 28, textAlign: 'center' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: moderateScale(48), marginBottom: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' },
});
