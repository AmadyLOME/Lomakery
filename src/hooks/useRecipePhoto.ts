import { useEffect, useState } from 'react';
import { getRecipePhoto } from '../services/recipes';
import { toDataUri } from '../services/photos';

// Cache mémoire partagé entre écrans, indexé par recette + version de la photo
const cache = new Map<string, string | null>();

// Charge la photo d'une recette à la demande. `version` = recipe.photoUpdatedAt :
// absent → pas de photo ; nouvelle valeur → la photo a changé, on la recharge.
export function useRecipePhoto(householdId: string, recipeId: string, version?: number): string | null {
  const key = `${recipeId}:${version}`;
  const [uri, setUri] = useState<string | null>(() => (version ? cache.get(key) ?? null : null));

  useEffect(() => {
    if (!version || !householdId) {
      setUri(null);
      return;
    }
    if (cache.has(key)) {
      setUri(cache.get(key) ?? null);
      return;
    }
    let active = true;
    getRecipePhoto(householdId, recipeId)
      .then((data) => {
        const value = data ? toDataUri(data) : null;
        cache.set(key, value);
        if (active) setUri(value);
      })
      .catch((e) => console.error('[recipePhoto] load error:', e?.code ?? e));
    return () => { active = false; };
  }, [householdId, recipeId, version]);

  return uri;
}
