import {
  collection,
  doc,
  addDoc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Recipe, RecipeIngredient } from '../types';

export type RecipeFields = Partial<Pick<Recipe, 'name' | 'description' | 'servings' | 'tags' | 'steps' | 'prepMin' | 'cookMin' | 'restMin'>>;

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
    servings: 4,
    tags: [],
    steps: [],
    createdBy,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// Met à jour des champs de la recette ; `undefined` efface le champ (Firestore refuse `undefined`)
export async function updateRecipe(householdId: string, recipeId: string, fields: RecipeFields) {
  const data: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) data[key] = value === undefined ? deleteField() : value;
  await updateDoc(doc(db, 'households', householdId, 'recipes', recipeId), data);
}

export async function deleteRecipe(householdId: string, recipeId: string) {
  await deleteDoc(doc(db, 'households', householdId, 'recipes', recipeId));
  await deleteDoc(recipePhotoDoc(householdId, recipeId));
}

// Photos : households/{householdId}/recipePhotos/{recipeId} → { data: JPEG base64 }.
// Séparées des recettes pour ne pas les télécharger à chaque mise à jour de la liste.
const recipePhotoDoc = (householdId: string, recipeId: string) =>
  doc(db, 'households', householdId, 'recipePhotos', recipeId);

export async function getRecipePhoto(householdId: string, recipeId: string): Promise<string | null> {
  const snap = await getDoc(recipePhotoDoc(householdId, recipeId));
  return snap.exists() ? (snap.data().data as string) : null;
}

export async function setRecipePhoto(householdId: string, recipeId: string, base64: string | null) {
  const recipeRef = doc(db, 'households', householdId, 'recipes', recipeId);
  if (base64) {
    await setDoc(recipePhotoDoc(householdId, recipeId), { data: base64 });
    await updateDoc(recipeRef, { photoUpdatedAt: Date.now() });
  } else {
    await updateDoc(recipeRef, { photoUpdatedAt: deleteField() });
    await deleteDoc(recipePhotoDoc(householdId, recipeId));
  }
}

export async function updateRecipeIngredients(
  householdId: string,
  recipeId: string,
  ingredients: RecipeIngredient[]
) {
  await updateDoc(doc(db, 'households', householdId, 'recipes', recipeId), { ingredients });
}
