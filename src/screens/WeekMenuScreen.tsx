import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import ScreenHeader from '../components/ScreenHeader';
import RoundButton from '../components/RoundButton';
import Segmented from '../components/Segmented';
import MenuEntrySheet from '../components/MenuEntrySheet';
import SavedMenusSheet from '../components/SavedMenusSheet';
import ReportMealSheet, { slotLabel } from '../components/ReportMealSheet';
import { useAuth } from '../hooks/useAuth';
import { subscribeToRecipes } from '../services/recipes';
import { subscribeToFamilyList, subscribeToFamilyGroups } from '../services/lists';
import {
  subscribeToWeek,
  upsertEntry,
  removeEntry,
  setCooked,
  setEaten,
  skipMeal,
  unskipMeal,
  activeSlots,
  clearWeek,
  cleanupOldWeeks,
  migrateLegacyMenu,
} from '../services/weekPlan';
import { notify, senderName } from '../services/notifications';
import { Meal, MenuEntry, Recipe, ShoppingItem, ShoppingGroup, SlotKey } from '../types';
import {
  DAY_SHORT,
  addWeeks,
  dateOf,
  formatDayShort,
  formatWeekRange,
  parseSlot,
  slotKey,
  sortSlots,
  todayDayIndex,
  weekIdOf,
} from '../utils/weeks';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS, TAB_BAR_SPACE } from '../constants/theme';

type WeekOffset = '-1' | '0' | '1';
const MEALS: Meal[] = ['midi', 'soir'];
const WEEK_LABELS: Record<WeekOffset, string> = {
  '-1': 'la semaine passée',
  '0': 'cette semaine',
  '1': 'la semaine prochaine',
};

// Une couleur douce par plat, pour repérer ses différents repas d'un coup d'œil
const DISH_COLORS = [
  { bg: '#F9E2D3', fg: '#7A4A2E', ring: '#E0A77F' },
  { bg: '#E2EBE4', fg: '#3E6B4C', ring: '#8FB39A' },
  { bg: '#F6ECCF', fg: '#7A5A0E', ring: '#C9A54A' },
  { bg: '#E3E4F3', fg: '#3F4575', ring: '#9EA3D6' },
  { bg: '#F3DDE6', fg: '#7A3553', ring: '#D49AB4' },
];

interface EditorState {
  visible: boolean;
  initial: MenuEntry | null;
  presetSlot: SlotKey | null;
}

export default function WeekMenuScreen() {
  const { user, profile } = useAuth();
  const householdId: string = profile?.householdId ?? '';

  const [offset, setOffset] = useState<WeekOffset>('0');
  const currentWeek = weekIdOf(new Date());
  const weekId = addWeeks(currentWeek, Number(offset));

  const [entries, setEntries] = useState<MenuEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [familyItems, setFamilyItems] = useState<ShoppingItem[]>([]);
  const [familyGroups, setFamilyGroups] = useState<ShoppingGroup[]>([]);
  const [editor, setEditor] = useState<EditorState>({ visible: false, initial: null, presetSlot: null });
  const [showSaved, setShowSaved] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  const [report, setReport] = useState<{ entry: MenuEntry; slot: SlotKey } | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const dayY = useRef<number[]>([]);
  const planningY = useRef(0);

  // Ménage des vieilles semaines + reprise de l'ancien menu, une fois par ouverture
  useEffect(() => {
    if (!householdId) return;
    cleanupOldWeeks(householdId).catch((e) => console.error('[weeks] cleanup error:', e?.code ?? e));
    migrateLegacyMenu(householdId).catch((e) => console.error('[weeks] migration error:', e?.code ?? e));
  }, [householdId]);

  useEffect(() => {
    if (!householdId) return;
    const u1 = subscribeToRecipes(householdId, setRecipes);
    const u2 = subscribeToFamilyList(householdId, setFamilyItems);
    const u3 = subscribeToFamilyGroups(householdId, setFamilyGroups);
    return () => { u1(); u2(); u3(); };
  }, [householdId]);

  useEffect(() => {
    if (!householdId) return;
    setEntries([]);
    return subscribeToWeek(householdId, weekId, setEntries);
  }, [householdId, weekId]);

  const recipeOf = (id: string) => recipes.find((r) => r.id === id);
  const colorOf = (entry: MenuEntry) => DISH_COLORS[Math.max(0, entries.indexOf(entry)) % DISH_COLORS.length];

  const placed = entries.filter((e) => e.slots.length > 0);
  const unplaced = entries.filter((e) => e.slots.length === 0);
  const today = todayDayIndex(weekId);
  const weekIsPast = weekId < currentWeek;

  // Articles « À acheter » dont le nom figure dans les ingrédients des plats de la semaine
  const missingItems = useMemo(() => {
    const names = new Set(
      entries.flatMap((e) => (recipeOf(e.recipeId)?.ingredients ?? []).map((i) => i.name.toLowerCase().trim()))
    );
    return familyItems.filter((item) => !item.checked && names.has(item.name.toLowerCase().trim()));
  }, [entries, recipes, familyItems]);

  // Créneaux occupés par les autres plats (indiqués dans les grilles)
  const busySlotsExcept = (entryId: string | null) =>
    placed.filter((e) => e.id !== entryId).flatMap((e) => activeSlots(e));

  // Jours où il reste un plat à cuisiner
  const cookDays = new Set(placed.filter((e) => !e.cooked).map((e) => e.cookDay));

  // ─── Actions ───────────────────────────────────────────────────────────────

  const openAdd = (presetSlot: SlotKey | null = null) => setEditor({ visible: true, initial: null, presetSlot });
  const openEdit = (entry: MenuEntry) => setEditor({ visible: true, initial: entry, presetSlot: null });
  const closeEditor = () => setEditor((s) => ({ ...s, visible: false }));

  const handleSubmit = async (entry: MenuEntry) => {
    const isNew = !editor.initial;
    closeEditor();
    try {
      await upsertEntry(householdId, weekId, entry);
      const name = recipeOf(entry.recipeId)?.name;
      if (isNew && name) {
        notify(householdId, '📅 Menu de la semaine', `${senderName()} a ajouté « ${name} » au menu`);
      }
    } catch (e: any) {
      Alert.alert('Erreur', "Le menu n'a pas pu être enregistré.\n" + (e?.message ?? ''));
    }
  };

  const toggleCooked = (entry: MenuEntry) => setCooked(householdId, weekId, entry.id, !entry.cooked);

  const openEntryActions = (entry: MenuEntry, slot: SlotKey) => {
    const name = recipeOf(entry.recipeId)?.name ?? 'Plat';
    const skipped = (entry.skipped ?? []).find((sk) => sk.slot === slot);
    const eaten = (entry.eaten ?? []).includes(slot);
    const isCookSlot = activeSlots(entry)[0] === slot;
    const common = [
      { text: 'Modifier le plat', onPress: () => openEdit(entry) },
      { text: 'Retirer du menu', style: 'destructive' as const, onPress: () => removeEntry(householdId, weekId, entry.id) },
      { text: 'Annuler', style: 'cancel' as const },
    ];
    if (skipped) {
      Alert.alert(`${name} · ${slotLabel(slot)}`, skipped.to ? `Reporté à ${slotLabel(skipped.to)}` : 'Repas sauté', [
        { text: 'Annuler « sauté »', onPress: () => unskipMeal(householdId, weekId, entry.id, slot) },
        ...(!skipped.to ? [{ text: 'Reporter…', onPress: () => setReport({ entry, slot }) }] : []),
        ...common,
      ]);
      return;
    }
    Alert.alert(`${name} · ${slotLabel(slot)}`, undefined, [
      { text: eaten ? 'Pas encore mangé' : 'Mangé ✓', onPress: () => setEaten(householdId, weekId, entry.id, slot, !eaten) },
      { text: 'Sauté… (reporter)', onPress: () => setReport({ entry, slot }) },
      ...(isCookSlot
        ? [{ text: entry.cooked ? 'Pas encore cuisiné' : 'Marquer comme cuisiné', onPress: () => toggleCooked(entry) }]
        : []),
      ...common,
    ]);
  };

  const handleReport = async (to: SlotKey | null) => {
    if (!report) return;
    const { entry, slot } = report;
    setReport(null);
    try {
      await skipMeal(householdId, weekId, entry.id, slot, to);
    } catch (e: any) {
      Alert.alert('Erreur', "Le repas n'a pas pu être reporté.\n" + (e?.message ?? ''));
    }
  };

  const confirmClear = () =>
    Alert.alert('Vider la semaine', `Retirer tous les plats du ${formatWeekRange(weekId)} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Vider', style: 'destructive', onPress: () => clearWeek(householdId, weekId) },
    ]);

  const scrollToDay = (day: number) => {
    const y = dayY.current[day];
    if (y !== undefined) scrollRef.current?.scrollTo({ y: planningY.current + y - 8, animated: true });
  };

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  const cookStatus = (entry: MenuEntry) => {
    const first = parseSlot(activeSlots(entry)[0] ?? sortSlots(entry.slots)[0]);
    const veille = entry.cookDay === first.day - 1 && entry.cookMeal === 'soir';
    if (entry.cooked) {
      const d = entry.cookedAt ? new Date(entry.cookedAt) : dateOf(weekId, entry.cookDay);
      const label = `${DAY_SHORT[(d.getDay() + 6) % 7].toLowerCase()}. ${d.getDate()}`;
      return { done: true, text: `Cuisiné ${label}${veille ? ' · la veille' : ''}` };
    }
    const when =
      today !== null && entry.cookDay === today
        ? entry.cookMeal === 'midi' ? 'ce midi' : 'ce soir'
        : `${formatDayShort(weekId, entry.cookDay)} ${entry.cookMeal}`;
    return { done: false, text: `À cuisiner ${when}${veille ? ' · la veille' : ''}` };
  };

  const renderTile = (entry: MenuEntry, slot: SlotKey) => {
    const recipe = recipeOf(entry.recipeId);
    const color = colorOf(entry);
    const active = activeSlots(entry);
    const index = active.indexOf(slot);
    const skipped = (entry.skipped ?? []).find((sk) => sk.slot === slot);
    const eaten = (entry.eaten ?? []).includes(slot);
    const reportedHere = (entry.skipped ?? []).some((sk) => sk.to === slot);
    const isFirst = index === 0;
    const name = recipe?.name ?? 'Recette supprimée';

    // Repas sauté : grisé et barré, avec son éventuel report
    if (skipped) {
      return (
        <TouchableOpacity
          key={`${entry.id}-${slot}`}
          style={[styles.tile, styles.tileSkipped]}
          onPress={() => openEntryActions(entry, slot)}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.tileName, styles.tileNameSkipped]} numberOfLines={1}>{name}</Text>
            <View style={styles.tileStatusRow}>
              <Ionicons name="play-skip-forward-outline" size={13} color={COLORS.textSecondary} />
              <Text style={[styles.tileStatus, { color: COLORS.textSecondary }]} numberOfLines={1}>
                Sauté{skipped.to ? ` · reporté à ${slotLabel(skipped.to)}` : ''}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    const status = isFirst ? cookStatus(entry) : null;
    const suffix = `${eaten ? ' · mangé' : ''}${reportedHere ? ' · reporté' : ''}`;

    return (
      <TouchableOpacity
        key={`${entry.id}-${slot}`}
        style={[styles.tile, { backgroundColor: color.bg }]}
        onPress={() => openEntryActions(entry, slot)}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.tileName} numberOfLines={1}>
            {name}
            {isFirst && active.length > 1 ? (
              <Text style={[styles.tileCount, { color: color.fg }]}> · {active.length} repas</Text>
            ) : null}
          </Text>
          {status ? (
            <View style={styles.tileStatusRow}>
              <Ionicons
                name={status.done ? 'checkmark' : 'flame-outline'}
                size={13}
                color={status.done ? COLORS.green : COLORS.primaryDark}
              />
              <Text style={[styles.tileStatus, { color: status.done ? COLORS.green : COLORS.primaryDark }]} numberOfLines={1}>
                {status.text}{suffix}
              </Text>
            </View>
          ) : (
            <View style={styles.tileStatusRow}>
              <Ionicons
                name={eaten ? 'checkmark-done' : 'return-down-back-outline'}
                size={13}
                color={eaten ? COLORS.green : color.fg}
              />
              <Text style={[styles.tileStatus, { color: eaten ? COLORS.green : color.fg }]} numberOfLines={1}>
                {eaten ? 'Mangé' : 'Restes'} · repas {index + 1}/{active.length}{reportedHere ? ' · reporté' : ''}
              </Text>
            </View>
          )}
        </View>
        {isFirst && (
          <TouchableOpacity
            onPress={() => toggleCooked(entry)}
            hitSlop={6}
            style={[styles.cookCheck, { borderColor: color.ring }, entry.cooked && styles.cookCheckDone]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: entry.cooked }}
            accessibilityLabel={`${name} cuisiné`}
          >
            {entry.cooked && <Ionicons name="checkmark" size={17} color="#fff" />}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderSlot = (day: number, meal: Meal) => {
    const key = slotKey(day, meal);
    const here = placed.filter((e) => e.slots.includes(key));
    return (
      <View key={key} style={styles.slotRow}>
        <Text style={styles.slotLabel}>{meal === 'midi' ? 'Midi' : 'Soir'}</Text>
        <View style={{ flex: 1, gap: 6 }}>
          {here.length > 0 ? (
            here.map((e) => renderTile(e, key))
          ) : (
            <TouchableOpacity style={styles.emptySlot} onPress={() => openAdd(key)} accessibilityRole="button">
              <Ionicons name="add" size={16} color={COLORS.textSecondary} />
              <Text style={styles.emptySlotText}>Ajouter un plat</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const missingByGroup = [
    ...familyGroups
      .map((g) => ({ id: g.id, name: g.name, items: missingItems.filter((i) => i.groupId === g.id) }))
      .filter((g) => g.items.length > 0),
    ...(() => {
      const rest = missingItems.filter((i) => !i.groupId || !familyGroups.some((g) => g.id === i.groupId));
      return rest.length ? [{ id: '__autres', name: 'Autres', items: rest }] : [];
    })(),
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader
        subtitle={formatWeekRange(weekId)}
        title="Menu"
        right={<RoundButton icon="bookmark-outline" label="Menus enregistrés" onPress={() => setShowSaved(true)} />}
      />

      <View style={styles.weekSwitch}>
        <Segmented
          stretch
          value={offset}
          onChange={setOffset}
          options={[
            { value: '-1', label: 'Sem. passée' },
            { value: '0', label: 'Cette semaine' },
            { value: '1', label: 'Sem. prochaine' },
          ]}
        />
        <Text style={styles.caption}>Chaque dimanche, la semaine la plus ancienne est effacée.</Text>
      </View>

      {/* Frise des jours */}
      <View style={styles.dayStrip}>
        {DAY_SHORT.map((d, day) => {
          const isToday = today === day;
          return (
            <TouchableOpacity
              key={d}
              style={[styles.dayPill, isToday && styles.dayPillToday]}
              onPress={() => scrollToDay(day)}
              accessibilityRole="button"
              accessibilityLabel={`${d} ${dateOf(weekId, day).getDate()}${cookDays.has(day) ? ', plat à cuisiner' : ''}`}
            >
              <Text style={[styles.dayPillName, isToday && { color: '#fff' }]}>{d}</Text>
              <Text style={[styles.dayPillDate, isToday && { color: '#fff' }]}>{dateOf(weekId, day).getDate()}</Text>
              {cookDays.has(day) && <View style={[styles.cookDot, isToday && { backgroundColor: '#fff' }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}>
        {/* Articles à acheter */}
        {entries.length > 0 && (
          missingItems.length === 0 ? (
            <View style={[styles.missingPill, { backgroundColor: COLORS.greenSoft }]}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.green} />
              <Text style={[styles.missingPillText, { color: COLORS.green }]}>Tout est à la casa pour ces plats</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.missingPill}
              onPress={() => setShowMissing((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showMissing }}
            >
              <Ionicons name="cart-outline" size={18} color={COLORS.dangerText} />
              <Text style={styles.missingPillText}>
                {missingItems.length} article{missingItems.length > 1 ? 's' : ''} à acheter pour ces plats
              </Text>
              <Ionicons name={showMissing ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.dangerText} />
            </TouchableOpacity>
          )
        )}
        {showMissing && missingItems.length > 0 && (
          <View style={styles.card}>
            {missingByGroup.map((g) => (
              <View key={g.id} style={{ gap: 6 }}>
                <Text style={styles.groupLabel}>{g.name}</Text>
                <View style={styles.chips}>
                  {g.items.map((item) => (
                    <View key={item.id} style={styles.missingChip}>
                      <Text style={styles.missingChipText}>{item.name}{item.unit ? ` · ${item.unit}` : ''}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Plats sans créneau (ancien menu) */}
        {unplaced.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>À placer</Text>
            <Text style={styles.cardHint}>Ces plats n'ont pas encore de jour. Touche-les pour choisir leurs repas.</Text>
            <View style={styles.chips}>
              {unplaced.map((e) => (
                <TouchableOpacity key={e.id} style={styles.unplacedChip} onPress={() => openEdit(e)} accessibilityRole="button">
                  <Text style={styles.unplacedChipText}>{recipeOf(e.recipeId)?.name ?? 'Recette supprimée'}</Text>
                  <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Planning */}
        <View style={styles.planning} onLayout={(e) => { planningY.current = e.nativeEvent.layout.y; }}>
          {DAY_SHORT.map((d, day) => {
            const past = weekIsPast || (today !== null && day < today);
            return (
              <View
                key={d}
                style={[styles.dayRow, day > 0 && styles.dayRowBorder, past && { opacity: 0.55 }]}
                onLayout={(e) => { dayY.current[day] = e.nativeEvent.layout.y; }}
              >
                <View style={styles.dayLabel}>
                  <Text style={[styles.dayLabelName, today === day && { color: COLORS.primary }]}>{d}</Text>
                  <Text style={styles.dayLabelDate}>{dateOf(weekId, day).getDate()}</Text>
                </View>
                <View style={{ flex: 1, gap: 6 }}>{MEALS.map((meal) => renderSlot(day, meal))}</View>
              </View>
            );
          })}
        </View>

        {entries.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={confirmClear} accessibilityRole="button">
            <Ionicons name="trash-outline" size={16} color={COLORS.dangerText} />
            <Text style={styles.clearBtnText}>Vider la semaine</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <MenuEntrySheet
        visible={editor.visible}
        weekId={weekId}
        recipes={recipes}
        initial={editor.initial}
        presetSlot={editor.presetSlot}
        householdId={householdId}
        busySlots={busySlotsExcept(editor.initial?.id ?? null)}
        onSubmit={handleSubmit}
        onClose={closeEditor}
      />

      <ReportMealSheet
        visible={!!report}
        weekId={weekId}
        dishName={report ? recipeOf(report.entry.recipeId)?.name ?? 'Plat' : ''}
        slot={report?.slot ?? null}
        ownSlots={report ? activeSlots(report.entry) : []}
        busySlots={report ? busySlotsExcept(report.entry.id) : []}
        onReport={handleReport}
        onClose={() => setReport(null)}
      />

      <SavedMenusSheet
        visible={showSaved}
        householdId={householdId}
        uid={user?.uid ?? ''}
        weekId={weekId}
        weekLabel={WEEK_LABELS[offset]}
        entries={entries}
        recipes={recipes}
        onApplied={(dest, menu) => {
          setShowSaved(false);
          setOffset(dest === currentWeek ? '0' : '1');
          notify(householdId, '📅 Menu de la semaine', `${senderName()} a appliqué le menu « ${menu.name} »`);
        }}
        onClose={() => setShowSaved(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  weekSwitch: { paddingHorizontal: SPACING.lg - 4, gap: 6, paddingBottom: SPACING.sm + 2 },
  caption: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, paddingHorizontal: SPACING.xs },

  dayStrip: { flexDirection: 'row', gap: 6, paddingHorizontal: SPACING.lg - 4, paddingBottom: SPACING.md - 4 },
  dayPill: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillToday: { backgroundColor: COLORS.primary },
  dayPillName: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  dayPillDate: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  cookDot: { position: 'absolute', bottom: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },

  missingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    marginHorizontal: SPACING.lg - 4,
    marginBottom: SPACING.sm + 4,
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.dangerSoft,
  },
  missingPillText: { flex: 1, fontSize: 14, fontWeight: '800', color: COLORS.dangerText },

  card: {
    marginHorizontal: SPACING.lg - 4,
    marginBottom: SPACING.md - 4,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: SPACING.md,
    gap: SPACING.sm + 2,
    ...SHADOWS.soft,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  cardHint: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  groupLabel: { fontSize: 13, fontWeight: '800', color: COLORS.mustardText },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  missingChip: { backgroundColor: COLORS.dangerSoft, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  missingChipText: { fontSize: 14, fontWeight: '800', color: COLORS.dangerText },
  unplacedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  unplacedChipText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },

  planning: { paddingHorizontal: SPACING.lg - 4 },
  dayRow: { flexDirection: 'row', paddingVertical: SPACING.sm + 2 },
  dayRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.sandDark },
  dayLabel: { width: 44, paddingTop: 4 },
  dayLabelName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  dayLabelDate: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  slotRow: { flexDirection: 'row', alignItems: 'flex-start' },
  slotLabel: { width: 40, paddingTop: 15, fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },

  tile: {
    minHeight: 50,
    borderRadius: 16,
    paddingLeft: SPACING.md - 4,
    paddingRight: SPACING.sm,
    paddingVertical: SPACING.sm - 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tileName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  tileCount: { fontSize: 12, fontWeight: '800' },
  tileStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  tileStatus: { fontSize: 12, fontWeight: '800', flexShrink: 1 },
  cookCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cookCheckDone: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  tileSkipped: { backgroundColor: COLORS.sand, opacity: 0.75 },
  tileNameSkipped: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  emptySlot: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.sandDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptySlotText: { fontSize: 14, fontWeight: '800', color: COLORS.textSecondary },

  clearBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.dangerSoft,
  },
  clearBtnText: { fontSize: FONT_SIZE.md, fontWeight: '800', color: COLORS.dangerText },
});
