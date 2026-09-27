import React, { useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, Modal, Alert, SectionList } from 'react-native';
import { Text, TextInput } from './Text';
import { ShoppingItem, ShoppingGroup } from '../types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';

interface Props {
  items: ShoppingItem[];
  groups: ShoppingGroup[];
  onAddItem: (item: Omit<ShoppingItem, 'id' | 'createdAt'>, groupId: string) => void;
  onToggle: (itemId: string, checked: boolean) => void;
  onDelete: (itemId: string) => void;
  onClearChecked: () => void;
  onAddGroup: (name: string) => void;
  onDeleteGroup: (groupId: string) => void;
  currentUserId: string;
}

export default function GroupedFamilyList({
  items, groups, onAddItem, onToggle, onDelete,
  onClearChecked, onAddGroup, onDeleteGroup, currentUserId,
}: Props) {
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [newGroupName, setNewGroupName] = useState('');

  const checkedCount = items.filter((i) => i.checked).length;

  const sections = groups.map((group) => ({
    group,
    data: items.filter((i) => i.groupId === group.id),
  })).filter((s) => s.data.length > 0 || true);

  const ungrouped = items.filter((i) => !i.groupId || !groups.find((g) => g.id === i.groupId));

  function openAddItem(groupId: string) {
    setSelectedGroupId(groupId);
    setItemName('');
    setQuantity('1');
    setUnit('');
    setItemModalVisible(true);
  }

  function handleAddItem() {
    if (!itemName.trim()) return;
    onAddItem(
      {
        name: itemName.trim(),
        category: 'autre',
        quantity: parseInt(quantity) || 1,
        unit: unit.trim(),
        checked: false,
        addedBy: currentUserId,
        groupId: selectedGroupId,
      },
      selectedGroupId
    );
    setItemModalVisible(false);
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

  function renderItem(item: ShoppingItem) {
    return (
      <View style={styles.itemRow}>
        <TouchableOpacity
          style={[styles.checkbox, item.checked && styles.checkboxChecked]}
          onPress={() => onToggle(item.id, !item.checked)}
        >
          {item.checked && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
        <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
          {item.quantity > 1 ? `${item.quantity}${item.unit ? ' ' + item.unit : 'x'} ` : ''}
          {item.name}
        </Text>
        <TouchableOpacity
          onPress={() =>
            Alert.alert('Supprimer', `Supprimer "${item.name}" ?`, [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Supprimer', style: 'destructive', onPress: () => onDelete(item.id) },
            ])
          }
        >
          <Text style={styles.deleteBtn}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {checkedCount > 0 && (
        <TouchableOpacity style={styles.clearBtn} onPress={onClearChecked}>
          <Text style={styles.clearBtnText}>
            Supprimer les articles cochés ({checkedCount})
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          ungrouped.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>🛒 Sans groupe</Text>
              {ungrouped.map(renderItem)}
            </View>
          ) : null
        }
        ListEmptyComponent={
          items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>La liste est vide 🎉</Text>
              <Text style={styles.emptySubtext}>
                Créez un groupe puis ajoutez des articles
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item: group }) => {
          const groupItems = items.filter((i) => i.groupId === group.id);
          return (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>📦 {group.name}</Text>
                <View style={styles.sectionActions}>
                  <TouchableOpacity
                    style={styles.addItemBtn}
                    onPress={() => openAddItem(group.id)}
                  >
                    <Text style={styles.addItemBtnText}>+ Article</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDeleteGroup(group)}>
                    <Text style={styles.deleteGroupBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {groupItems.length === 0 ? (
                <Text style={styles.emptyGroup}>Aucun article</Text>
              ) : (
                groupItems.map(renderItem)
              )}
            </View>
          );
        }}
      />

      {/* FAB principal */}
      <TouchableOpacity style={styles.fab} onPress={() => setGroupModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal ajout groupe */}
      <Modal visible={groupModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
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
        </View>
      </Modal>

      {/* Modal ajout article */}
      <Modal visible={itemModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              Ajouter un article
            </Text>
            <Text style={styles.groupLabel}>
              {groups.find((g) => g.id === selectedGroupId)?.name ?? ''}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nom de l'article"
              value={itemName}
              onChangeText={setItemName}
              autoFocus
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: SPACING.sm }]}
                placeholder="Qté"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.input, { flex: 2 }]}
                placeholder="Unité (kg, L…)"
                value={unit}
                onChangeText={setUnit}
              />
            </View>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setItemModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.addButton]} onPress={handleAddItem}>
                <Text style={styles.addButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  clearBtn: {
    margin: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: '#FFF3CD',
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  clearBtnText: { color: '#856404', fontSize: FONT_SIZE.sm },
  section: { marginBottom: SPACING.xs },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  sectionHeader: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  addItemBtn: {
    backgroundColor: COLORS.primary,
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
  checkboxChecked: { backgroundColor: COLORS.primary },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  itemName: { flex: 1, fontSize: FONT_SIZE.lg, color: COLORS.text },
  itemNameChecked: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  deleteBtn: { color: COLORS.textSecondary, fontSize: FONT_SIZE.lg, paddingLeft: SPACING.sm },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: FONT_SIZE.xl, marginBottom: SPACING.xs },
  emptySubtext: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, textAlign: 'center' },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  groupLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
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
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addButton: { backgroundColor: COLORS.primary },
  cancelButtonText: { color: COLORS.text, fontSize: FONT_SIZE.lg },
  addButtonText: { color: '#fff', fontSize: FONT_SIZE.lg, fontWeight: '600' },
});
