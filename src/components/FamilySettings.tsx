import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { ShoppingItem, ShoppingGroup } from '../types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';

interface Props {
  items: ShoppingItem[];
  groups: ShoppingGroup[];
  onAddItem: (item: Omit<ShoppingItem, 'id' | 'createdAt'>) => Promise<string>;
  onUpdateItem: (id: string, fields: Partial<Pick<ShoppingItem, 'name' | 'unit' | 'groupId' | 'stock' | 'threshold'>>) => void;
  onDeleteItem: (itemId: string) => void;
  onAddGroup: (name: string) => void;
  onUpdateGroup: (groupId: string, name: string) => void;
  onDeleteGroup: (groupId: string) => void;
  currentUserId: string;
}

type ItemModalMode = 'add' | 'edit';

export default function FamilySettings({
  items, groups, onAddItem, onUpdateItem, onDeleteItem, onAddGroup, onUpdateGroup, onDeleteGroup, currentUserId,
}: Props) {
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [itemModalMode, setItemModalMode] = useState<ItemModalMode>('add');
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('');
  const [stock, setStock] = useState('');
  const [threshold, setThreshold] = useState('');
  const [newGroupName, setNewGroupName] = useState('');

  function renameGroup(group: ShoppingGroup) {
    Alert.prompt(
      'Renommer le groupe',
      '',
      (newName) => {
        const trimmed = newName.trim();
        if (trimmed && trimmed !== group.name) {
          onUpdateGroup(group.id, trimmed);
        }
      },
      'plain-text',
      group.name
    );
  }

  function toggleGroup(id: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openAddItem(groupId: string) {
    setItemModalMode('add');
    setEditingItem(null);
    setSelectedGroupId(groupId);
    setItemName('');
    setUnit('');
    setStock('');
    setThreshold('');
    setItemModalVisible(true);
  }

  function openEditItem(item: ShoppingItem) {
    setItemModalMode('edit');
    setEditingItem(item);
    setSelectedGroupId(item.groupId ?? '');
    setItemName(item.name);
    setUnit(item.unit ?? '');
    setStock(item.stock !== undefined ? String(item.stock) : '');
    setThreshold(item.threshold !== undefined ? String(item.threshold) : '');
    setItemModalVisible(true);
  }

  async function handleSaveItem() {
    if (!itemName.trim()) return;
    const stockVal = stock.trim() !== '' ? parseInt(stock) : undefined;
    const thresholdVal = threshold.trim() !== '' ? parseInt(threshold) : undefined;

    try {
      const groupId = selectedGroupId.trim() || undefined;
      if (itemModalMode === 'edit' && editingItem) {
        await onUpdateItem(editingItem.id, {
          name: itemName.trim(),
          unit: unit.trim() || undefined,
          groupId,
          stock: stockVal,
          threshold: thresholdVal,
        });
      } else {
        // Si stock > seuil dès la création → directement À la casa
        const isAvailable =
          stockVal !== undefined && thresholdVal !== undefined
            ? stockVal > thresholdVal
            : false;
        await onAddItem({
          name: itemName.trim(),
          category: 'autre',
          quantity: 1,
          unit: unit.trim() || undefined,
          checked: isAvailable,
          addedBy: currentUserId,
          groupId,
          stock: stockVal,
          threshold: thresholdVal,
        });
      }
      setItemModalVisible(false);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  }

  function handleAddGroup() {
    if (!newGroupName.trim()) return;
    onAddGroup(newGroupName.trim());
    setNewGroupName('');
    setGroupModalVisible(false);
  }

  function confirmDeleteGroup(group: ShoppingGroup) {
    const count = items.filter((i) => i.groupId === group.id).length;
    Alert.alert(
      'Supprimer le groupe',
      `Supprimer "${group.name}"${count > 0 ? ` et ses ${count} article(s)` : ''} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => onDeleteGroup(group.id) },
      ]
    );
  }

  function confirmDeleteItem(item: ShoppingItem) {
    Alert.alert('Supprimer', `Supprimer "${item.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => onDeleteItem(item.id) },
    ]);
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {groups.map((group) => {
          const groupItems = items.filter((i) => i.groupId === group.id);
          const isCollapsed = collapsedGroups.has(group.id);
          return (
            <View key={group.id} style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeaderRow}
                onPress={() => toggleGroup(group.id)}
                onLongPress={() => renameGroup(group)}
              >
                <Text style={styles.groupChevron}>{isCollapsed ? '▶' : '▼'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionHeader}>📦 {group.name}</Text>
                  <Text style={styles.renameHint}>Appui long pour renommer</Text>
                </View>
                <Text style={styles.groupItemCount}>{groupItems.length}</Text>
                <View style={styles.sectionActions}>
                  <TouchableOpacity style={styles.addItemBtn} onPress={() => openAddItem(group.id)}>
                    <Text style={styles.addItemBtnText}>+ Article</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDeleteGroup(group)}>
                    <Text style={styles.deleteGroupBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
              {!isCollapsed && (
                groupItems.length === 0 ? (
                  <Text style={styles.emptyGroup}>Aucun article</Text>
                ) : (
                  groupItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.itemRow}
                      onPress={() => openEditItem(item)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>
                          {item.name}{item.unit ? ` (${item.unit})` : ''}
                        </Text>
                        {item.threshold !== undefined && (
                          <Text style={styles.itemMeta}>
                            Seuil : {item.threshold}{item.unit ? ' ' + item.unit : ''}
                            {item.stock !== undefined ? `  •  Stock : ${item.stock}` : ''}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.editHint}>✏️</Text>
                      <TouchableOpacity onPress={() => confirmDeleteItem(item)} style={styles.deleteBtnWrap}>
                        <Text style={styles.deleteBtn}>✕</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )
              )}
            </View>
          );
        })}

        {groups.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun groupe</Text>
            <Text style={styles.emptySubtext}>Appuyez sur + pour créer un groupe</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setGroupModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal nouveau groupe */}
      <Modal visible={groupModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Nouveau groupe</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Poissonnerie, Boucherie…"
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoFocus
            />
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setGroupModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.addButton]} onPress={handleAddGroup}>
                <Text style={styles.addButtonText}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal ajouter / modifier article */}
      <Modal visible={itemModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {itemModalMode === 'edit' ? 'Modifier l\'article' : 'Ajouter un article'}
            </Text>

            {/* Sélecteur de groupe */}
            <Text style={styles.fieldLabel}>Groupe</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupChipsRow}>
              <TouchableOpacity
                style={[styles.groupChip, !selectedGroupId && styles.groupChipActive]}
                onPress={() => setSelectedGroupId('')}
              >
                <Text style={[styles.groupChipText, !selectedGroupId && styles.groupChipTextActive]}>
                  Aucun
                </Text>
              </TouchableOpacity>
              {groups.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.groupChip, selectedGroupId === g.id && styles.groupChipActive]}
                  onPress={() => setSelectedGroupId(g.id)}
                >
                  <Text style={[styles.groupChipText, selectedGroupId === g.id && styles.groupChipTextActive]}>
                    {g.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Nom *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom de l'article"
              value={itemName}
              onChangeText={setItemName}
              autoFocus={itemModalMode === 'add'}
            />

            <Text style={styles.fieldLabel}>Unité</Text>
            <TextInput
              style={styles.input}
              placeholder="kg, L, pièces…"
              value={unit}
              onChangeText={setUnit}
            />

            <Text style={styles.fieldLabel}>Stock & seuil</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: SPACING.sm }]}
                placeholder="Stock actuel"
                value={stock}
                onChangeText={setStock}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Seuil alerte"
                value={threshold}
                onChangeText={setThreshold}
                keyboardType="number-pad"
              />
            </View>
            <Text style={styles.hint}>
              Ex : stock = 4, seuil = 2 → bascule dans "À acheter" quand il en reste 2
            </Text>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setItemModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.addButton]} onPress={handleSaveItem}>
                <Text style={styles.addButtonText}>
                  {itemModalMode === 'edit' ? 'Enregistrer' : 'Ajouter'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  section: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    backgroundColor: COLORS.surfaceWarm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionHeader: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  renameHint: { fontSize: 10, color: COLORS.border, marginTop: 1 },
  groupChevron: { fontSize: 11, color: COLORS.textSecondary, marginRight: SPACING.xs },
  groupItemCount: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
    overflow: 'hidden',
    marginRight: SPACING.sm,
  },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  addItemBtn: {
    backgroundColor: COLORS.mustard,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  addItemBtnText: { color: '#fff', fontSize: FONT_SIZE.sm, fontWeight: '600' },
  deleteGroupBtn: { color: COLORS.textSecondary, fontSize: FONT_SIZE.lg, paddingLeft: SPACING.xs },
  emptyGroup: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    fontStyle: 'italic',
    backgroundColor: COLORS.surface,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemName: { fontSize: FONT_SIZE.lg, color: COLORS.text },
  itemMeta: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  editHint: { fontSize: FONT_SIZE.md, marginRight: SPACING.sm },
  deleteBtnWrap: { paddingLeft: SPACING.sm },
  deleteBtn: { color: COLORS.textSecondary, fontSize: FONT_SIZE.lg },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: FONT_SIZE.xl, marginBottom: SPACING.xs },
  emptySubtext: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
  },
  modalTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  fieldLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  groupChipsRow: { marginBottom: SPACING.md },
  groupChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  groupChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  groupChipText: { fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: '600' },
  groupChipTextActive: { color: '#fff' },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZE.lg,
    marginBottom: SPACING.md,
  },
  row: { flexDirection: 'row' },
  button: { flex: 1, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.sm, alignItems: 'center' },
  cancelButton: { backgroundColor: COLORS.background, marginRight: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  addButton: { backgroundColor: COLORS.green },
  cancelButtonText: { color: COLORS.text, fontSize: FONT_SIZE.lg },
  addButtonText: { color: '#fff', fontSize: FONT_SIZE.lg, fontWeight: '600' },
  hint: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.md, fontStyle: 'italic' },
});
