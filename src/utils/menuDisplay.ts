import { MenuEntry, SlotKey } from '../types';
import { activeSlots } from '../services/weekPlan';
import { DAY_SHORT, dateOf, formatDayShort, parseSlot, sortSlots } from './weeks';

// Texte de cuisson d'un plat : « À cuisiner ce soir · la veille », « Cuisiné dim. 27 »
export function cookStatus(entry: MenuEntry, weekId: string, today: number | null): { done: boolean; text: string } {
  const first = parseSlot(activeSlots(entry)[0] ?? sortSlots(entry.slots)[0]);
  const veille = entry.cookDay === first.day - 1 && entry.cookMeal === 'soir';
  if (entry.cooked) {
    const d = entry.cookedAt ? new Date(entry.cookedAt) : dateOf(weekId, entry.cookDay);
    const label = `${DAY_SHORT[(d.getDay() + 6) % 7].toLowerCase()}. ${d.getDate()}`;
    return { done: true, text: `Cuisiné ${label}${veille ? ' · la veille' : ''}` };
  }
  const when =
    today !== null && entry.cookDay === today
      ? entry.cookMeal === 'midi' ? 'ce midi' : 'ce soir'
      : `${formatDayShort(weekId, entry.cookDay)} ${entry.cookMeal}`;
  return { done: false, text: `À cuisiner ${when}${veille ? ' · la veille' : ''}` };
}

export type MealState =
  | { kind: 'cook' }                              // repas de cuisson (premier repas prévu)
  | { kind: 'rest'; index: number; total: number; eaten: boolean }
  | { kind: 'skipped'; to: SlotKey | null };

// État d'un repas précis d'un plat
export function mealState(entry: MenuEntry, slot: SlotKey): MealState {
  const skipped = (entry.skipped ?? []).find((s) => s.slot === slot);
  if (skipped) return { kind: 'skipped', to: skipped.to };
  const active = activeSlots(entry);
  const index = active.indexOf(slot);
  if (index === 0) return { kind: 'cook' };
  return { kind: 'rest', index: index + 1, total: active.length, eaten: (entry.eaten ?? []).includes(slot) };
}
