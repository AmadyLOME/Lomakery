import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { ShoppingItem, ShoppingGroup, Category } from '../types';

// Ordre alphabétique français, sans tenir compte des majuscules ni des accents (« Œufs » avec les O)
const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
function byName<T extends { name: string }>(a: T, b: T) {
  return collator.compare(a.name.trim(), b.name.trim());
}

// Écoute en temps réel les groupes de la liste famille
export function subscribeToFamilyGroups(
  householdId: string,
  onChange: (groups: ShoppingGroup[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'households', householdId, 'familyGroups'),
    (snap) => {
      const groups = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShoppingGroup));
      onChange(groups.sort(byName));
    },
    (error) => console.error('[familyGroups] onSnapshot error:', error.code)
  );
}

export async function addFamilyGroup(householdId: string, name: string): Promise<string> {
  const ref = await addDoc(collection(db, 'households', householdId, 'familyGroups'), {
    name,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateFamilyGroup(householdId: string, groupId: string, name: string) {
  await updateDoc(doc(db, 'households', householdId, 'familyGroups', groupId), { name });
}

export async function deleteFamilyGroup(householdId: string, groupId: string) {
  await deleteDoc(doc(db, 'households', householdId, 'familyGroups', groupId));
}

// Écoute en temps réel la liste famille du foyer
export function subscribeToFamilyList(
  householdId: string,
  onChange: (items: ShoppingItem[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'households', householdId, 'familyList'),
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShoppingItem));
      onChange(items.sort(byName));
    },
    (error) => console.error('[familyList] onSnapshot error:', error.code)
  );
}

// Écoute en temps réel la liste personnelle d'un utilisateur
export function subscribeToPersonalList(
  uid: string,
  onChange: (items: ShoppingItem[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, 'users', uid, 'personalList'), (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShoppingItem));
    onChange(items);
  });
}

async function addItem(
  collectionPath: string,
  item: Omit<ShoppingItem, 'id' | 'createdAt'>
): Promise<string> {
  // Firestore n'accepte pas undefined — on filtre les champs non définis
  const data: Record<string, any> = { createdAt: serverTimestamp() };
  for (const [key, value] of Object.entries(item)) {
    if (value !== undefined) data[key] = value;
  }
  const ref = await addDoc(collection(db, collectionPath), data);
  return ref.id;
}

export function addFamilyItem(householdId: string, item: Omit<ShoppingItem, 'id' | 'createdAt'>) {
  return addItem(`households/${householdId}/familyList`, item);
}

// Crée plusieurs articles « À acheter » d'un coup (ingrédients absents d'une recette ou du menu)
export async function addMissingItems(
  householdId: string,
  entries: { name: string; groupId?: string }[],
  addedBy: string
) {
  await Promise.all(
    entries.map(({ name, groupId }) =>
      addFamilyItem(householdId, { name, groupId, category: 'autre', quantity: 1, checked: false, addedBy })
    )
  );
}

export function addPersonalItem(uid: string, item: Omit<ShoppingItem, 'id' | 'createdAt'>) {
  return addItem(`users/${uid}/personalList`, item);
}

export async function toggleItem(collectionPath: string, itemId: string, checked: boolean) {
  await updateDoc(doc(db, collectionPath, itemId), { checked });
}

// Ajoute qty au stock existant.
// Si nouveau total > seuil → passe À la casa. Sinon reste À acheter avec stock mis à jour.
export async function checkItemWithStock(
  collectionPath: string,
  itemId: string,
  addedQty: number,
  currentStock: number,
  threshold: number
) {
  const newStock = currentStock + addedQty;
  await updateDoc(doc(db, collectionPath, itemId), {
    stock: newStock,
    checked: newStock > threshold,
  });
}

export async function decrementStock(collectionPath: string, item: ShoppingItem) {
  const newStock = (item.stock ?? 1) - 1;
  const threshold = item.threshold ?? 0;
  const shouldBuy = newStock <= threshold;
  await updateDoc(doc(db, collectionPath, item.id), {
    stock: newStock,
    checked: !shouldBuy,
  });
}

export async function incrementStock(collectionPath: string, item: ShoppingItem) {
  const newStock = (item.stock ?? 0) + 1;
  const threshold = item.threshold ?? 0;
  const shouldBuy = newStock <= threshold;
  await updateDoc(doc(db, collectionPath, item.id), {
    stock: newStock,
    checked: !shouldBuy,
  });
}

export async function updateItem(
  collectionPath: string,
  itemId: string,
  fields: Partial<Pick<ShoppingItem, 'name' | 'unit' | 'groupId' | 'stock' | 'threshold'>>
) {
  const data: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) {
    // undefined = champ à effacer dans Firestore
    data[key] = value !== undefined ? value : deleteField();
  }
  await updateDoc(doc(db, collectionPath, itemId), data);
}

export async function deleteItem(collectionPath: string, itemId: string) {
  await deleteDoc(doc(db, collectionPath, itemId));
}

export async function clearCheckedItems(collectionPath: string, items: ShoppingItem[]) {
  const checked = items.filter((i) => i.checked);
  await Promise.all(checked.map((i) => deleteDoc(doc(db, collectionPath, i.id))));
}
