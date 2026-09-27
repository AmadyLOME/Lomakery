import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  runTransaction,
  addDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { MenuEntry, SavedMenu, SlotKey } from '../types';
import { addWeeks, sortSlots, weekIdOf } from '../utils/weeks';

// households/{householdId}/weeks/{weekId} → { weekId, entries: MenuEntry[] }
const weekDoc = (householdId: string, weekId: string) =>
  doc(db, 'households', householdId, 'weeks', weekId);

export function normalize(entry: MenuEntry): MenuEntry {
  return { ...entry, eaten: entry.eaten ?? [], skipped: entry.skipped ?? [] };
}

// Créneaux réellement prévus : ceux du plat, moins les repas sautés
export function activeSlots(entry: MenuEntry): SlotKey[] {
  const skipped = new Set((entry.skipped ?? []).map((s) => s.slot));
  return sortSlots(entry.slots.filter((s) => !skipped.has(s)));
}

export function newEntryId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function subscribeToWeek(
  householdId: string,
  weekId: string,
  onChange: (entries: MenuEntry[]) => void
): Unsubscribe {
  return onSnapshot(
    weekDoc(householdId, weekId),
    (snap) => onChange(snap.exists() ? ((snap.data().entries ?? []) as MenuEntry[]) : []),
    (error) => console.error('[weeks] onSnapshot error:', error.code)
  );
}

// Modifie la semaine dans une transaction : deux téléphones qui éditent en même temps
// ne s'écrasent pas.
export async function updateWeek(
  householdId: string,
  weekId: string,
  change: (entries: MenuEntry[]) => MenuEntry[]
) {
  const ref = weekDoc(householdId, weekId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? ((snap.data().entries ?? []) as MenuEntry[]) : [];
    // Firestore refuse les champs `undefined` : on normalise chaque plat
    const entries = change(current.map(normalize)).map((e) => ({ ...normalize(e), slots: sortSlots(e.slots) }));
    tx.set(ref, { weekId, entries });
  });
}

export function upsertEntry(householdId: string, weekId: string, entry: MenuEntry) {
  return updateWeek(householdId, weekId, (entries) =>
    entries.some((e) => e.id === entry.id)
      ? entries.map((e) => (e.id === entry.id ? entry : e))
      : [...entries, entry]
  );
}

export function removeEntry(householdId: string, weekId: string, entryId: string) {
  return updateWeek(householdId, weekId, (entries) => entries.filter((e) => e.id !== entryId));
}

export function setCooked(householdId: string, weekId: string, entryId: string, cooked: boolean) {
  return updateWeek(householdId, weekId, (entries) =>
    entries.map((e) => (e.id === entryId ? { ...e, cooked, cookedAt: cooked ? Date.now() : null } : e))
  );
}

export function setEaten(householdId: string, weekId: string, entryId: string, slot: SlotKey, eaten: boolean) {
  return updateWeek(householdId, weekId, (entries) =>
    entries.map((e) => {
      if (e.id !== entryId) return e;
      const rest = (e.eaten ?? []).filter((s) => s !== slot);
      return { ...e, eaten: eaten ? [...rest, slot] : rest };
    })
  );
}

// Saute un repas ; s'il est reporté, le nouveau créneau s'ajoute au plat
export function skipMeal(householdId: string, weekId: string, entryId: string, slot: SlotKey, to: SlotKey | null) {
  return updateWeek(householdId, weekId, (entries) =>
    entries.map((e) => {
      if (e.id !== entryId) return e;
      // Reporter sur un créneau déjà sauté le « ressuscite »
      const skipped = [...(e.skipped ?? []).filter((s) => s.slot !== slot && s.slot !== to), { slot, to }];
      const slots = to && !e.slots.includes(to) ? [...e.slots, to] : e.slots;
      return { ...e, slots, skipped, eaten: (e.eaten ?? []).filter((s) => s !== slot) };
    })
  );
}

// Annule un « sauté » : le repas redevient prévu et son créneau de report est retiré
export function unskipMeal(householdId: string, weekId: string, entryId: string, slot: SlotKey) {
  return updateWeek(householdId, weekId, (entries) =>
    entries.map((e) => {
      if (e.id !== entryId) return e;
      const record = (e.skipped ?? []).find((s) => s.slot === slot);
      const skipped = (e.skipped ?? []).filter((s) => s.slot !== slot);
      const dropTo = record?.to && !(e.eaten ?? []).includes(record.to) ? record.to : null;
      return { ...e, skipped, slots: dropTo ? e.slots.filter((s) => s !== dropTo) : e.slots };
    })
  );
}

export function clearWeek(householdId: string, weekId: string) {
  return updateWeek(householdId, weekId, () => []);
}

// On ne garde que 3 semaines : la passée, l'actuelle et la prochaine.
// Les semaines plus anciennes sont effacées à l'ouverture du menu
// (revient à supprimer la semaine -2 chaque dimanche, sans serveur).
export async function cleanupOldWeeks(householdId: string) {
  const oldest = addWeeks(weekIdOf(new Date()), -1);
  const snap = await getDocs(collection(db, 'households', householdId, 'weeks'));
  await Promise.all(snap.docs.filter((d) => d.id < oldest).map((d) => deleteDoc(d.ref)));
}

// Reprend l'ancien menu (liste de recettes sans jours) dans la semaine actuelle, « à placer »
export async function migrateLegacyMenu(householdId: string) {
  const legacyRef = doc(db, 'households', householdId, 'weekMenu', 'current');
  const legacy = await getDoc(legacyRef);
  const recipeIds: string[] = legacy.exists() ? legacy.data().recipeIds ?? [] : [];
  if (recipeIds.length > 0) {
    await updateWeek(householdId, weekIdOf(new Date()), (entries) => [
      ...entries,
      ...recipeIds
        .filter((rid) => !entries.some((e) => e.recipeId === rid))
        .map((recipeId) => ({
          id: newEntryId(),
          recipeId,
          slots: [],
          cookDay: 0,
          cookMeal: 'soir' as const,
          cooked: false,
          cookedAt: null,
          eaten: [],
          skipped: [],
        })),
    ]);
  }
  if (legacy.exists()) await deleteDoc(legacyRef);
}

// ─── Menus enregistrés ───────────────────────────────────────────────────────

const savedMenusCol = (householdId: string) => collection(db, 'households', householdId, 'savedMenus');

export function subscribeToSavedMenus(
  householdId: string,
  onChange: (menus: SavedMenu[]) => void
): Unsubscribe {
  return onSnapshot(
    savedMenusCol(householdId),
    (snap) =>
      onChange(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as SavedMenu))
          .sort((a, b) => b.createdAt - a.createdAt)
      ),
    (error) => console.error('[savedMenus] onSnapshot error:', error.code)
  );
}

export async function saveMenu(householdId: string, name: string, entries: MenuEntry[], uid: string) {
  await addDoc(savedMenusCol(householdId), {
    name,
    entries: entries
      .filter((e) => activeSlots(e).length > 0)
      .map((e) => ({ recipeId: e.recipeId, slots: activeSlots(e), cookDay: e.cookDay, cookMeal: e.cookMeal })),
    createdBy: uid,
    createdAt: Date.now(),
  });
}

export function deleteSavedMenu(householdId: string, menuId: string) {
  return deleteDoc(doc(db, 'households', householdId, 'savedMenus', menuId));
}

// Remplace le menu de la semaine choisie ; les dates de cuisson sont relatives à son lundi
export function applySavedMenu(householdId: string, weekId: string, menu: SavedMenu) {
  return updateWeek(householdId, weekId, () =>
    menu.entries.map((e) => ({ ...e, id: newEntryId(), cooked: false, cookedAt: null, eaten: [], skipped: [] }))
  );
}
