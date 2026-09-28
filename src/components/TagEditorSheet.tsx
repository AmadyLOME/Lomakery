import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './Text';
import BottomSheet from './BottomSheet';
import { hasTag, tagColor } from '../utils/tags';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

interface Props {
  visible: boolean;
  tags: string[];            // étiquettes de la recette
  suggestions: string[];     // étiquettes déjà utilisées dans le foyer
  onSave: (tags: string[]) => void;
  onClose: () => void;
}

const DEFAULTS = ['Plat', 'Entrée', 'Dessert', 'Rapide', 'Végé', 'Poisson', 'Fête', 'Batch cooking'];

export default function TagEditorSheet({ visible, tags, suggestions, onSave, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (visible) { setSelected(tags); setDraft(''); }
  }, [visible]);

  const pool = [...suggestions];
  for (const d of DEFAULTS) if (!hasTag(pool, d)) pool.push(d);
  for (const t of selected) if (!hasTag(pool, t)) pool.push(t);

  const toggle = (tag: string) =>
    setSelected((prev) => (hasTag(prev, tag) ? prev.filter((t) => t.toLowerCase() !== tag.toLowerCase()) : [...prev, tag]));

  const addDraft = () => {
    const t = draft.trim();
    if (t && !hasTag(selected, t)) setSelected((prev) => [...prev, t]);
    setDraft('');
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Étiquettes</Text>
      <Text style={styles.hint}>Touchez pour ajouter ou retirer. Elles servent à filtrer les recettes.</Text>

      <View style={styles.chips}>
        {pool.map((tag) => {
          const on = hasTag(selected, tag);
          const c = tagColor(tag);
          return (
            <TouchableOpacity
              key={tag}
              onPress={() => toggle(tag)}
              style={[styles.chip, { backgroundColor: on ? c.fg : c.bg }]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
            >
              {on && <Ionicons name="checkmark" size={14} color="#fff" />}
              <Text style={[styles.chipText, { color: on ? '#fff' : c.fg }]}>{tag}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.newRow}>
        <TextInput
          style={styles.input}
          placeholder="Nouvelle étiquette…"
          placeholderTextColor={COLORS.textSecondary}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addDraft}
          returnKeyType="done"
          maxLength={24}
        />
        <TouchableOpacity
          style={[styles.addBtn, !draft.trim() && { opacity: 0.4 }]}
          onPress={addDraft}
          disabled={!draft.trim()}
          accessibilityRole="button"
          accessibilityLabel="Ajouter l'étiquette"
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.save} onPress={() => onSave(selected)} accessibilityRole="button">
        <Text style={styles.saveText}>Enregistrer</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  hint: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, marginTop: 2, marginBottom: SPACING.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: BORDER_RADIUS.full,
  },
  chipText: { fontSize: 14, fontWeight: '800' },
  newRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  input: {
    flex: 1,
    minHeight: 46,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.sandDark,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    fontSize: 15,
    color: COLORS.text,
  },
  addBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center' },
  save: { height: 54, borderRadius: 27, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.lg },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
