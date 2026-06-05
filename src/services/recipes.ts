import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Recipe, RecipeIngredient } from '../types';

export function subscribeToRecipes(
  householdId: string,
  onChange: (recipes: Recipe[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'households', householdId, 'recipes'),
    (snap) => {
      const recipes = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Recipe));
      onChange(recipes);
    },
    (error) => console.error('[recipes] onSnapshot error:', error.code, error.message)
  );
}

export async function addRecipe(
  householdId: string,
  name: string,
  description: string,
  createdBy: string
): Promise<string> {
  const ref = await addDoc(collection(db, 'households', householdId, 'recipes'), {
    name,
    description: description || '',
    ingredients: [],
    createdBy,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteRecipe(householdId: string, recipeId: string) {
  await deleteDoc(doc(db, 'households', householdId, 'recipes', recipeId));
}

export async function updateRecipeIngredients(
  householdId: string,
  recipeId: string,
  ingredients: RecipeIngredient[]
) {
  await updateDoc(doc(db, 'households', householdId, 'recipes', recipeId), { ingredients });
}
