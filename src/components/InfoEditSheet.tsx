import React, { useEffect, useState } from 'react';
import { View, Modal, ScrollView, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './Text';
import RoundButton from './RoundButton';
import Segmented from './Segmented';
import { InfoCard, InfoField } from '../types';
import { SOFT_COLORS } from '../constants/palette';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

interface Props {
  visible: boolean;
  initial: InfoCard | null;
  onSave: (info: { title: string; color: number; fields: InfoField[] }) => void;
  onDelete: () => void;
  onClose: () => void;
}

const empty = (): InfoField => ({ label: '', value: '', secret: false, kind: 'text' });

// Modèles pour démarrer vite
const TEMPLATES: { title: string; color: number; fields: InfoField[] }[] = [
  { title: 'Wi-Fi', color: 0, fields: [
    { label: 'Réseau', value: '', secret: false, kind: 'text' },
    { label: 'Mot de passe', value: '', secret: true, kind: 'text' },
  ] },
  { title: 'Médecin', color: 1, fields: [
    { label: 'Nom', value: '', secret: false, kind: 'text' },
    { label: 'Téléphone', value: '', secret: false, kind: 'phone' },
  ] },
  { title: 'Code', color: 2, fields: [{ label: 'Code', value: '', secret: true, kind: 'text' }] },
  { title: '', color: 5, fields: [empty()] },
];

export default function InfoEditSheet({ visible, initial, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(0);
  const [fields, setFields] = useState<InfoField[]>([empty()]);

  useEffect(() => {
    if (!visible) return;
    setTitle(initial?.title ?? '');
    setColor(initial?.color ?? 0);
    setFields(initial?.fields?.length ? initial.fields.map((f) => ({ ...f })) : [empty()]);
  }, [visible]);

  const update = (i: number, patch: Partial<InfoField>) =>
    setFields((prev) => prev.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  const applyTemplate = (t: (typeof TEMPLATES)[number]) => {
    setTitle(t.title);
    setColor(t.color);
    setFields(t.fields.map((f) => ({ ...f })));
  };

  const cleaned = fields.filter((f) => f.label.trim() || f.value.trim()).map((f) => ({ ...f, label: f.label.trim(), value: f.value.trim() }));
  const canSave = title.trim().length > 0 && cleaned.length > 0;

  const confirmDelete = () =>
    Alert.alert('Supprimer cette fiche ?', `« ${initial?.title} » sera supprimée pour tout le foyer.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: onDelete },
    ]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{initial ? 'Modifier la fiche' : 'Nouvelle info'}</Text>
          <RoundButton icon="close" label="Fermer" onPress={onClose} size={40} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!initial && (
            <View style={styles.block}>
              <Text style={styles.label}>Partir d'un modèle</Text>
              <View style={styles.row}>
                {TEMPLATES.map((t) => (
                  <TouchableOpacity key={t.title || 'autre'} style={styles.template} onPress={() => applyTemplate(t)} accessibilityRole="button">
                    <Text style={styles.templateText}>{t.title || 'Autre'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.block}>
            <Text style={styles.label}>Titre</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex. Wi-Fi, Pédiatre, Poubelles…"
              placeholderTextColor={COLORS.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
            <View style={styles.row}>
              {SOFT_COLORS.map((c, i) => (
                <TouchableOpacity
                  key={c.bg}
                  onPress={() => setColor(i)}
                  style={[styles.swatch, { backgroundColor: c.bg }, color === i && { borderColor: c.fg }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: color === i }}
                  accessibilityLabel={`Couleur ${i + 1}`}
                />
              ))}
            </View>
          </View>

          {fields.map((f, i) => (
            <View key={i} style={styles.field}>
              <View style={styles.fieldHead}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Libellé (ex. Mot de passe)"
                  placeholderTextColor={COLORS.textSecondary}
                  value={f.label}
                  onChangeText={(v) => update(i, { label: v })}
                />
                {fields.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeField}
                    onPress={() => setFields((prev) => prev.filter((_, j) => j !== i))}
                    accessibilityRole="button"
                    accessibilityLabel="Retirer ce champ"
                  >
                    <Ionicons name="close" size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Valeur"
                placeholderTextColor={COLORS.textSecondary}
                value={f.value}
                onChangeText={(v) => update(i, { value: v })}
                keyboardType={f.kind === 'phone' ? 'phone-pad' : 'default'}
                autoCapitalize="none"
              />
              <View style={styles.row}>
                <Segmented
                  value={f.kind}
                  onChange={(kind) => update(i, { kind })}
                  options={[
                    { value: 'text', label: 'Texte' },
                    { value: 'phone', label: 'Téléphone', icon: 'call-outline' },
                  ]}
                />
                <TouchableOpacity
                  style={[styles.secretToggle, f.secret && styles.secretToggleOn]}
                  onPress={() => update(i, { secret: !f.secret })}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: f.secret }}
                >
                  <Ionicons name={f.secret ? 'eye-off' : 'eye-outline'} size={16} color={f.secret ? '#fff' : COLORS.textMuted} />
                  <Text style={[styles.secretText, f.secret && { color: '#fff' }]}>Masquer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addField} onPress={() => setFields((prev) => [...prev, empty()])} accessibilityRole="button">
            <Ionicons name="add" size={18} color={COLORS.text} />
            <Text style={styles.addFieldText}>Ajouter un champ</Text>
          </TouchableOpacity>

          <View style={styles.warning}>
            <Ionicons name="lock-closed-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.warningText}>
              Visible seulement par le foyer. Évitez les codes bancaires et les mots de passe importants.
            </Text>
          </View>

          {initial && (
            <TouchableOpacity style={styles.delete} onPress={confirmDelete} accessibilityRole="button">
              <Ionicons name="trash-outline" size={16} color={COLORS.dangerText} />
              <Text style={styles.deleteText}>Supprimer la fiche</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.save, !canSave && { opacity: 0.4 }]}
            disabled={!canSave}
            onPress={() => onSave({ title: title.trim(), color, fields: cleaned })}
            accessibilityRole="button"
          >
            <Text style={styles.saveText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg - 4,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  content: { paddingHorizontal: SPACING.lg - 4, paddingBottom: SPACING.lg, gap: SPACING.md },
  block: { gap: SPACING.sm },
  label: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.sm },
  template: { backgroundColor: COLORS.sand, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 14, paddingVertical: 9 },
  templateText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  input: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.sandDark,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md - 2,
    fontSize: 15,
    color: COLORS.text,
  },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: 'transparent' },
  field: { gap: SPACING.sm, backgroundColor: COLORS.background, borderRadius: 20, padding: SPACING.md - 4 },
  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  removeField: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  secretToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.sand,
  },
  secretToggleOn: { backgroundColor: COLORS.ink },
  secretText: { fontSize: 14, fontWeight: '800', color: COLORS.textMuted },
  addField: {
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.sandDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addFieldText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  warning: { flexDirection: 'row', gap: SPACING.sm, backgroundColor: COLORS.sand, borderRadius: 16, padding: SPACING.md - 4 },
  warningText: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textMuted, lineHeight: 18 },
  delete: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.dangerSoft,
  },
  deleteText: { fontSize: 14, fontWeight: '800', color: COLORS.dangerText },
  footer: { paddingHorizontal: SPACING.lg - 4, paddingTop: SPACING.sm, paddingBottom: SPACING.xl },
  save: { height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
