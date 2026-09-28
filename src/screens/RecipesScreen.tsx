import React, { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, Alert, Modal, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/Text';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { subscribeToRecipes, addRecipe, deleteRecipe, updateRecipeIngredients, setRecipePhoto, updateRecipe, RecipeFields } from '../services/recipes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TagEditorSheet from '../components/TagEditorSheet';
import StepEditorSheet from '../components/StepEditorSheet';
import ShareRecipeSheet from '../components/ShareRecipeSheet';
import CookingMode from '../components/CookingMode';
import { scaleQuantity, formatFactor, formatMinutes } from '../utils/quantities';
import { tagColor, allTags, hasTag } from '../utils/tags';
import { pickPhoto, askPhotoSource, RECIPE_PHOTO_OPTIONS, PhotoSource } from '../services/photos';
import { useRecipePhoto } from '../hooks/useRecipePhoto';
import RecipeCarousel from '../components/RecipeCarousel';
import CollapseAllButton from '../components/CollapseAllButton';
import { Availability, AvailabilityIcon, AvailabilityBadge, AvailabilityLegend } from '../components/Availability';
import { useCollapsedGroups } from '../hooks/useCollapsedGroups';
import { ingredientStatus, normalizeName, collectMissing } from '../utils/ingredients';
import MissingToCartSheet from '../components/MissingToCartSheet';
import { addMissingItems } from '../services/lists';
import { notify, senderName } from '../services/notifications';
import ScreenHeader from '../components/ScreenHeader';
import RoundButton from '../components/RoundButton';
import Segmented from '../components/Segmented';
import { subscribeToFamilyList, subscribeToFamilyGroups } from '../services/lists';
import { Recipe, RecipeIngredient, RecipeStep, ShoppingItem, ShoppingGroup } from '../types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS, TAB_BAR_SPACE } from '../constants/theme';
import { scale, moderateScale } from '../utils/responsive';

type IngredientStatus = Availability;
type ViewMode = 'list' | 'carousel';

const VIEW_MODE_KEY = 'recipes:viewMode';

function getIngredientStatus(name: string, familyItems: ShoppingItem[]): IngredientStatus {
  return ingredientStatus(name, familyItems);
}

function statusColor(status: IngredientStatus): string {
  if (status === 'available') return COLORS.green;
  if (status === 'missing') return COLORS.dangerText;
  return COLORS.primaryDark;
}

function getRecipeStats(recipe: Recipe, familyItems: ShoppingItem[]) {
  const ings = recipe.ingredients ?? [];
  const statuses = ings.map((ing) => getIngredientStatus(ing.name, familyItems));
  return {
    total: ings.length,
    available: statuses.filter((st) => st === 'available').length,
    toBuy: statuses.filter((st) => st === 'toBuy').length,
    missing: statuses.filter((st) => st === 'missing').length,
  };
}

// Miniature de la photo dans la vue liste
function RecipeThumb({ householdId, recipe }: { householdId: string; recipe: Recipe }) {
  const uri = useRecipePhoto(householdId, recipe.id, recipe.photoUpdatedAt);
  if (!uri) return null;
  return <Image source={{ uri }} style={styles.thumb} />;
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
  const { collapsed: collapsedGroups, toggle: toggleGroup, toggleAll, allCollapsed } = useCollapsedGroups('collapse:picker');

  const existingNames = existingIngredients.map((i) => normalizeName(i.name));

  const filtered = familyItems.filter(
    (item) =>
      normalizeName(item.name).includes(normalizeName(search)) &&
      !existingNames.includes(normalizeName(item.name))
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
    const color = statusColor(status);

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.suggestionRow}
        onPress={() => onSelect(item.name, qty)}
      >
        <View style={styles.statusIcon}><AvailabilityIcon status={status} /></View>
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

      {!search.trim() && grouped.length > 1 && (
        <View style={styles.pickerToolbar}>
          <CollapseAllButton
            allCollapsed={allCollapsed(grouped.map((g) => g.group?.id ?? '__ungrouped'))}
            onPress={() => toggleAll(grouped.map((g) => g.group?.id ?? '__ungrouped'))}
          />
        </View>
      )}

      <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
        {noResults && (
          <Text style={styles.pickerHint}>Aucun article trouvé pour « {search.trim()} »</Text>
        )}

        {grouped.map(({ group, items }) => {
          const groupId = group?.id ?? '__ungrouped';
          const isCollapsed = !search.trim() && collapsedGroups.has(groupId);
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
  allRecipes: Recipe[];
  familyItems: ShoppingItem[];
  familyGroups: ShoppingGroup[];
  householdId: string;
  userId: string;
  onClose: () => void;
}

type DetailTab = 'ingredients' | 'steps';
type TimeField = 'prepMin' | 'cookMin' | 'restMin';

const TIME_FIELDS: { key: TimeField; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'prepMin', label: 'Préparation', icon: 'restaurant-outline' },
  { key: 'cookMin', label: 'Cuisson', icon: 'flame-outline' },
  { key: 'restMin', label: 'Repos', icon: 'hourglass-outline' },
];

// Firestore refuse `undefined` : on retire timerMin quand il n'y a pas de minuteur
function cleanStep(s: RecipeStep): RecipeStep {
  return s.timerMin ? { id: s.id, text: s.text, timerMin: s.timerMin } : { id: s.id, text: s.text };
}

function RecipeDetailModal({ recipe, allRecipes, familyItems, familyGroups, householdId, userId, onClose }: RecipeDetailModalProps) {
  const insets = useSafeAreaInsets();
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(recipe.ingredients || []);
  const [steps, setSteps] = useState<RecipeStep[]>(recipe.steps || []);
  const [showPicker, setShowPicker] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  const [tab, setTab] = useState<DetailTab>('ingredients');
  const baseServings = recipe.servings || 4;
  const [people, setPeople] = useState(baseServings);
  const [showTags, setShowTags] = useState(false);
  const [stepEdit, setStepEdit] = useState<{ index: number; step: RecipeStep | null } | null>(null);
  const [cooking, setCooking] = useState(false);
  const [sharing, setSharing] = useState(false);
  const photoUri = useRecipePhoto(householdId, recipe.id, recipe.photoUpdatedAt);
  const missing = collectMissing([{ name: recipe.name, ingredients }], familyItems);
  const factor = people / baseServings;
  const tags = recipe.tags ?? [];

  const addMissing = async (entries: { name: string; groupId?: string }[]) => {
    await addMissingItems(householdId, entries, userId);
    setShowMissing(false);
    if (entries.length > 0) {
      notify(householdId, '🛒 À acheter', `${senderName()} a ajouté ${entries.length} article${entries.length > 1 ? 's' : ''} pour « ${recipe.name} »`);
    }
  };

  const save = (fields: RecipeFields) =>
    updateRecipe(householdId, recipe.id, fields).catch((e: any) =>
      Alert.alert('Erreur', "La recette n'a pas pu être enregistrée.\n" + (e?.message ?? ''))
    );

  const changePhoto = () => {
    const upload = async (source: PhotoSource) => {
      try {
        const base64 = await pickPhoto(source, RECIPE_PHOTO_OPTIONS);
        if (!base64) return;
        setPhotoBusy(true);
        await setRecipePhoto(householdId, recipe.id, base64);
      } catch (e: any) {
        Alert.alert('Erreur', "La photo n'a pas pu être enregistrée.\n" + (e?.message ?? ''));
      } finally {
        setPhotoBusy(false);
      }
    };
    const remove = async () => {
      setPhotoBusy(true);
      try {
        await setRecipePhoto(householdId, recipe.id, null);
      } finally {
        setPhotoBusy(false);
      }
    };
    askPhotoSource('Photo de la recette', upload, recipe.photoUpdatedAt ? remove : undefined);
  };

  // Sync quand la recette change (temps réel)
  useEffect(() => {
    setIngredients(recipe.ingredients || []);
  }, [recipe.ingredients]);
  useEffect(() => {
    setSteps(recipe.steps || []);
  }, [recipe.steps]);
  // Si la base de la recette change, on repart de la nouvelle base
  useEffect(() => {
    setPeople(baseServings);
  }, [baseServings]);

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
      `Quantité pour ${baseServings} personne${baseServings > 1 ? 's' : ''} (base de la recette)`,
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

  const changeBaseServings = () =>
    Alert.prompt(
      'Recette prévue pour…',
      'Nombre de personnes pour lesquelles les quantités sont saisies',
      (v) => {
        const n = parseInt(v, 10);
        if (!isNaN(n) && n > 0 && n <= 50) save({ servings: n });
      },
      'plain-text',
      String(baseServings),
      'number-pad'
    );

  const editTime = (key: TimeField, label: string) =>
    Alert.prompt(
      label,
      'Durée en minutes (vide pour retirer)',
      (v) => {
        const n = parseInt(v, 10);
        save({ [key]: !isNaN(n) && n > 0 ? n : undefined });
      },
      'plain-text',
      recipe[key] ? String(recipe[key]) : '',
      'number-pad'
    );

  const saveSteps = (next: RecipeStep[]) => {
    const cleaned = next.map(cleanStep);
    setSteps(cleaned);
    save({ steps: cleaned });
  };

  const onStepSave = (text: string, timerMin?: number) => {
    if (!stepEdit) return;
    if (stepEdit.step) {
      saveSteps(steps.map((s) => (s.id === stepEdit.step!.id ? { ...s, text, timerMin } : s)));
    } else {
      saveSteps([...steps, { id: Date.now().toString(), text, timerMin }]);
    }
    setStepEdit(null);
  };

  const onStepMove = (dir: -1 | 1) => {
    if (!stepEdit?.step) return;
    const i = stepEdit.index;
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    saveSteps(next);
    setStepEdit({ index: j, step: next[j] });
  };

  const onStepDelete = () => {
    if (!stepEdit?.step) return;
    saveSteps(steps.filter((s) => s.id !== stepEdit.step!.id));
    setStepEdit(null);
  };

  const factorLabel = factor === 1 ? '' : ` · quantités ×${formatFactor(factor)}`;

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={showPicker ? () => setShowPicker(false) : onClose}
    >
      <View style={styles.modalContainer}>
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
            <View style={styles.detailHeader}>
              <RoundButton icon="chevron-back" label="Retour" onPress={onClose} />
              <Text style={styles.detailTitle} numberOfLines={2}>{recipe.name}</Text>
              <RoundButton icon="share-outline" label="Partager la recette" onPress={() => setSharing(true)} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: SPACING.lg }}>
              <TouchableOpacity style={styles.detailPhotoBox} onPress={changePhoto} activeOpacity={0.85}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.detailPhoto} />
                ) : (
                  <Text style={styles.detailPhotoAdd}>📷 Ajouter une photo</Text>
                )}
                {photoUri && !photoBusy && (
                  <View style={styles.detailPhotoEdit}>
                    <Text style={styles.detailPhotoEditText}>✏️ Photo</Text>
                  </View>
                )}
                {photoBusy && (
                  <View style={styles.detailPhotoBusy}>
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.tagRow}>
                {tags.map((t) => {
                  const c = tagColor(t);
                  return (
                    <TouchableOpacity key={t} style={[styles.tagChip, { backgroundColor: c.bg }]} onPress={() => setShowTags(true)}>
                      <Text style={[styles.tagChipText, { color: c.fg }]}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity style={styles.tagAdd} onPress={() => setShowTags(true)} accessibilityRole="button">
                  <Ionicons name={tags.length ? 'pencil' : 'add'} size={14} color={COLORS.textMuted} />
                  <Text style={styles.tagAddText}>{tags.length ? 'Étiquettes' : 'Étiquette'}</Text>
                </TouchableOpacity>
              </View>

              {recipe.description ? (
                <Text style={styles.recipeDescription}>{recipe.description}</Text>
              ) : null}

              <View style={styles.portions}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.portionsTitle}>Pour {people} personne{people > 1 ? 's' : ''}</Text>
                  <TouchableOpacity onPress={changeBaseServings} accessibilityRole="button" hitSlop={8}>
                    <Text style={styles.portionsSub}>
                      Recette prévue pour {baseServings}{factorLabel} · <Text style={styles.portionsLink}>modifier</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.portionsBtn, people <= 1 && { opacity: 0.35 }]}
                  disabled={people <= 1}
                  onPress={() => setPeople((n) => n - 1)}
                  accessibilityRole="button"
                  accessibilityLabel="Une personne de moins"
                >
                  <Ionicons name="remove" size={20} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.portionsBtn}
                  onPress={() => setPeople((n) => Math.min(50, n + 1))}
                  accessibilityRole="button"
                  accessibilityLabel="Une personne de plus"
                >
                  <Ionicons name="add" size={20} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.tabsRow}>
                <Segmented
                  stretch
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: 'ingredients', label: 'Ingrédients', count: ingredients.length },
                    { value: 'steps', label: 'Étapes', count: steps.length },
                  ]}
                />
              </View>

              {tab === 'ingredients' ? (
                <>
                  <View style={styles.legend}>
                    <AvailabilityLegend />
                  </View>

                  {missing.rows.length > 0 && (
                    <TouchableOpacity style={styles.missingBtn} onPress={() => setShowMissing(true)} accessibilityRole="button">
                      <Ionicons name="cart" size={18} color="#fff" />
                      <Text style={styles.missingBtnText}>
                        Ajouter {missing.rows.length === 1 ? "l'absent" : `les ${missing.rows.length} absents`} aux courses
                      </Text>
                    </TouchableOpacity>
                  )}

                  {ingredients.length === 0 && (
                    <Text style={styles.emptyText}>Aucun ingrédient. Appuie sur « Ajouter un ingrédient ».</Text>
                  )}
                  {ingredients.map((ing) => {
                    const status = getIngredientStatus(ing.name, familyItems);
                    const qty = scaleQuantity(ing.quantity, factor);
                    return (
                      <TouchableOpacity
                        key={ing.id}
                        style={styles.ingredientRow}
                        onPress={() => editIngredientQty(ing)}
                      >
                        <View style={styles.statusIcon}><AvailabilityIcon status={status} /></View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.ingredientName, { color: statusColor(status) }]}>
                            {ing.name}
                          </Text>
                          {qty ? (
                            <Text style={styles.ingredientQty}>
                              {qty}
                              {factor !== 1 && qty !== ing.quantity ? <Text style={styles.ingredientBase}>  (recette : {ing.quantity})</Text> : null}
                            </Text>
                          ) : (
                            <Text style={styles.ingredientQtyEmpty}>Ajouter une quantité…</Text>
                          )}
                        </View>
                        <Text style={styles.editQtyHint}>✏️</Text>
                        <TouchableOpacity
                          onPress={() => removeIngredient(ing.id)}
                          style={styles.deleteIngBtn}
                          accessibilityRole="button"
                          accessibilityLabel={`Retirer ${ing.name}`}
                        >
                          <Text style={styles.deleteIngBtnText}>✕</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </>
              ) : (
                <>
                  <View style={styles.timesRow}>
                    {TIME_FIELDS.map(({ key, label, icon }) => (
                      <TouchableOpacity
                        key={key}
                        style={[styles.timeChip, !recipe[key] && styles.timeChipEmpty]}
                        onPress={() => editTime(key, label)}
                        accessibilityRole="button"
                        accessibilityLabel={`${label} : ${recipe[key] ? formatMinutes(recipe[key]!) : 'non renseigné'}. Modifier`}
                      >
                        <Ionicons name={icon} size={15} color={COLORS.text} />
                        <View>
                          <Text style={styles.timeLabel}>{label}</Text>
                          <Text style={styles.timeValue}>{recipe[key] ? formatMinutes(recipe[key]!) : '—'}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {steps.length === 0 && (
                    <Text style={styles.emptyText}>Aucune étape. Ajoute-les une par une, dans l'ordre.</Text>
                  )}
                  {steps.map((s, i) => (
                    <TouchableOpacity key={s.id} style={styles.stepRow} onPress={() => setStepEdit({ index: i, step: s })}>
                      <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.stepText}>{s.text}</Text>
                        {s.timerMin ? (
                          <View style={styles.stepTimer}>
                            <Ionicons name="timer-outline" size={13} color="#3F4575" />
                            <Text style={styles.stepTimerText}>{formatMinutes(s.timerMin)}</Text>
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.addStep} onPress={() => setStepEdit({ index: steps.length, step: null })} accessibilityRole="button">
                    <Ionicons name="add" size={18} color={COLORS.primary} />
                    <Text style={styles.addStepText}>Ajouter une étape</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>

            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
              {tab === 'ingredients' ? (
                <TouchableOpacity style={styles.bottomBtn} onPress={() => setShowPicker(true)} accessibilityRole="button">
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.bottomBtnText}>Ajouter un ingrédient</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.bottomBtn, { backgroundColor: COLORS.ink }, steps.length === 0 && { opacity: 0.4 }]}
                  disabled={steps.length === 0}
                  onPress={() => setCooking(true)}
                  accessibilityRole="button"
                >
                  <Ionicons name="play" size={18} color="#fff" />
                  <Text style={styles.bottomBtnText}>Mode cuisine</Text>
                </TouchableOpacity>
              )}
            </View>

            <MissingToCartSheet
              visible={showMissing}
              rows={missing.rows}
              alreadyToBuy={missing.alreadyToBuy}
              groups={familyGroups}
              onConfirm={addMissing}
              onClose={() => setShowMissing(false)}
            />
            <TagEditorSheet
              visible={showTags}
              tags={tags}
              suggestions={allTags(allRecipes)}
              onSave={(next) => { setShowTags(false); save({ tags: next }); }}
              onClose={() => setShowTags(false)}
            />
            <StepEditorSheet
              visible={!!stepEdit}
              step={stepEdit?.step ?? null}
              index={stepEdit?.index ?? 0}
              total={steps.length}
              onSave={onStepSave}
              onMove={onStepMove}
              onDelete={onStepDelete}
              onClose={() => setStepEdit(null)}
            />
            <ShareRecipeSheet
              visible={sharing}
              recipe={{ ...recipe, ingredients, steps }}
              servings={people}
              photoUri={photoUri}
              onClose={() => setSharing(false)}
            />
            {cooking && (
              <CookingMode recipe={{ ...recipe, ingredients, steps }} factor={factor} onClose={() => setCooking(false)} />
            )}
          </>
        )}
      </View>
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
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const tagsInUse = allTags(recipes);
  const activeTag = tagFilter && hasTag(tagsInUse, tagFilter) ? tagFilter : null;
  const query = normalizeName(search);
  const visibleRecipes = recipes.filter(
    (r) =>
      (!activeTag || hasTag(r.tags, activeTag)) &&
      (!query || normalizeName(r.name).includes(query) || (r.ingredients ?? []).some((i) => normalizeName(i.name).includes(query)))
  );

  useEffect(() => {
    AsyncStorage.getItem(VIEW_MODE_KEY)
      .then((v) => { if (v === 'list' || v === 'carousel') setViewMode(v); })
      .catch(() => {});
  }, []);

  const changeViewMode = (next: ViewMode) => {
    setViewMode(next);
    AsyncStorage.setItem(VIEW_MODE_KEY, next).catch(() => {});
  };

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
    <View style={styles.container}>
      <ScreenHeader
        title="Recettes"
        right={<RoundButton icon="add" variant="primary" label="Nouvelle recette" onPress={() => setShowCreateModal(true)} />}
      />
      {recipes.length > 0 && (
        <View style={styles.viewToggleRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={17} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Chercher une recette ou un ingrédient"
              placeholderTextColor={COLORS.textSecondary}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
          <Segmented
            value={viewMode}
            onChange={changeViewMode}
            options={[
              { value: 'list', label: 'Liste', icon: 'list' },
              { value: 'carousel', label: 'Carrousel', icon: 'albums-outline' },
            ]}
          />
        </View>
      )}
      {tagsInUse.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, !activeTag && styles.filterChipAll]}
            onPress={() => setTagFilter(null)}
            accessibilityRole="button"
            accessibilityState={{ selected: !activeTag }}
          >
            <Text style={[styles.filterChipText, !activeTag && { color: '#fff' }]}>Toutes</Text>
          </TouchableOpacity>
          {tagsInUse.map((t) => {
            const on = activeTag === t;
            const c = tagColor(t);
            return (
              <TouchableOpacity
                key={t}
                style={[styles.filterChip, { backgroundColor: on ? c.fg : c.bg }]}
                onPress={() => setTagFilter(on ? null : t)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.filterChipText, { color: on ? '#fff' : c.fg }]}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {recipes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🍳</Text>
          <Text style={styles.emptyTitle}>Aucune recette</Text>
          <Text style={styles.emptySubtitle}>Crée ta première recette pour commencer</Text>
        </View>
      ) : visibleRecipes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>Aucune recette trouvée</Text>
          <TouchableOpacity onPress={() => { setSearch(''); setTagFilter(null); }} accessibilityRole="button">
            <Text style={[styles.emptySubtitle, { color: COLORS.primary, fontWeight: '800' }]}>Effacer la recherche et le filtre</Text>
          </TouchableOpacity>
        </View>
      ) : viewMode === 'carousel' ? (
        <RecipeCarousel
          recipes={visibleRecipes}
          householdId={householdId}
          getStats={(r) => getRecipeStats(r, familyItems)}
          onOpen={setSelectedRecipe}
          onDelete={handleDelete}
        />
      ) : (
        <FlatList
          data={visibleRecipes}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg - 4, paddingTop: SPACING.xs, paddingBottom: TAB_BAR_SPACE }}
          renderItem={({ item }) => {
            const { total, available, toBuy, missing } = getRecipeStats(item, familyItems);

            return (
              <TouchableOpacity style={styles.recipeCard} onPress={() => setSelectedRecipe(item)}>
                <RecipeThumb householdId={householdId} recipe={item} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.recipeName}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.recipeDesc} numberOfLines={1}>{item.description}</Text>
                  ) : null}
                  {(item.tags ?? []).length > 0 && (
                    <View style={styles.cardTags}>
                      {(item.tags ?? []).slice(0, 3).map((t) => {
                        const c = tagColor(t);
                        return (
                          <Text key={t} style={[styles.cardTag, { backgroundColor: c.bg, color: c.fg }]}>{t}</Text>
                        );
                      })}
                    </View>
                  )}
                  {total > 0 && (
                    <View style={styles.recipeBadges}>
                      {available > 0 && <AvailabilityBadge status="available" count={available} />}
                      {toBuy > 0 && <AvailabilityBadge status="toBuy" count={toBuy} />}
                      {missing > 0 && <AvailabilityBadge status="missing" count={missing} />}
                      <Text style={[styles.badge, { backgroundColor: COLORS.border, color: COLORS.textSecondary }]}>
                        {total} ing.
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  style={styles.deleteRecipeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Supprimer ${item.name}`}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.dangerText} />
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
          allRecipes={recipes}
          familyItems={familyItems}
          familyGroups={familyGroups}
          householdId={householdId}
          userId={user?.uid ?? ''}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  viewToggleRow: { paddingHorizontal: SPACING.lg - 4, paddingBottom: SPACING.sm + 2, gap: SPACING.sm + 2 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 46,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    ...SHADOWS.soft,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: SPACING.sm },
  filterScroll: { flexGrow: 0 },
  filterRow: { gap: 6, paddingHorizontal: SPACING.lg - 4, paddingBottom: SPACING.md - 2 },
  filterChip: { minHeight: 34, paddingHorizontal: 13, borderRadius: BORDER_RADIUS.full, justifyContent: 'center', backgroundColor: COLORS.sand },
  filterChipAll: { backgroundColor: COLORS.ink },
  filterChipText: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  cardTag: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyEmoji: { fontSize: moderateScale(56), marginBottom: SPACING.md },
  emptyTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xs },
  emptySubtitle: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, textAlign: 'center' },

  recipeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: SPACING.md - 2,
    marginBottom: SPACING.md - 4,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  thumb: {
    width: scale(56),
    height: scale(56),
    borderRadius: 16,
    marginRight: SPACING.md,
    backgroundColor: COLORS.surfaceWarm,
  },
  recipeName: { fontSize: FONT_SIZE.lg + 1, fontWeight: '800', color: COLORS.text },
  recipeDesc: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  recipeBadges: { flexDirection: 'row', marginTop: SPACING.xs, gap: SPACING.xs },
  badge: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  deleteRecipeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

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

  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm + 2,
  },
  detailTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: COLORS.text, textAlign: 'center' },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm + 4 },
  tagChip: { minHeight: 30, paddingHorizontal: 11, borderRadius: BORDER_RADIUS.full, justifyContent: 'center' },
  tagChipText: { fontSize: 13, fontWeight: '800' },
  tagAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minHeight: 30,
    paddingHorizontal: 11,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.sandDark,
    borderStyle: 'dashed',
  },
  tagAddText: { fontSize: 13, fontWeight: '800', color: COLORS.textMuted },

  portions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.md - 2,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    ...SHADOWS.soft,
  },
  portionsTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  portionsSub: { fontSize: 12.5, fontWeight: '700', color: COLORS.textMuted, marginTop: 2 },
  portionsLink: { fontSize: 12.5, fontWeight: '800', color: COLORS.primary, textDecorationLine: 'underline' },
  portionsBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.sand, alignItems: 'center', justifyContent: 'center' },

  tabsRow: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm },

  timesRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  timeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 50,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
  },
  timeChipEmpty: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.sandDark, borderStyle: 'dashed' },
  timeLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted },
  timeValue: { fontSize: 14, fontWeight: '800', color: COLORS.text },

  stepRow: {
    flexDirection: 'row',
    gap: SPACING.sm + 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  stepText: { fontSize: 16, fontWeight: '600', color: COLORS.text, lineHeight: 22 },
  stepTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#E4E6F5',
  },
  stepTimerText: { fontSize: 12, fontWeight: '800', color: '#3F4575' },
  addStep: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    margin: SPACING.md,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addStepText: { fontSize: 15, fontWeight: '800', color: COLORS.primary },

  bottomBar: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm + 2,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  bottomBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  bottomBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  ingredientBase: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontStyle: 'italic' },

  detailPhotoBox: {
    height: scale(200),
    marginHorizontal: SPACING.md,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailPhoto: { width: '100%', height: '100%' },
  detailPhotoAdd: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: COLORS.primary },
  detailPhotoEdit: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  detailPhotoEditText: { color: '#fff', fontSize: FONT_SIZE.sm, fontWeight: '600' },
  detailPhotoBusy: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  recipeDescription: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },

  missingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: 48,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm + 2,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
  },
  missingBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
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
  statusIcon: { marginRight: SPACING.sm + 2 },
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
  pickerToolbar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
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
