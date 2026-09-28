import { softColor } from '../constants/palette';
import { normalizeName } from './ingredients';

// Couleur stable d'une étiquette, dérivée de son nom
export function tagColor(tag: string) {
  const key = normalizeName(tag);
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return softColor(h);
}

// Toutes les étiquettes utilisées par les recettes, triées, sans doublon (accents / majuscules)
export function allTags(recipes: { tags?: string[] }[]): string[] {
  const seen = new Map<string, string>();
  for (const r of recipes) for (const t of r.tags ?? []) {
    const k = normalizeName(t);
    if (k && !seen.has(k)) seen.set(k, t.trim());
  }
  const collator = new Intl.Collator('fr', { sensitivity: 'base' });
  return [...seen.values()].sort(collator.compare);
}

export function hasTag(tags: string[] | undefined, tag: string): boolean {
  const k = normalizeName(tag);
  return (tags ?? []).some((t) => normalizeName(t) === k);
}
