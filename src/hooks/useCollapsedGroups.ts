import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Groupes repliés d'une liste, mémorisés sur le téléphone (clé propre à chaque liste)
export function useCollapsedGroups(storageKey: string) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((raw) => { if (raw) setCollapsed(new Set(JSON.parse(raw))); })
      .catch(() => {});
  }, [storageKey]);

  const persist = (next: Set<string>) => {
    AsyncStorage.setItem(storageKey, JSON.stringify([...next])).catch(() => {});
    return next;
  };

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return persist(next);
    });

  // Tout replier si au moins un groupe est ouvert, sinon tout déplier
  const toggleAll = (ids: string[]) =>
    setCollapsed((prev) => persist(ids.every((id) => prev.has(id)) ? new Set() : new Set(ids)));

  const allCollapsed = (ids: string[]) => ids.length > 0 && ids.every((id) => collapsed.has(id));

  return { collapsed, toggle, toggleAll, allCollapsed };
}
