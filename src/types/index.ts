export type Category =
  | 'fruits_legumes'
  | 'viandes_poissons'
  | 'produits_laitiers'
  | 'epicerie'
  | 'boissons'
  | 'hygiene'
  | 'entretien'
  | 'surgeles'
  | 'boulangerie'
  | 'autre';

export interface ShoppingItem {
  id: string;
  name: string;
  category: Category;
  groupId?: string;
  quantity: number;
  unit?: string;
  checked: boolean;
  addedBy: string;
  createdAt: Date;
  // Gestion de stock
  stock?: number;       // quantité actuelle disponible
  threshold?: number;   // seuil en dessous duquel → À acheter
}

export interface ShoppingGroup {
  id: string;
  name: string;
  createdAt: Date;
}

export interface ShoppingList {
  id: string;
  name: string;
  type: 'family' | 'personal';
  ownerId: string;
  householdId?: string;
  items: ShoppingItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  householdId?: string;
}

export interface Household {
  id: string;
  name: string;
  members: string[];
  inviteCode: string;
  createdAt: Date;
}

export interface RecipeIngredient {
  id: string;
  name: string;
  quantity?: string; // ex: "200g", "2", "1 pincée"
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  ingredients: RecipeIngredient[];
  createdBy: string;
  createdAt: Date;
  // Présent si la recette a une photo (dans recipePhotos/{id}) ; sert aussi de clé de cache
  photoUpdatedAt?: number;
}

export interface MemberProfile {
  uid: string;
  displayName: string;
  photo?: string; // JPEG base64
}

// ─── Menu de la semaine ──────────────────────────────────────────────────────

export type Meal = 'midi' | 'soir';
export type SlotKey = `${number}-${Meal}`; // "0-midi" = lundi midi, "6-soir" = dimanche soir

// Un plat du menu : cuisiné une fois, mangé sur un ou plusieurs créneaux (pas forcément consécutifs)
export interface MenuEntry {
  id: string;
  recipeId: string;
  slots: SlotKey[];     // vide = « à placer »
  cookDay: number;      // jour de cuisson relatif au lundi : -1 = dimanche précédent … 6
  cookMeal: Meal;
  cooked: boolean;
  cookedAt: number | null;
  eaten?: SlotKey[];        // repas effectivement mangés
  skipped?: SkippedMeal[];  // repas sautés (restent affichés, grisés)
}

// Un repas sauté, éventuellement reporté sur un autre créneau (ajouté à `slots`)
export interface SkippedMeal {
  slot: SlotKey;
  to: SlotKey | null;
}

// households/{id}/weeks/{weekId} — weekId = date du lundi (AAAA-MM-JJ)
export interface WeekPlan {
  weekId: string;
  entries: MenuEntry[];
}

// households/{id}/savedMenus/{id} — positions relatives, réutilisables sur n'importe quelle semaine
export interface SavedMenu {
  id: string;
  name: string;
  entries: Pick<MenuEntry, 'recipeId' | 'slots' | 'cookDay' | 'cookMeal'>[];
  createdBy: string;
  createdAt: number;
}

// ─── Accueil ─────────────────────────────────────────────────────────────────

// households/{id}/notes/{noteId} — un petit mot sur le mur de la famille
export interface FamilyNote {
  id: string;
  text: string;
  authorUid: string;
  authorName: string;
  createdAt: number;
  pinned: boolean;
}

export interface InfoField {
  label: string;
  value: string;
  secret: boolean;            // masqué par défaut (codes)
  kind: 'text' | 'phone';     // « phone » : bouton appeler
}

// households/{id}/infos/{infoId} — une fiche d'infos utiles (Wi-Fi, pédiatre…)
export interface InfoCard {
  id: string;
  title: string;
  color: number;              // index dans la palette des fiches
  fields: InfoField[];
  updatedBy: string;
  updatedByName: string;
  updatedAt: number;
}
