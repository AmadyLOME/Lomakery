import { Meal, SlotKey } from '../types';

// Une semaine commence le lundi. Son identifiant est la date du lundi : "2026-09-28".

export const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
export const DAY_LONG = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function weekIdOf(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7; // lundi = 0
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function weekStart(weekId: string): Date {
  const [y, m, d] = weekId.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addWeeks(weekId: string, n: number): string {
  const d = weekStart(weekId);
  d.setDate(d.getDate() + n * 7);
  return weekIdOf(d);
}

// Date d'un jour de la semaine ; dayIndex -1 = le dimanche précédent
export function dateOf(weekId: string, dayIndex: number): Date {
  const d = weekStart(weekId);
  d.setDate(d.getDate() + dayIndex);
  return d;
}

export function formatDayShort(weekId: string, dayIndex: number): string {
  const d = dateOf(weekId, dayIndex);
  return `${DAY_SHORT[(d.getDay() + 6) % 7].toLowerCase()}. ${d.getDate()}`;
}

export function formatWeekRange(weekId: string): string {
  const a = dateOf(weekId, 0);
  const b = dateOf(weekId, 6);
  const left = a.getMonth() === b.getMonth() ? `${a.getDate()}` : `${a.getDate()} ${MONTHS[a.getMonth()]}`;
  return `${left} → ${b.getDate()} ${MONTHS[b.getMonth()]}`;
}

export function slotKey(day: number, meal: Meal): SlotKey {
  return `${day}-${meal}` as SlotKey;
}

export function parseSlot(slot: SlotKey): { day: number; meal: Meal } {
  const [d, meal] = slot.split('-');
  return { day: Number(d), meal: meal as Meal };
}

// Ordre chronologique des créneaux : lun midi, lun soir, mar midi…
export function slotOrder(slot: SlotKey): number {
  const { day, meal } = parseSlot(slot);
  return day * 2 + (meal === 'soir' ? 1 : 0);
}

export function sortSlots(slots: SlotKey[]): SlotKey[] {
  return [...slots].sort((a, b) => slotOrder(a) - slotOrder(b));
}

export function todayDayIndex(weekId: string): number | null {
  const today = new Date();
  if (weekIdOf(today) !== weekId) return null;
  return (today.getDay() + 6) % 7;
}
