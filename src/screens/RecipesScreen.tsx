import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { subscribeToRecipes, addRecipe, deleteRecipe, updateRecipeIngredients } from '../services/recipes';
import { subscribeToFamilyList, subscribeToFamilyGroups } from '../services/lists';
import { Recipe, RecipeIngredient, ShoppingItem, ShoppingGroup } from '../types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { scale, moderateScale } from '../utils/responsive';

type IngredientStatus = 'available' | 'missing' | 'unknown';

function getIngredientStatus(name: string, familyItems: ShoppingItem[]): IngredientStatus {
  const match = familyItems.find(
    (i) => i.name.toLowerCase().trim() === name.toLowerCase().trim()
  );
  if (!match) return 'missing';
  return match.checked ? 'available' : 'unknown';
}

// ─── Vue picker ingrédient (inline, pas de Modal) ────────────────────────────

interface IngredientPickerViewProps {
  familyItems: ShoppingItem[];
  familyGroups: ShoppingGroup[];
  existingIngredients: RecipeIngredient[];
  onSelect: (name: string, qty: string) => void;
  onClose: () => void;
}

function IngredientPickerView({
  familyItems,
  familyGroups,
  existingIngredients,
  onSelect,
  onClose,
}: IngredientPickerViewProps) {
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const [qty, setQty] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(id: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const existingNames = existingIngredients.map((i) => i.name.toLowerCase().trim());

  const filtered = familyItems.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) &&
      !existingNames.includes(item.name.toLowerCase().trim())
  );

  const noResults = search.trim().length > 0 && filtered.length === 0;

  // Grouper les articles filtrés
  const grouped: { group: ShoppingGroup | null; items: ShoppingItem[] }[] = [];
  familyGroups.forEach((g) => {
    const groupItems = filtered.filter((i) => i.groupId === g.id);
    if (groupItems.length > 0) grouped.push({ group: g, items: groupItems });
  });
  const ungrouped = filtered.filter((i) => !i.groupId);
  if (ungrouped.length > 0) grouped.push({ group: null, items: ungrouped });

  const goToSettings = () => {
    onClose();
    navigation.navigate('FamilyList', { initialTab: 'parametrage' });
  };

  const renderItem = (item: ShoppingItem) => {
    const status = getIngredientStatus(item.name, familyItems);
    const color =
      status === 'available' ? COLORS.green :
      status === 'missing' ? COLORS.danger :
      COLORS.textSecondary;
    const icon =
      status === 'available' ? '🟢' :
      status === 'missing' ? '🔴' : '⚪';

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.suggestionRow}
        onPress={() => onSelect(item.name, qty)}
      >
        <Text style={styles.statusIcon}>{icon}</Text>
        <Text style={[styles.suggestionName, { color }]}>{item.name}</Text>
        {item.unit ? <Text style={styles.suggestionUnit}>{item.unit}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.pickerContainer}>
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Ajouter un ingrédient</Text>
        <View style={{ width: scale(80) }} />
      </View>

      <View style={styles.pickerQtyRow}>
        <Text style={styles.pickerQtyLabel}>Quantité :</Text>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="ex: 200g, 2, 1 pincée"
          placeholderTextColor={COLORS.textSecondary}
          value={qty}
          onChangeText={setQty}
        />
      </View>

      <View style={styles.pickerSearchRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Rechercher un article…"
          placeholderTextColor={COLORS.textSecondary}
          value={search}
          onChangeText={setSearch}
          autoFocus
        />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
        {noResults && (
          <Text style={styles.pickerHint}>Aucun article trouvé pour « {search.trim()} »</Text>
        )}

        {grouped.map(({ group, items }) => {
          const groupId = group?.id ?? '__ungrouped';
          const isCollapsed = collapsedGroups.has(groupId);
          return (
            <View key={groupId}>
              {group && (
                <TouchableOpacity
                  style={styles.pickerGroupHeaderRow}
                  onPress={() => toggleGroup(groupId)}
                >
                  <Text style={styles.pickerGroupChevron}>{isCollapsed ? '▶' : '▼'}</Text>
                  <Text style={styles.pickerGroupHeader}>📦 {group.name}</Text>
                  <Text style={styles.pickerGroupCount}>{items.length}</Text>
                </TouchableOpacity>
              )}
              {!isCollapsed && items.map(renderItem)}
            </View>
          );
        })}

        {/* Bouton Paramétrage — toujours visible en bas */}
        <TouchableOpacity style={styles.goToSettingsBtn} onPress={goToSettings}>
          <Text style={styles.goToSettingsBtnText}>⚙️ Ajouter un article dans Paramétrage</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Modal : détail d'une recette ────────────────────────────────────────────

interface RecipeDetailModalProps {
  recipe: Recipe;
  familyItems: ShoppingItem[];
  familyGroups: ShoppingGroup[];
  householdId: string;
  userId: string;
  onClose: () => void;
}

function RecipeDetailModal({ recipe, familyItems, familyGroups, householdId, userId, onClose }: RecipeDetailModalProps) {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(recipe.ingredients || []);
  const [showPicker, setShowPicker] = useState(false);

  // Sync quand la recette change (temps réel)
  useEffect(() => {
    setIngredients(recipe.ingredients || []);
  }, [recipe.ingredients]);

  const handleIngredientSelected = async (name: string, qty: string) => {
    setShowPicker(false);
    const newIng: RecipeIngredient = {
      id: Date.now().toString(),
      name,
      quantity: qty.trim() || undefined,
    };
    const updated = [...ingredients, newIng];
    setIngredients(updated);
    await updateRecipeIngredients(householdId, recipe.id, updated);
  };

  const removeIngredient = async (id: string) => {
    const updated = ingredients.filter((i) => i.id !== id);
    setIngredients(updated);
    await updateRecipeIngredients(householdId, recipe.id, updated);
  };

  const editIngredientQty = (ing: RecipeIngredient) => {
    Alert.prompt(
      ing.name,
      'Modifier la quantité',
      async (newQty) => {
        const updated = ingredients.map((i) =>
          i.id === ing.id ? { ...i, quantity: newQty.trim() || undefined } : i
        );
        setIngredients(updated);
        await updateRecipeIngredients(householdId, recipe.id, updated);
      },
      'plain-text',
      ing.quantity ?? ''
    );
  };

  const statusColor = (status: IngredientStatus) => {
    if (status === 'available') return COLORS.green;
    if (status === 'missing') return COLORS.danger;
    return COLORS.textSecondary;
  };

  const statusIcon = (status: IngredientStatus) => {
    if (status === 'available') return '🟢';
    if (status === 'missing') return '🔴';
    return '⚪';
  };

  return (
    <Modal visible animationType="slide" onRequestClose={showPicker ? () => setShowPicker(false) : onClose}>
      <SafeAreaView style={styles.modalContainer}>
        {showPicker ? (
          // Vue picker inline — pas de second Modal
          <IngredientPickerView
            familyItems={familyItems}
            familyGroups={familyGroups}
            existingIngredients={ingredients}
            onSelect={handleIngredientSelected}
            onClose={() => setShowPicker(false)}
          />
        ) : (
          // Vue détail recette
          <>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← Retour</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle} numberOfLines={1}>{recipe.name}</Text>
              <View style={{ width: scale(80) }} />
            </View>

            {recipe.description ? (
              <Text style={styles.recipeDescription}>{recipe.description}</Text>
            ) : null}

            <View style={styles.legend}>
              <Text style={styles.legendText}>🟢 À la casa</Text>
              <Text style={styles.legendText}>🔴 Absent → courses</Text>
              <Text style={styles.legendText}>⚪ En liste</Text>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
              {ingredients.length === 0 && (
                <Text style={styles.emptyText}>Aucun ingrédient. Appuie sur + pour en ajouter.</Text>
              )}
              {ingredients.map((ing) => {
                const status = getIngredientStatus(ing.name, familyItems);
                return (
                  <TouchableOpacity
                    key={ing.id}
                    style={styles.ingredientRow}
                    onPress={() => editIngredientQty(ing)}
                  >
                    <Text style={styles.statusIcon}>{statusIcon(status)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.ingredientName, { color: statusColor(status) }]}>
                        {ing.name}
                      </Text>
                      {ing.quantity ? (
                        <Text style={styles.ingredientQty}>{ing.quantity}</Text>
                      ) : (
                        <Text style={styles.ingredientQtyEmpty}>Ajouter une quantité…</Text>
                      )}
                    </View>
                    <Text style={styles.editQtyHint}>✏️</Text>
                    <TouchableOpacity onPress={() => removeIngredient(ing.id)} style={styles.deleteIngBtn}>
                      <Text style={styles.deleteIngBtnText}>✕</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.addIngredientBox}>
              <TouchableOpacity style={styles.addIngBtn} onPress={() => setShowPicker(true)}>
                <Text style={styles.addIngBtnText}>+</Text>
              </TouchableOpacity>
              <Text style={styles.addIngHint}>Ajouter un ingrédient</Text>
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function RecipesScreen() {
  const { user, profile } = useAuth();
  const householdId = profile?.householdId ?? '';

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [familyItems, setFamilyItems] = useState<ShoppingItem[]>([]);
  const [familyGroups, setFamilyGroups] = useState<ShoppingGroup[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    if (!householdId) return;
    const unsub1 = subscribeToRecipes(householdId, setRecipes);
    const unsub2 = subscribeToFamilyList(householdId, setFamilyItems);
    const unsub3 = subscribeToFamilyGroups(householdId, setFamilyGroups);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [householdId]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || !user) return;
    await addRecipe(householdId, name, newDesc.trim(), user.uid);
    setNewName('');
    setNewDesc('');
    setShowCreateModal(false);
  };

  const handleDelete = (recipe: Recipe) => {
    Alert.alert('Supprimer', `Supprimer la recette "${recipe.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteRecipe(householdId, recipe.id) },
    ]);
  };

  // Garde le détail modal synchronisé avec Firestore — ferme si la recette est supprimée
  useEffect(() => {
    if (selectedRecipe) {
      const updated = recipes.find((r) => r.id === selectedRecipe.id);
      if (!updated) setSelectedRecipe(null);
      else setSelectedRecipe(updated);
    }
  }, [recipes]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Recettes</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
          <Text style={styles.createBtnText}>+ Nouvelle</Text>
        </TouchableOpacity>
      </View>

      {recipes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🍳</Text>
          <Text style={styles.emptyTitle}>Aucune recette</Text>
          <Text style={styles.emptySubtitle}>Crée ta première recette pour commencer</Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: SPACING.md }}
          renderItem={({ item }) => {
            const total = item.ingredients?.length ?? 0;
            const available = (item.ingredients ?? []).filter(
              (ing) => getIngredientStatus(ing.name, familyItems) === 'available'
            ).length;
            const missing = (item.ingredients ?? []).filter(
              (ing) => getIngredientStatus(ing.name, familyItems) === 'missing'
            ).length;

            return (
              <TouchableOpacity style={styles.recipeCard} onPress={() => setSelectedRecipe(item)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recipeName}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.recipeDesc} numberOfLines={1}>{item.description}</Text>
                  ) : null}
                  {total > 0 && (
                    <View style={styles.recipeBadges}>
                      <Text style={[styles.badge, { backgroundColor: COLORS.green + '22', color: COLORS.green }]}>
                        🟢 {available}
                      </Text>
                      {missing > 0 && (
                        <Text style={[styles.badge, { backgroundColor: COLORS.danger + '22', color: COLORS.danger }]}>
                          🔴 {missing}
                        </Text>
                      )}
                      <Text style={[styles.badge, { backgroundColor: COLORS.border, color: COLORS.textSecondary }]}>
                        {total} ing.
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteRecipeBtn}>
                  <Text style={styles.deleteRecipeBtnText}>🗑</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal création recette */}
      <Modal visible={showCreateModal} animationType="fade" transparent onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.createModal}>
              <Text style={styles.createModalTitle}>Nouvelle recette</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom de la recette *"
                placeholderTextColor={COLORS.textSecondary}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <TextInput
                style={[styles.input, { marginTop: SPACING.sm, height: 72, textAlignVertical: 'top' }]}
                placeholder="Description (optionnel)"
                placeholderTextColor={COLORS.textSecondary}
                value={newDesc}
                onChangeText={setNewDesc}
                multiline
              />
              <View style={styles.createModalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: COLORS.border }]}
                  onPress={() => { setShowCreateModal(false); setNewName(''); setNewDesc(''); }}
                >
                  <Text style={[styles.modalBtnText, { color: COLORS.text }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: COLORS.primary }, !newName.trim() && { opacity: 0.4 }]}
                  onPress={handleCreate}
                  disabled={!newName.trim()}
                >
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Créer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modal détail recette */}
      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          familyItems={familyItems}
          familyGroups={familyGroups}
          householdId={householdId}
          userId={user?.uid ?? ''}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text },
  createBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.md },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyEmoji: { fontSize: moderateScale(56), marginBottom: SPACING.md },
  emptyTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xs },
  emptySubtitle: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, textAlign: 'center' },

  recipeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  recipeName: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  recipeDesc: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  recipeBadges: { flexDirection: 'row', marginTop: SPACING.xs, gap: SPACING.xs },
  badge: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  deleteRecipeBtn: { padding: SPACING.xs },
  deleteRecipeBtnText: { fontSize: 18 },

  // Modal création
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: SPACING.md },
  createModal: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
  createModalTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  createModalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  modalBtn: { flex: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  modalBtnText: { fontWeight: '700', fontSize: FONT_SIZE.md },

  // Modal détail recette
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { width: scale(80) },
  backBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: FONT_SIZE.md },
  modalTitle: { flex: 1, fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text, textAlign: 'center' },

  recipeDescription: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surfaceWarm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  legendText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },

  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusIcon: { fontSize: 18, marginRight: SPACING.sm },
  ingredientName: { fontSize: FONT_SIZE.lg, fontWeight: '600' },
  ingredientQty: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  ingredientQtyEmpty: { fontSize: FONT_SIZE.sm, color: COLORS.border, marginTop: 2, fontStyle: 'italic' },
  editQtyHint: { fontSize: 14, marginRight: SPACING.xs },
  deleteIngBtn: { padding: SPACING.xs },
  deleteIngBtnText: { color: COLORS.textSecondary, fontSize: 16 },

  emptyText: { textAlign: 'center', color: COLORS.textSecondary, padding: SPACING.lg },

  addIngredientBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: SPACING.md,
  },
  addIngBtn: {
    backgroundColor: COLORS.primary,
    width: scale(48),
    height: scale(48),
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIngBtnText: { color: '#fff', fontSize: 28, fontWeight: '700', lineHeight: 32 },
  addIngHint: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },

  // Picker ingrédient
  pickerContainer: { flex: 1 },
  pickerHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    padding: SPACING.md,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  pickerGroupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceWarm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.xs,
  },
  pickerGroupChevron: { fontSize: 11, color: COLORS.textSecondary },
  pickerGroupHeader: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerGroupCount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  goToSettingsBtn: {
    margin: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
  },
  goToSettingsBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: FONT_SIZE.md,
  },
  pickerQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  pickerQtyLabel: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  pickerSearchRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },

  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionName: { flex: 1, fontSize: FONT_SIZE.lg, fontWeight: '600' },
  suggestionUnit: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },

  createSuggestion: {
    margin: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.primary + '15',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  createSuggestionText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.primary },
  createSuggestionSub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },

  alreadyAddedText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    padding: SPACING.md,
    fontStyle: 'italic',
  },

  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
});
