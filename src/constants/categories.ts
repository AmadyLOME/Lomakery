import { Category } from '../types';

export const CATEGORIES: Record<Category, { label: string; emoji: string; color: string }> = {
  fruits_legumes:   { label: 'Fruits & Légumes', emoji: '🥦', color: '#4CAF50' },
  viandes_poissons: { label: 'Viandes & Poissons', emoji: '🥩', color: '#F44336' },
  produits_laitiers:{ label: 'Produits Laitiers', emoji: '🧀', color: '#FFC107' },
  epicerie:         { label: 'Épicerie',           emoji: '🥫', color: '#FF9800' },
  boissons:         { label: 'Boissons',           emoji: '🧃', color: '#2196F3' },
  hygiene:          { label: 'Hygiène',            emoji: '🧴', color: '#9C27B0' },
  entretien:        { label: 'Entretien',          emoji: '🧹', color: '#607D8B' },
  surgeles:         { label: 'Surgelés',           emoji: '🧊', color: '#00BCD4' },
  boulangerie:      { label: 'Boulangerie',        emoji: '🥖', color: '#795548' },
  autre:            { label: 'Autre',              emoji: '🛒', color: '#9E9E9E' },
};
