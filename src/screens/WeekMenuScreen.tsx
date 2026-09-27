import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { Text } from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { subscribeToWeekMenu, addToWeekMenu, removeFromWeekMenu, resetWeekMenu } from '../services/weekMenu';
import { subscribeToRecipes } from '../services/recipes';
import { subscribeToFamilyList, subscribeToFamilyGroups } from '../services/lists';
import { Recipe, ShoppingItem, ShoppingGroup } from '../types';
import { notify, senderName } from '../services/notifications';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS, TAB_BAR_SPACE } from '../constants/theme';
import ScreenHeader from '../components/ScreenHeader';
import RoundButton from '../components/RoundButton';
import { scale, moderateScale } from '../utils/responsive';

export default function WeekMenuScreen() {
  const { profile } = useAuth();
  const householdId = profile?.householdId ?? '';

  const [menuIds, setMenuIds] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [familyItems, setFamilyItems] = useState<ShoppingItem[]>([]);
  const [familyGroups, setFamilyGroups] = useState<ShoppingGroup[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [collapsedRecipes, setCollapsedRecipes] = useState<Set<string>>(new Set());
  const [collapsedMissingGroups, setCollapsedMissingGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!householdId) return;
    const u1 = subscribeToWeekMenu(householdId, setMenuIds);
    const u2 = subscribeToRecipes(householdId, setRecipes);
    const u3 = subscribeToFamilyList(householdId, setFamilyItems);
    const u4 = subscribeToFamilyGroups(householdId, setFamilyGroups);
    return () => { u1(); u2(); u3(); u4(); };
  }, [householdId]);

  function toggleRecipe(id: string) {
    setCollapsedRecipes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleMissingGroup(id: string) {
    setCollapsedMissingGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

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
        {
          text: 'Vider',
          style: 'destructive',
          onPress: () => {
            resetWeekMenu(householdId);
            notify(householdId, '📅 Menu de la semaine', `${senderName()} a vidé le menu de la semaine`);
          },
        },
      ]
    );
  };

  const handleRemove = (recipeId: string) => {
    removeFromWeekMenu(householdId, menuIds, recipeId);
  };

  const handleAdd = (recipeId: string) => {
    addToWeekMenu(householdId, menuIds, recipeId);
    setShowPicker(false);
    const recipe = recipes.find((r) => r.id === recipeId);
    if (recipe) notify(householdId, '📅 Menu de la semaine', `${senderName()} a ajouté « ${recipe.name} » au menu`);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        subtitle="Plats de la semaine"
        title="Menu"
        right={<RoundButton icon="refresh" label="Refaire le menu" onPress={handleReset} />}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}>

        {/* ── Plats sélectionnés ───────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Plats sélectionnés</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowPicker(true)}>
              <Text style={styles.addBtnText}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>

          {menuRecipes.length === 0 ? (
            <Text style={styles.emptyText}>Aucun plat sélectionné. Appuie sur + Ajouter.</Text>
          ) : (
            menuRecipes.map((recipe) => {
              const isCollapsed = collapsedRecipes.has(recipe.id);
              const ings = recipe.ingredients ?? [];
              return (
                <View key={recipe.id}>
                  <TouchableOpacity
                    style={styles.recipeGroupHeader}
                    onPress={() => toggleRecipe(recipe.id)}
                  >
                    <Text style={styles.recipeChevron}>{isCollapsed ? '▶' : '▼'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recipeName}>{recipe.name}</Text>
                      {recipe.description ? (
                        <Text style={styles.recipeDesc} numberOfLines={1}>{recipe.description}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.recipeIngCount}>{ings.length} ing.</Text>
                    <TouchableOpacity onPress={() => handleRemove(recipe.id)} style={styles.removeBtn}>
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                  {!isCollapsed && ings.map((ing) => (
                    <View key={ing.id} style={styles.ingRow}>
                      <Text style={styles.ingName}>{ing.name}</Text>
                      {ing.quantity ? <Text style={styles.ingQty}>{ing.quantity}</Text> : null}
                    </View>
                  ))}
                </View>
              );
            })
          )}
        </View>

        {/* ── Articles à acheter ───────────────────────── */}
        {menuIds.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Articles à acheter</Text>

            {allReady ? (
              <View style={styles.allReadyBox}>
                <Text style={styles.allReadyEmoji}>🎉</Text>
                <Text style={styles.allReadyTitle}>Tout est à la casa !</Text>
                <Text style={styles.allReadySubtitle}>
                  Tous les ingrédients sont disponibles pour faire ces plats.
                </Text>
              </View>
            ) : (() => {
              // Grouper les articles manquants par groupe
              const grouped = familyGroups
                .map((g) => ({ group: g, items: missingItems.filter((i) => i.groupId === g.id) }))
                .filter((g) => g.items.length > 0);
              const ungrouped = missingItems.filter(
                (i) => !i.groupId || !familyGroups.find((g) => g.id === i.groupId)
              );

              return (
                <>
                  {grouped.map(({ group, items }) => {
                    const isCollapsed = collapsedMissingGroups.has(group.id);
                    return (
                      <View key={group.id}>
                        <TouchableOpacity
                          style={styles.missingGroupHeader}
                          onPress={() => toggleMissingGroup(group.id)}
                        >
                          <Text style={styles.missingGroupChevron}>{isCollapsed ? '▶' : '▼'}</Text>
                          <Text style={styles.missingGroupName}>📦 {group.name}</Text>
                          <Text style={styles.missingGroupCount}>{items.length}</Text>
                        </TouchableOpacity>
                        {!isCollapsed && items.map((item) => (
                          <View key={item.id} style={styles.missingRow}>
                            <Text style={styles.missingIcon}>🔴</Text>
                            <Text style={styles.missingName}>{item.name}</Text>
                            {item.unit ? <Text style={styles.missingUnit}>{item.unit}</Text> : null}
                          </View>
                        ))}
                      </View>
                    );
                  })}
                  {ungrouped.map((item) => (
                    <View key={item.id} style={styles.missingRow}>
                      <Text style={styles.missingIcon}>🔴</Text>
                      <Text style={styles.missingName}>{item.name}</Text>
                      {item.unit ? <Text style={styles.missingUnit}>{item.unit}</Text> : null}
                    </View>
                  ))}
                </>
              );
            })()}
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
            <View style={{ width: scale(80) }} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },


  section: {
    marginHorizontal: SPACING.lg - 4,
    marginBottom: SPACING.md - 2,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.md - 2,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: FONT_SIZE.md },

  emptyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    padding: SPACING.md,
    fontStyle: 'italic',
  },

  recipeGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surfaceWarm,
    gap: SPACING.xs,
  },
  recipeChevron: { fontSize: 11, color: COLORS.textSecondary },
  recipeName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  recipeDesc: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 1 },
  recipeIngCount: { fontSize: FONT_SIZE.sm, color: COLORS.mustard, fontWeight: '600' },
  removeBtn: { padding: SPACING.xs },
  removeBtnText: { fontSize: FONT_SIZE.lg, color: COLORS.textSecondary },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  ingName: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text },
  ingQty: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  missingGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.surfaceWarm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.xs,
  },
  missingGroupChevron: { fontSize: 11, color: COLORS.textSecondary },
  missingGroupName: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.mustard, textTransform: 'uppercase', letterSpacing: 0.5 },
  missingGroupCount: {
    fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textSecondary,
    backgroundColor: COLORS.border, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 1, overflow: 'hidden',
  },

  allReadyBox: {
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  allReadyEmoji: { fontSize: moderateScale(48) },
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
  backBtn: { width: scale(80) },
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
  pickerAddIcon: { fontSize: moderateScale(22), color: COLORS.primary, fontWeight: '700' },
});
