// Recalcule une quantité saisie en texte libre selon les portions : « 1 kg » ×1,5 → « 1,5 kg ».
// Le premier nombre est multiplié (entier, décimal avec virgule ou point, fraction « 1/2 ») ;
// un texte sans nombre (« une pincée ») est rendu tel quel.

const NUMBER = /(\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+))?/;

export function formatNumber(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return String(rounded).replace('.', ',');
}

export function scaleQuantity(qty: string | undefined, factor: number): string | undefined {
  if (!qty || factor === 1) return qty;
  const m = qty.match(NUMBER);
  if (!m || m.index === undefined) return qty;
  const base = parseFloat(m[1].replace(',', '.')) / (m[2] ? parseFloat(m[2]) : 1);
  if (!isFinite(base)) return qty;
  return qty.slice(0, m.index) + formatNumber(base * factor) + qty.slice(m.index + m[0].length);
}

// Facteur lisible : ×1,5
export function formatFactor(factor: number): string {
  return `×${formatNumber(factor)}`;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `${h} h ${String(rest).padStart(2, '0')}` : `${h} h`;
}
