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
import { MenuEntry, SavedMenu } from '../types';
import { addWeeks, sortSlots, weekIdOf } from '../utils/weeks';

// households/{householdId}/weeks/{weekId} → { weekId, entries: MenuEntry[] }
const weekDoc = (householdId: string, weekId: string) =>
  doc(db, 'households', householdId, 'weeks', weekId);

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
    const entries = change(current).map((e) => ({ ...e, slots: sortSlots(e.slots) }));
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
      .filter((e) => e.slots.length > 0)
      .map(({ recipeId, slots, cookDay, cookMeal }) => ({ recipeId, slots, cookDay, cookMeal })),
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
    menu.entries.map((e) => ({ ...e, id: newEntryId(), cooked: false, cookedAt: null }))
  );
}
