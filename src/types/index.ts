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
  fcmToken?: string;
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
}
