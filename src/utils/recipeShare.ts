import { Recipe } from '../types';
import { scaleQuantity, formatMinutes } from './quantities';

export interface ShareOptions {
  servings: number;
  ingredients: boolean;
  steps: boolean;
}

function scaled(recipe: Recipe, servings: number) {
  const factor = servings / (recipe.servings || 4);
  return (recipe.ingredients ?? []).map((i) => ({ name: i.name, quantity: scaleQuantity(i.quantity, factor) }));
}

function timesLine(recipe: Recipe): string {
  const parts: string[] = [];
  if (recipe.prepMin) parts.push(`Préparation ${formatMinutes(recipe.prepMin)}`);
  if (recipe.cookMin) parts.push(`Cuisson ${formatMinutes(recipe.cookMin)}`);
  if (recipe.restMin) parts.push(`Repos ${formatMinutes(recipe.restMin)}`);
  return parts.join(' · ');
}

// Texte lisible dans WhatsApp, SMS ou Mail (*gras* compris par WhatsApp)
export function recipeToText(recipe: Recipe, opts: ShareOptions): string {
  const lines: string[] = [`🍲 *${recipe.name}*`, `Pour ${opts.servings} personne${opts.servings > 1 ? 's' : ''}`];
  const times = timesLine(recipe);
  if (times) lines.push(times);
  if (recipe.description?.trim()) lines.push('', recipe.description.trim());

  const ings = scaled(recipe, opts.servings);
  if (opts.ingredients && ings.length) {
    lines.push('', '*Ingrédients*');
    for (const i of ings) lines.push(`• ${i.name}${i.quantity ? ` — ${i.quantity}` : ''}`);
  }
  const steps = recipe.steps ?? [];
  if (opts.steps && steps.length) {
    lines.push('', '*Étapes*');
    steps.forEach((s, n) => lines.push(`${n + 1}. ${s.text}${s.timerMin ? ` (${formatMinutes(s.timerMin)})` : ''}`));
  }
  lines.push('', '— Partagé depuis TeninGrocery');
  return lines.join('\n');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Fiche PDF (HTML imprimé par expo-print)
export function recipeToHtml(recipe: Recipe, opts: ShareOptions & { photoUri?: string | null }): string {
  const ings = scaled(recipe, opts.servings);
  const steps = recipe.steps ?? [];
  const times = timesLine(recipe);
  const meta = [`Pour ${opts.servings} personne${opts.servings > 1 ? 's' : ''}`, times].filter(Boolean).join(' · ');

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" />
<style>
  @page { margin: 18mm 16mm; }
  body { font-family: -apple-system, 'Helvetica Neue', Helvetica, sans-serif; color: #2E2A24; font-size: 12.5pt; line-height: 1.45; }
  h1 { font-size: 26pt; margin: 0 0 4px; color: #2E2A24; }
  .meta { color: #C4501A; font-weight: 700; margin-bottom: 14px; }
  .photo { width: 100%; max-height: 300px; object-fit: cover; border-radius: 16px; margin: 6px 0 14px; }
  .desc { color: #5C5548; margin-bottom: 14px; }
  h2 { font-size: 15pt; border-bottom: 2px solid #EFE6D2; padding-bottom: 4px; margin: 18px 0 8px; }
  ul { list-style: none; padding: 0; margin: 0; columns: 2; column-gap: 24px; }
  li { padding: 4px 0; break-inside: avoid; }
  li b { color: #C4501A; }
  ol { padding-left: 0; margin: 0; list-style: none; counter-reset: s; }
  ol li { counter-increment: s; display: flex; gap: 10px; padding: 6px 0; }
  ol li::before { content: counter(s); flex: 0 0 24px; height: 24px; border-radius: 12px; background: #C4501A; color: #fff; font-weight: 700; text-align: center; line-height: 24px; font-size: 11pt; }
  .timer { color: #3F4575; font-weight: 700; white-space: nowrap; }
  .foot { margin-top: 24px; color: #9A9082; font-size: 9.5pt; text-align: center; }
</style></head><body>
  <h1>${esc(recipe.name)}</h1>
  <div class="meta">${esc(meta)}</div>
  ${opts.photoUri ? `<img class="photo" src="${opts.photoUri}" />` : ''}
  ${recipe.description?.trim() ? `<div class="desc">${esc(recipe.description.trim())}</div>` : ''}
  ${opts.ingredients && ings.length ? `<h2>Ingrédients</h2><ul>${ings
    .map((i) => `<li>${esc(i.name)}${i.quantity ? ` — <b>${esc(i.quantity)}</b>` : ''}</li>`)
    .join('')}</ul>` : ''}
  ${opts.steps && steps.length ? `<h2>Étapes</h2><ol>${steps
    .map((s) => `<li><span>${esc(s.text)}${s.timerMin ? ` <span class="timer">⏱ ${esc(formatMinutes(s.timerMin))}</span>` : ''}</span></li>`)
    .join('')}</ol>` : ''}
  <div class="foot">Partagé depuis TeninGrocery</div>
</body></html>`;
}

// Nom de fichier lisible : « Poulet yassa.pdf »
export function pdfFileName(recipe: Recipe): string {
  const base = recipe.name.replace(/[\/\\:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim() || 'Recette';
  return `${base}.pdf`;
}
