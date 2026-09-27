const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// « Dimanche 27 sept. »
export function formatLongDate(d: Date): string {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// « à l'instant », « il y a 5 min », « 10 h 12 », « hier », « 3 j », « 12 sept. »
export function formatRelative(ts: number, now = Date.now()): string {
  const diff = now - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const d = new Date(ts);
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (ts >= startOfToday) return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`;
  const days = Math.ceil((startOfToday - ts) / 86400000);
  if (days <= 1) return 'hier';
  if (days < 7) return `${days} j`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
