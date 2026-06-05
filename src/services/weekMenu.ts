import {
  doc,
  setDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

const menuDoc = (householdId: string) =>
  doc(db, 'households', householdId, 'weekMenu', 'current');

export function subscribeToWeekMenu(
  householdId: string,
  onChange: (recipeIds: string[]) => void
): Unsubscribe {
  return onSnapshot(menuDoc(householdId), (snap) => {
    onChange(snap.exists() ? (snap.data().recipeIds ?? []) : []);
  });
}

export async function addToWeekMenu(householdId: string, currentIds: string[], recipeId: string) {
  if (currentIds.includes(recipeId)) return;
  await setDoc(menuDoc(householdId), { recipeIds: [...currentIds, recipeId] });
}

export async function removeFromWeekMenu(householdId: string, currentIds: string[], recipeId: string) {
  await setDoc(menuDoc(householdId), { recipeIds: currentIds.filter((id) => id !== recipeId) });
}

export async function resetWeekMenu(householdId: string) {
  await setDoc(menuDoc(householdId), { recipeIds: [] });
}
