import React, { useEffect, useState } from 'react';
import { View, Modal, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import RoundButton from './RoundButton';
import Segmented from './Segmented';
import SlotGrid from './SlotGrid';
import { useRecipePhoto } from '../hooks/useRecipePhoto';
import { Meal, MenuEntry, Recipe, SlotKey } from '../types';
import { DAY_SHORT, formatDayShort, parseSlot, sortSlots } from '../utils/weeks';
import { activeSlots, newEntryId } from '../services/weekPlan';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

type CookMode = 'same' | 'veille' | 'autre';

interface Props {
  visible: boolean;
  weekId: string;
  recipes: Recipe[];
  initial: MenuEntry | null;   // plat à modifier, sinon ajout
  presetSlot: SlotKey | null;  // créneau touché dans le planning
  householdId: string;
  busySlots: SlotKey[];        // créneaux déjà pris par d'autres plats
  onSubmit: (entry: MenuEntry) => void;
  onClose: () => void;
}

function cookModeOf(entry: MenuEntry): CookMode {
  const first = activeSlots(entry)[0];
  if (!first) return 'same';
  const { day, meal } = parseSlot(first);
  if (entry.cookDay === day && entry.cookMeal === meal) return 'same';
  if (entry.cookDay === day - 1 && entry.cookMeal === 'soir') return 'veille';
  return 'autre';
}

export default function MenuEntrySheet({ visible, weekId, recipes, initial, presetSlot, householdId, busySlots, onSubmit, onClose }: Props) {
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotKey[]>([]);
  const [mode, setMode] = useState<CookMode>('same');
  const [otherDay, setOtherDay] = useState(0);
  const [otherMeal, setOtherMeal] = useState<Meal>('soir');
  const [pickingRecipe, setPickingRecipe] = useState(false);

  // Réinitialise à chaque ouverture
  useEffect(() => {
    if (!visible) return;
    if (initial) {
      setRecipeId(initial.recipeId);
      setSlots(activeSlots(initial));
      setMode(cookModeOf(initial));
      setOtherDay(initial.cookDay);
      setOtherMeal(initial.cookMeal);
      setPickingRecipe(false);
    } else {
      setRecipeId(null);
      setSlots(presetSlot ? [presetSlot] : []);
      setMode('same');
      setOtherDay(presetSlot ? parseSlot(presetSlot).day : 0);
      setOtherMeal('soir');
      setPickingRecipe(true);
    }
  }, [visible]);

  const recipe = recipes.find((r) => r.id === recipeId) ?? null;
  const sorted = sortSlots(slots);
  const first = sorted[0] ? parseSlot(sorted[0]) : null;

  const cook: { day: number; meal: Meal } | null = !first
    ? null
    : mode === 'same'
      ? { day: first.day, meal: first.meal }
      : mode === 'veille'
        ? { day: first.day - 1, meal: 'soir' }
        : { day: otherDay, meal: otherMeal };

  const toggleSlot = (slot: SlotKey) =>
    setSlots((prev) => (prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]));

  const canSubmit = !!recipe && slots.length > 0 && !!cook;

  const submit = () => {
    if (!canSubmit || !cook || !recipe) return;
    // Les repas sautés restent affichés (sauf s'ils sont recochés) ; un report décoché est oublié
    const skipped = (initial?.skipped ?? [])
      .filter((sk) => !sorted.includes(sk.slot))
      .map((sk) => ({ slot: sk.slot, to: sk.to && sorted.includes(sk.to) ? sk.to : null }));
    onSubmit({
      id: initial?.id ?? newEntryId(),
      recipeId: recipe.id,
      slots: sortSlots([...sorted, ...skipped.map((sk) => sk.slot)]),
      cookDay: cook.day,
      cookMeal: cook.meal,
      cooked: initial?.cooked ?? false,
      cookedAt: initial?.cookedAt ?? null,
      eaten: (initial?.eaten ?? []).filter((sl) => sorted.includes(sl)),
      skipped,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{initial ? 'Modifier le plat' : 'Ajouter au menu'}</Text>
          <RoundButton icon="close" label="Fermer" onPress={onClose} size={40} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Recette */}
          {recipe && !pickingRecipe ? (
            <View style={styles.recipeRow}>
              <RecipeThumb householdId={householdId} recipe={recipe} />
              <View style={{ flex: 1 }}>
                <Text style={styles.recipeName}>{recipe.name}</Text>
                <Text style={styles.recipeMeta} numberOfLines={1}>
                  {recipe.description ? `${recipe.description} · ` : ''}{recipe.ingredients?.length ?? 0} ingrédients
                </Text>
              </View>
              <TouchableOpacity style={styles.changeBtn} onPress={() => setPickingRecipe(true)} accessibilityRole="button">
                <Text style={styles.changeBtnText}>Changer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.block}>
              <Text style={styles.stepTitle}>Quel plat ?</Text>
              {recipes.length === 0 ? (
                <Text style={styles.hint}>Aucune recette. Crée d'abord une recette dans l'onglet Recettes.</Text>
              ) : (
                <View style={styles.recipeList}>
                  {recipes.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.recipeOption, r.id === recipeId && styles.recipeOptionActive]}
                      onPress={() => { setRecipeId(r.id); setPickingRecipe(false); }}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.recipeOptionText, r.id === recipeId && { color: '#fff' }]}>{r.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* 1. Créneaux */}
          <View style={styles.block}>
            <Text style={styles.stepTitle}>1. Quels repas ?</Text>
            <SlotGrid weekId={weekId} selected={slots} onToggle={toggleSlot} busy={busySlots} />
            <Text style={styles.hint}>
              {slots.length === 0
                ? 'Touche les créneaux où ce plat sera mangé (on peut sauter des repas).'
                : `${slots.length} repas · cuisiné une fois`}
            </Text>
          </View>

          {/* 2. Cuisson */}
          <View style={styles.block}>
            <Text style={styles.stepTitle}>2. Quand le cuisiner ?</Text>
            <Segmented
              stretch
              value={mode}
              onChange={(m) => { setMode(m); if (m === 'autre' && first) { setOtherDay(first.day - 1); setOtherMeal('soir'); } }}
              options={[
                { value: 'same', label: 'Le jour même', activeColor: COLORS.primary },
                { value: 'veille', label: 'La veille', activeColor: COLORS.primary },
                { value: 'autre', label: 'Autre…', activeColor: COLORS.primary },
              ]}
            />
            {mode === 'autre' && (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayChips}>
                  {[-1, 0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayChip, otherDay === day && styles.dayChipOn]}
                      onPress={() => setOtherDay(day)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: otherDay === day }}
                    >
                      <Text style={[styles.dayChipText, otherDay === day && { color: '#fff' }]}>
                        {formatDayShort(weekId, day)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Segmented
                  stretch
                  value={otherMeal}
                  onChange={setOtherMeal}
                  options={[{ value: 'midi', label: 'Midi' }, { value: 'soir', label: 'Soir' }]}
                />
              </>
            )}
          </View>

          {/* Aperçu */}
          {cook && (
            <View style={styles.preview}>
              <View style={styles.previewRow}>
                <Ionicons name="flame-outline" size={17} color={COLORS.primaryDark} />
                <Text style={[styles.previewText, { color: COLORS.primaryDark }]}>
                  À cuisiner {formatDayShort(weekId, cook.day)} {cook.meal}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Ionicons name="calendar-outline" size={17} color={COLORS.text} />
                <Text style={styles.previewText}>
                  Mangé {sorted.map((s) => { const p = parseSlot(s); return `${DAY_SHORT[p.day].toLowerCase()} ${p.meal}`; }).join(', ')}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submit, !canSubmit && { opacity: 0.4 }]}
            onPress={submit}
            disabled={!canSubmit}
            accessibilityRole="button"
          >
            <Text style={styles.submitText}>{initial ? 'Enregistrer' : 'Ajouter au menu'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function RecipeThumb({ householdId, recipe }: { householdId: string; recipe: Recipe }) {
  const uri = useRecipePhoto(householdId, recipe.id, recipe.photoUpdatedAt);
  return uri ? (
    <Image source={{ uri }} style={styles.thumb} />
  ) : (
    <View style={[styles.thumb, styles.thumbEmpty]}>
      <Ionicons name="book-outline" size={22} color={COLORS.mustardText} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg - 4,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  content: { paddingHorizontal: SPACING.lg - 4, paddingBottom: SPACING.lg, gap: SPACING.lg - 4 },
  block: { gap: SPACING.sm + 2 },
  stepTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  hint: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },

  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md - 4,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm + 2,
  },
  thumb: { width: 52, height: 52, borderRadius: 16 },
  thumbEmpty: { backgroundColor: COLORS.sand, alignItems: 'center', justifyContent: 'center' },
  recipeName: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  recipeMeta: { fontSize: 13, color: COLORS.textMuted },
  changeBtn: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 7 },
  changeBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  recipeList: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  recipeOption: { backgroundColor: COLORS.sand, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 14, paddingVertical: 9 },
  recipeOptionActive: { backgroundColor: COLORS.primary },
  recipeOptionText: { fontSize: 15, fontWeight: '700', color: COLORS.text },


  dayChips: { gap: SPACING.xs + 2, paddingVertical: 2 },
  dayChip: { backgroundColor: COLORS.sand, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 9 },
  dayChipOn: { backgroundColor: COLORS.primary },
  dayChipText: { fontSize: 13, fontWeight: '800', color: COLORS.textMuted },

  preview: { backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md, padding: SPACING.md - 2, gap: SPACING.sm },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  previewText: { flex: 1, fontSize: 14, fontWeight: '800', color: COLORS.text },

  footer: { paddingHorizontal: SPACING.lg - 4, paddingTop: SPACING.sm, paddingBottom: SPACING.xl },
  submit: {
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 4,
  },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
