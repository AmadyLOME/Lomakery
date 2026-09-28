import React, { useEffect, useState } from 'react';
import { View, Modal, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './Text';
import RoundButton from './RoundButton';
import Segmented from './Segmented';
import { MenuEntry, Recipe, SavedMenu } from '../types';
import { applySavedMenu, deleteSavedMenu, saveMenu, subscribeToSavedMenus } from '../services/weekPlan';
import { addWeeks, formatWeekRange, weekIdOf } from '../utils/weeks';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useStyles } from '../theme/ThemeProvider';

interface Props {
  visible: boolean;
  householdId: string;
  uid: string;
  weekId: string;           // semaine affichée dans le planning
  weekLabel: string;        // « cette semaine », « la semaine prochaine »…
  entries: MenuEntry[];     // plats de la semaine affichée
  recipes: Recipe[];
  onApplied: (weekId: string, menu: SavedMenu) => void;
  onClose: () => void;
}

type Target = 'current' | 'next';

export default function SavedMenusSheet({ visible, householdId, uid, weekId, weekLabel, entries, recipes, onApplied, onClose }: Props) {
  const styles = useStyles(makeStyles);
  const [menus, setMenus] = useState<SavedMenu[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [target, setTarget] = useState<Target>('next');

  useEffect(() => {
    if (!visible || !householdId) return;
    setName('');
    return subscribeToSavedMenus(householdId, setMenus);
  }, [visible, householdId]);

  const placed = entries.filter((e) => e.slots.length > 0);
  const mealCount = placed.reduce((n, e) => n + e.slots.length, 0);
  const recipeName = (id: string) => recipes.find((r) => r.id === id)?.name ?? 'Recette supprimée';

  const handleSave = async () => {
    if (!name.trim() || placed.length === 0) return;
    setSaving(true);
    try {
      await saveMenu(householdId, name.trim(), placed, uid);
      setName('');
    } catch (e: any) {
      Alert.alert('Erreur', "Le menu n'a pas pu être enregistré.\n" + (e?.message ?? ''));
    } finally {
      setSaving(false);
    }
  };

  const handleApply = (menu: SavedMenu) => {
    const current = weekIdOf(new Date());
    const dest = target === 'current' ? current : addWeeks(current, 1);
    Alert.alert(
      `Utiliser « ${menu.name} »`,
      `Le menu de la semaine du ${formatWeekRange(dest)} sera remplacé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Remplacer',
          style: 'destructive',
          onPress: async () => {
            await applySavedMenu(householdId, dest, menu);
            onApplied(dest, menu);
          },
        },
      ]
    );
  };

  const handleDelete = (menu: SavedMenu) =>
    Alert.alert('Supprimer', `Supprimer le menu « ${menu.name} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteSavedMenu(householdId, menu.id) },
    ]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Menus enregistrés</Text>
          <RoundButton icon="close" label="Fermer" onPress={onClose} size={40} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Enregistrer la semaine affichée */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Enregistrer {weekLabel}</Text>
            <Text style={styles.meta}>
              {formatWeekRange(weekId)} · {placed.length} plat{placed.length > 1 ? 's' : ''} · {mealCount} repas
            </Text>
            {placed.length === 0 ? (
              <Text style={styles.hint}>Cette semaine est vide : ajoute des plats au planning pour pouvoir l'enregistrer.</Text>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Nom du menu (ex. Semaine batch cooking)"
                  placeholderTextColor={COLORS.textSecondary}
                  value={name}
                  onChangeText={setName}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, (!name.trim() || saving) && { opacity: 0.4 }]}
                  onPress={handleSave}
                  disabled={!name.trim() || saving}
                  accessibilityRole="button"
                >
                  <Ionicons name="bookmark" size={17} color="#fff" />
                  <Text style={styles.primaryBtnText}>Enregistrer ce menu</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={styles.sectionLabel}>MES MENUS</Text>

          {menus.length === 0 && <Text style={styles.hint}>Aucun menu enregistré pour l'instant.</Text>}

          {menus.map((menu) => {
            const open = openId === menu.id;
            const meals = menu.entries.reduce((n, e) => n + e.slots.length, 0);
            return (
              <View key={menu.id} style={styles.card}>
                <TouchableOpacity style={styles.menuHead} onPress={() => setOpenId(open ? null : menu.id)} accessibilityRole="button">
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{menu.name}</Text>
                    <Text style={styles.meta}>
                      {menu.entries.length} plat{menu.entries.length > 1 ? 's' : ''} · {meals} repas
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleDelete(menu)}
                    accessibilityRole="button"
                    accessibilityLabel={`Supprimer le menu ${menu.name}`}
                  >
                    <Ionicons name="trash-outline" size={17} color={COLORS.dangerText} />
                  </TouchableOpacity>
                </TouchableOpacity>

                <View style={styles.chips}>
                  {menu.entries.map((e, i) => (
                    <View key={i} style={styles.chip}>
                      <Text style={styles.chipText}>{recipeName(e.recipeId)}</Text>
                    </View>
                  ))}
                </View>

                {open ? (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.useLabel}>Utiliser pour :</Text>
                    <Segmented
                      stretch
                      value={target}
                      onChange={setTarget}
                      options={[
                        { value: 'current', label: 'Cette semaine', activeColor: COLORS.ink },
                        { value: 'next', label: 'Sem. prochaine', activeColor: COLORS.ink },
                      ]}
                    />
                    <Text style={styles.hint}>Remplace les plats de la semaine choisie. Les dates de cuisson sont recalculées.</Text>
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => handleApply(menu)} accessibilityRole="button">
                      <Text style={styles.primaryBtnText}>Appliquer ce menu</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={styles.useBtn} onPress={() => setOpenId(menu.id)} accessibilityRole="button">
                    <Text style={styles.useBtnText}>Utiliser</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          <View style={styles.info}>
            <Ionicons name="time-outline" size={18} color={COLORS.textMuted} />
            <Text style={styles.infoText}>
              L'app garde 3 semaines : la passée, l'actuelle et la prochaine. Chaque dimanche, la plus ancienne est
              effacée. Les menus enregistrés sont conservés.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg - 4,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  content: { paddingHorizontal: SPACING.lg - 4, paddingBottom: SPACING.xl * 2, gap: SPACING.md - 2 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: SPACING.md,
    gap: SPACING.sm + 2,
    ...SHADOWS.soft,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  meta: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  hint: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  input: {
    minHeight: 46,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.sandDark,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    fontSize: 15,
    color: COLORS.text,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: COLORS.mustardText, letterSpacing: 1, marginTop: SPACING.xs, marginLeft: SPACING.xs },
  menuHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: COLORS.sand, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  divider: { height: 1, backgroundColor: COLORS.sand },
  useLabel: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  useBtn: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.sand,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  useBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  info: {
    flexDirection: 'row',
    gap: SPACING.sm + 2,
    backgroundColor: COLORS.sand,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md - 2,
  },
  infoText: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textMuted, lineHeight: 18 },
});
