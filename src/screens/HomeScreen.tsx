import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, AccessibilityInfo } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import ScreenHeader from '../components/ScreenHeader';
import Avatar from '../components/Avatar';
import PolaroidGarland from '../components/PolaroidGarland';
import { useAuth } from '../hooks/useAuth';
import { subscribeToMembers } from '../services/members';
import { subscribeToWeek, setCooked, setEaten, activeSlots } from '../services/weekPlan';
import { subscribeToRecipes } from '../services/recipes';
import { subscribeToFamilyList } from '../services/lists';
import { subscribeToNotes } from '../services/notes';
import { subscribeToInfos } from '../services/infos';
import { subscribeToFamilyPhotos } from '../services/familyPhotos';
import { FamilyNote, FamilyPhoto, InfoCard, Meal, MemberProfile, MenuEntry, Recipe, ShoppingItem } from '../types';
import { slotKey, todayDayIndex, weekIdOf } from '../utils/weeks';
import { cookStatus, mealState } from '../utils/menuDisplay';
import { formatLongDate, formatRelative } from '../utils/time';
import { softColor } from '../constants/palette';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TAB_BAR_SPACE } from '../constants/theme';
import { scale } from '../utils/responsive';

const MEALS: Meal[] = ['midi', 'soir'];

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, profile } = useAuth();
  const householdId: string = profile?.householdId ?? '';
  const weekId = weekIdOf(new Date());
  const today = todayDayIndex(weekId) ?? 0;

  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [entries, setEntries] = useState<MenuEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [notes, setNotes] = useState<FamilyNote[]>([]);
  const [infos, setInfos] = useState<InfoCard[]>([]);
  const [photos, setPhotos] = useState<FamilyPhoto[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);
  const focused = useIsFocused();

  // Respecte le réglage iOS « Réduire les animations »
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!householdId) return;
    const unsubs = [
      subscribeToMembers(householdId, setMembers),
      subscribeToWeek(householdId, weekId, setEntries),
      subscribeToRecipes(householdId, setRecipes),
      subscribeToFamilyList(householdId, setItems),
      subscribeToNotes(householdId, setNotes),
      subscribeToInfos(householdId, setInfos),
      subscribeToFamilyPhotos(householdId, setPhotos),
    ];
    return () => unsubs.forEach((u) => u());
  }, [householdId, weekId]);

  const me = members.find((m) => m.uid === user?.uid);
  const others = members.filter((m) => m.uid !== user?.uid);
  const firstName = (user?.displayName ?? '').split(' ')[0];
  const recipeName = (id: string) => recipes.find((r) => r.id === id)?.name ?? 'Recette supprimée';

  // Courses
  const toBuy = items.filter((i) => !i.checked).length;
  const lowStock = items.filter((i) => i.stock !== undefined && i.threshold !== undefined && i.stock <= i.threshold).length;

  // Menu
  const placed = entries.filter((e) => e.slots.length > 0);
  const todayMeals = MEALS.map((meal) => ({
    meal,
    entries: placed.filter((e) => e.slots.includes(slotKey(today, meal))),
  }));
  // Plats à cuisiner aujourd'hui pour un repas d'un autre jour (ex. « la veille »)
  const cookAhead = placed.filter((e) => {
    const first = activeSlots(e)[0];
    return !e.cooked && e.cookDay === today && first && !first.startsWith(`${today}-`);
  });
  const nothingToday = todayMeals.every((m) => m.entries.length === 0) && cookAhead.length === 0;

  const previewNotes = notes.slice(0, 2);

  const renderMealEntry = (entry: MenuEntry, meal: Meal) => {
    const slot = slotKey(today, meal);
    const state = mealState(entry, slot);
    let status: string;
    let tone: string;
    let checked = false;
    let onCheck: (() => void) | null = null;

    if (state.kind === 'cook') {
      const s = cookStatus(entry, weekId, today);
      status = s.text;
      tone = s.done ? COLORS.inkSoft : '#F5B58F';
      checked = entry.cooked;
      onCheck = () => setCooked(householdId, weekId, entry.id, !entry.cooked);
    } else if (state.kind === 'rest') {
      status = `${state.eaten ? 'Mangé' : 'Restes'} · repas ${state.index}/${state.total}`;
      tone = COLORS.inkSoft;
      checked = state.eaten;
      onCheck = () => setEaten(householdId, weekId, entry.id, slot, !state.eaten);
    } else {
      status = 'Sauté';
      tone = '#9FB39F';
    }

    return (
      <View key={entry.id} style={styles.todayEntry}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.todayDish, state.kind === 'skipped' && styles.todayDishSkipped]} numberOfLines={1}>
            {recipeName(entry.recipeId)}
          </Text>
          <Text style={[styles.todayStatus, { color: tone }]} numberOfLines={1}>{status}</Text>
        </View>
        {onCheck && (
          <TouchableOpacity
            onPress={onCheck}
            hitSlop={6}
            style={[styles.todayCheck, checked && styles.todayCheckDone]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={`${recipeName(entry.recipeId)} ${state.kind === 'cook' ? 'cuisiné' : 'mangé'}`}
          >
            {checked && <Ionicons name="checkmark" size={16} color={COLORS.ink} />}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        subtitle={formatLongDate(new Date())}
        title={firstName ? `Bonjour ${firstName}` : 'Bonjour'}
        right={
          <TouchableOpacity
            style={styles.avatars}
            onPress={() => navigation.navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel="Ouvrir le profil et les réglages"
          >
            {others.slice(0, 3).map((m) => (
              <View key={m.uid} style={styles.stacked}>
                <Avatar name={m.displayName} photo={m.photo} size={scale(34)} />
              </View>
            ))}
            <View style={styles.stacked}>
              <Avatar name={user?.displayName ?? undefined} photo={me?.photo} size={scale(40)} />
              <View style={styles.gearBadge}>
                <Ionicons name="settings-sharp" size={11} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Photos de famille : guirlande de polaroïds (pleine largeur) */}
        <View style={styles.garland}>
          <PolaroidGarland
            photos={photos}
            animate={focused && !reduceMotion}
            onPress={() => navigation.navigate('Photos')}
          />
        </View>

        {/* Aujourd'hui */}
        <View style={styles.todayCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.todayTitle}>AUJOURD'HUI</Text>
            <TouchableOpacity onPress={() => navigation.navigate('WeekMenu')} accessibilityRole="button">
              <Text style={styles.todayLink}>Voir le menu ›</Text>
            </TouchableOpacity>
          </View>

          {nothingToday ? (
            <TouchableOpacity style={styles.todayEmpty} onPress={() => navigation.navigate('WeekMenu')} accessibilityRole="button">
              <Text style={styles.todayEmptyText}>Rien de prévu aujourd'hui</Text>
              <Text style={styles.todayLink}>Planifier ›</Text>
            </TouchableOpacity>
          ) : (
            <>
              {todayMeals.map(({ meal, entries: list }, i) => (
                <View key={meal}>
                  {i > 0 && <View style={styles.todayDivider} />}
                  <View style={styles.todayRow}>
                    <Text style={styles.todayMeal}>{meal === 'midi' ? 'Midi' : 'Soir'}</Text>
                    <View style={{ flex: 1, gap: 8 }}>
                      {list.length > 0 ? (
                        list.map((e) => renderMealEntry(e, meal))
                      ) : (
                        <Text style={styles.todayNone}>Rien de prévu</Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
              {cookAhead.length > 0 && (
                <>
                  <View style={styles.todayDivider} />
                  {cookAhead.map((e) => (
                    <View key={e.id} style={styles.todayEntry}>
                      <Ionicons name="flame-outline" size={16} color="#F5B58F" />
                      <Text style={[styles.todayStatus, { flex: 1, color: '#F5B58F' }]} numberOfLines={1}>
                        À cuisiner {e.cookMeal === 'midi' ? 'ce midi' : 'ce soir'} : {recipeName(e.recipeId)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setCooked(householdId, weekId, e.id, true)}
                        hitSlop={6}
                        style={styles.todayCheck}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: false }}
                        accessibilityLabel={`${recipeName(e.recipeId)} cuisiné`}
                      />
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>

        {/* Tuiles */}
        <View style={styles.tiles}>
          <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('FamilyList')} accessibilityRole="button">
            <Ionicons name="cart" size={20} color={COLORS.primary} />
            <Text style={styles.tileValue}>{toBuy} à acheter</Text>
            {lowStock > 0 ? (
              <View style={styles.tileChip}>
                <Text style={styles.tileChipText}>{lowStock} stock{lowStock > 1 ? 's' : ''} bas</Text>
              </View>
            ) : (
              <Text style={styles.tileHint}>Liste de courses</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('WeekMenu')} accessibilityRole="button">
            <Ionicons name="calendar" size={20} color={COLORS.primary} />
            <Text style={styles.tileValue}>{placed.length} plat{placed.length > 1 ? 's' : ''}</Text>
            <Text style={styles.tileHint}>prévus cette semaine</Text>
          </TouchableOpacity>
        </View>

        {/* Mots de la famille */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Mots de la famille</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Notes')} accessibilityRole="button">
              <Text style={styles.link}>Tout voir ›</Text>
            </TouchableOpacity>
          </View>
          {previewNotes.length === 0 ? (
            <Text style={styles.hint}>Aucun mot pour l'instant. Un rappel, une info pour la famille ?</Text>
          ) : (
            previewNotes.map((n) => (
              <View key={n.id} style={[styles.notePreview, n.pinned && { backgroundColor: COLORS.sand }]}>
                {n.pinned && <Ionicons name="pin" size={15} color={COLORS.mustardText} style={{ marginTop: 2 }} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.noteText} numberOfLines={2}>{n.text}</Text>
                  <Text style={styles.noteMeta}>{n.authorName} · {formatRelative(n.createdAt)}</Text>
                </View>
              </View>
            ))
          )}
          <TouchableOpacity style={styles.writeBtn} onPress={() => navigation.navigate('Notes', { compose: true })} accessibilityRole="button">
            <Ionicons name="add" size={18} color={COLORS.text} />
            <Text style={styles.writeBtnText}>Écrire un mot</Text>
          </TouchableOpacity>
        </View>

        {/* Infos utiles */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Infos utiles</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Infos')} accessibilityRole="button">
              <Text style={styles.link}>Tout voir ›</Text>
            </TouchableOpacity>
          </View>
          {infos.length === 0 ? (
            <TouchableOpacity onPress={() => navigation.navigate('Infos')} accessibilityRole="button">
              <Text style={styles.hint}>Wi-Fi, pédiatre, code du portail… Ajoute les infos que tout le foyer doit avoir sous la main ›</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.chips}>
              {infos.map((info) => {
                const c = softColor(info.color);
                return (
                  <TouchableOpacity
                    key={info.id}
                    style={[styles.infoChip, { backgroundColor: c.bg }]}
                    onPress={() => navigation.navigate('Infos')}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.infoChipText, { color: c.fg }]}>{info.title}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.lg - 4, paddingBottom: TAB_BAR_SPACE, gap: SPACING.md - 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  garland: { marginHorizontal: -(SPACING.lg - 4), marginBottom: -SPACING.xs },

  avatars: { flexDirection: 'row', alignItems: 'center' },
  stacked: { marginLeft: -10, borderRadius: 999, borderWidth: 2, borderColor: COLORS.background },
  gearBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  todayCard: { backgroundColor: COLORS.ink, borderRadius: 26, padding: SPACING.md + 2, gap: SPACING.sm + 2 },
  todayTitle: { fontSize: 14, fontWeight: '800', color: COLORS.mustardLight, letterSpacing: 1 },
  todayLink: { fontSize: 13, fontWeight: '800', color: COLORS.inkSoft },
  todayRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md - 4 },
  todayMeal: { width: 40, paddingTop: 2, fontSize: 13, fontWeight: '700', color: COLORS.inkSoft },
  todayEntry: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 2 },
  todayDish: { fontSize: 16, fontWeight: '800', color: '#FBF6EA' },
  todayDishSkipped: { textDecorationLine: 'line-through', color: '#9FB39F' },
  todayStatus: { fontSize: 12, fontWeight: '800' },
  todayNone: { fontSize: 14, fontWeight: '600', color: '#9FB39F', paddingTop: 1 },
  todayCheck: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2.5,
    borderColor: COLORS.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCheckDone: { backgroundColor: COLORS.inkSoft },
  todayDivider: { height: 1, backgroundColor: 'rgba(207,224,207,0.2)', marginVertical: 2 },
  todayEmpty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.xs },
  todayEmptyText: { fontSize: 16, fontWeight: '700', color: '#FBF6EA' },

  tiles: { flexDirection: 'row', gap: SPACING.sm + 2 },
  tile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: SPACING.md - 2,
    gap: 4,
    ...SHADOWS.soft,
  },
  tileValue: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  tileHint: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  tileChip: { alignSelf: 'flex-start', backgroundColor: COLORS.dangerSoft, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 8, paddingVertical: 1 },
  tileChipText: { fontSize: 12, fontWeight: '800', color: COLORS.dangerText },

  card: { backgroundColor: COLORS.surface, borderRadius: 24, padding: SPACING.md, gap: SPACING.sm + 2, ...SHADOWS.soft },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  link: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  hint: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted, lineHeight: 20 },
  notePreview: { flexDirection: 'row', gap: SPACING.sm + 2, backgroundColor: COLORS.background, borderRadius: 16, padding: SPACING.sm + 4 },
  noteText: { fontSize: 14, fontWeight: '700', color: COLORS.text, lineHeight: 19 },
  noteMeta: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginTop: 2 },
  writeBtn: {
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  writeBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  infoChip: { borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 7 },
  infoChipText: { fontSize: 13, fontWeight: '800' },
});
