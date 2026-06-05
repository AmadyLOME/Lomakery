import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { subscribeToWeekMenu, addToWeekMenu, removeFromWeekMenu, resetWeekMenu } from '../services/weekMenu';
import { subscribeToRecipes } from '../services/recipes';
import { subscribeToFamilyList } from '../services/lists';
import { Recipe, ShoppingItem } from '../types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';

export default function WeekMenuScreen() {
  const { profile } = useAuth();
  const householdId = profile?.householdId ?? '';

  const [menuIds, setMenuIds] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [familyItems, setFamilyItems] = useState<ShoppingItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    const u1 = subscribeToWeekMenu(householdId, setMenuIds);
    const u2 = subscribeToRecipes(householdId, setRecipes);
    const u3 = subscribeToFamilyList(householdId, setFamilyItems);
    return () => { u1(); u2(); u3(); };
  }, [householdId]);

  const menuRecipes = recipes.filter((r) => menuIds.includes(r.id));
  const availableRecipes = recipes.filter((r) => !menuIds.includes(r.id));

  // Articles "À acheter" dans familyList dont le nom figure dans les ingrédients des recettes sélectionnées
  const allIngredientNames = new Set(
    menuRecipes.flatMap((r) => (r.ingredients ?? []).map((i) => i.name.toLowerCase().trim()))
  );

  const missingItems = familyItems.filter(
    (item) => !item.checked && allIngredientNames.has(item.name.toLowerCase().trim())
  );

  const allReady = menuIds.length > 0 && missingItems.length === 0;

  const handleReset = () => {
    Alert.alert(
      'Refaire le menu',
      'Vider toutes les recettes de la semaine ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Vider', style: 'destructive', onPress: () => resetWeekMenu(householdId) },
      ]
    );
  };

  const handleRemove = (recipeId: string) => {
    removeFromWeekMenu(householdId, menuIds, recipeId);
  };

  const handleAdd = (recipeId: string) => {
    addToWeekMenu(householdId, menuIds, recipeId);
    setShowPicker(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Plat de la semaine</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
          <Text style={styles.resetBtnText}>🔄 Refaire</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ── Recettes du menu ─────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>🍽 Plats sélectionnés</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowPicker(true)}>
              <Text style={styles.addBtnText}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>

          {menuRecipes.length === 0 ? (
            <Text style={styles.emptyText}>Aucun plat sélectionné. Appuie sur + Ajouter.</Text>
          ) : (
            menuRecipes.map((recipe) => (
              <View key={recipe.id} style={styles.recipeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recipeName}>{recipe.name}</Text>
                  {recipe.description ? (
                    <Text style={styles.recipeDesc} numberOfLines={1}>{recipe.description}</Text>
                  ) : null}
                  <Text style={styles.recipeIngCount}>
                    {recipe.ingredients?.length ?? 0} ingrédient(s)
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemove(recipe.id)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* ── Articles manquants ───────────────────────── */}
        {menuIds.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛒 Articles à acheter</Text>

            {allReady ? (
              <View style={styles.allReadyBox}>
                <Text style={styles.allReadyEmoji}>🎉</Text>
                <Text style={styles.allReadyTitle}>Tout est à la casa !</Text>
                <Text style={styles.allReadySubtitle}>
                  Tous les ingrédients sont disponibles pour faire ces plats.
                </Text>
              </View>
            ) : (
              <>
                {missingItems.map((item) => (
                  <View key={item.id} style={styles.missingRow}>
                    <Text style={styles.missingIcon}>🔴</Text>
                    <Text style={styles.missingName}>{item.name}</Text>
                    {item.unit ? <Text style={styles.missingUnit}>{item.unit}</Text> : null}
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal picker de recettes */}
      <Modal visible={showPicker} animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <SafeAreaView style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Retour</Text>
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>Choisir un plat</Text>
            <View style={{ width: 80 }} />
          </View>

          <ScrollView>
            {availableRecipes.length === 0 ? (
              <Text style={styles.emptyText}>
                Toutes vos recettes sont déjà dans le menu.
              </Text>
            ) : (
              availableRecipes.map((recipe) => (
                <TouchableOpacity
                  key={recipe.id}
                  style={styles.pickerRow}
                  onPress={() => handleAdd(recipe.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerRecipeName}>{recipe.name}</Text>
                    {recipe.description ? (
                      <Text style={styles.pickerRecipeDesc} numberOfLines={1}>
                        {recipe.description}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.pickerAddIcon}>＋</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

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
  resetBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  resetBtnText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textSecondary },

  section: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surfaceWarm,
  },
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.sm },

  emptyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    padding: SPACING.md,
    fontStyle: 'italic',
  },

  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recipeName: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  recipeDesc: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  recipeIngCount: { fontSize: FONT_SIZE.sm, color: COLORS.mustard, marginTop: 2, fontWeight: '600' },
  removeBtn: { padding: SPACING.xs },
  removeBtnText: { fontSize: FONT_SIZE.lg, color: COLORS.textSecondary },

  allReadyBox: {
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  allReadyEmoji: { fontSize: 48 },
  allReadyTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.green },
  allReadySubtitle: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, textAlign: 'center' },

  missingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  missingIcon: { fontSize: 16 },
  missingName: { flex: 1, fontSize: FONT_SIZE.lg, fontWeight: '600', color: COLORS.danger },
  missingUnit: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },

  // Picker modal
  pickerContainer: { flex: 1, backgroundColor: COLORS.background },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { width: 80 },
  backBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: FONT_SIZE.md },
  pickerTitle: { flex: 1, fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  pickerRecipeName: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  pickerRecipeDesc: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  pickerAddIcon: { fontSize: 22, color: COLORS.primary, fontWeight: '700' },
});
