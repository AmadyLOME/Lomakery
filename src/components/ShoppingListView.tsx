import React, { useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { Text, TextInput } from './Text';
import { ShoppingItem, Category } from '../types';
import { CATEGORIES } from '../constants/categories';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';

interface Props {
  items: ShoppingItem[];
  onAdd: (item: Omit<ShoppingItem, 'id' | 'createdAt'>) => void;
  onToggle: (itemId: string, checked: boolean) => void;
  onDelete: (itemId: string) => void;
  onClearChecked: () => void;
  currentUserId: string;
}

const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];

export default function ShoppingListView({
  items, onAdd, onToggle, onDelete, onClearChecked, currentUserId,
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('autre');

  const checkedCount = items.filter((i) => i.checked).length;

  const grouped = CATEGORY_KEYS.reduce<Record<Category, ShoppingItem[]>>((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat);
    return acc;
  }, {} as Record<Category, ShoppingItem[]>);

  function handleAdd() {
    if (!itemName.trim()) return;
    onAdd({
      name: itemName.trim(),
      category: selectedCategory,
      quantity: parseInt(quantity) || 1,
      unit: unit.trim(),
      checked: false,
      addedBy: currentUserId,
    });
    setItemName('');
    setQuantity('1');
    setUnit('');
    setSelectedCategory('autre');
    setModalVisible(false);
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
        data={CATEGORY_KEYS.filter((cat) => grouped[cat].length > 0)}
        keyExtractor={(cat) => cat}
        renderItem={({ item: cat }) => (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>
              {CATEGORIES[cat].emoji} {CATEGORIES[cat].label}
            </Text>
            {grouped[cat].map((item) => (
              <View key={item.id} style={styles.itemRow}>
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
                  onPress={() => Alert.alert(
                    'Supprimer',
                    `Supprimer "${item.name}" ?`,
                    [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Supprimer', style: 'destructive', onPress: () => onDelete(item.id) },
                    ]
                  )}
                >
                  <Text style={styles.deleteBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>La liste est vide 🎉</Text>
            <Text style={styles.emptySubtext}>Appuyez sur + pour ajouter un article</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Ajouter un article</Text>

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

            <Text style={styles.label}>Catégorie</Text>
            <FlatList
              data={CATEGORY_KEYS}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(k) => k}
              style={{ marginBottom: SPACING.md }}
              renderItem={({ item: cat }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat && { backgroundColor: CATEGORIES[cat].color },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    selectedCategory === cat && { color: '#fff' },
                  ]}>
                    {CATEGORIES[cat].emoji} {CATEGORIES[cat].label}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.addButton]} onPress={handleAdd}>
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
  section: { marginBottom: SPACING.sm },
  sectionHeader: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.background,
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
  modalTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
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
  label: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  categoryChipText: { fontSize: FONT_SIZE.sm, color: COLORS.text },
  row: { flexDirection: 'row' },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  cancelButton: { backgroundColor: COLORS.background, marginRight: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  addButton: { backgroundColor: COLORS.primary },
  cancelButtonText: { color: COLORS.text, fontSize: FONT_SIZE.lg },
  addButtonText: { color: '#fff', fontSize: FONT_SIZE.lg, fontWeight: '600' },
});
