import { ShoppingItem } from '../types';
import { Availability } from '../components/Availability';

// Compare les noms sans accents, majuscules ni espaces superflus : « Oignons » = « oignons », « Épices » = « epices »
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/gi, 'oe')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function findItem(name: string, items: ShoppingItem[]): ShoppingItem | undefined {
  const key = normalizeName(name);
  return items.find((i) => normalizeName(i.name) === key);
}

// Disponibilité d'un ingrédient : à la casa, déjà « À acheter », ou absent de la liste
export function ingredientStatus(name: string, items: ShoppingItem[]): Availability {
  const match = findItem(name, items);
  if (!match) return 'missing';
  return match.checked ? 'available' : 'toBuy';
}

// Ingrédients absents de la liste (dédoublonnés, avec les recettes concernées)
// et nombre d'ingrédients déjà « À acheter »
export function collectMissing(
  recipes: { name: string; ingredients?: { name: string }[] }[],
  items: ShoppingItem[]
): { rows: { key: string; name: string; sources: string[] }[]; alreadyToBuy: number } {
  const rows = new Map<string, { key: string; name: string; sources: string[] }>();
  const toBuy = new Set<string>();
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients ?? []) {
      const key = normalizeName(ing.name);
      if (!key) continue;
      const status = ingredientStatus(ing.name, items);
      if (status === 'toBuy') toBuy.add(key);
      if (status !== 'missing') continue;
      const row = rows.get(key) ?? { key, name: ing.name.trim(), sources: [] };
      if (!row.sources.includes(recipe.name)) row.sources.push(recipe.name);
      rows.set(key, row);
    }
  }
  return { rows: [...rows.values()], alreadyToBuy: toBuy.size };
}
