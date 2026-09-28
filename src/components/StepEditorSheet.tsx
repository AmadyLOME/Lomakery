import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './Text';
import BottomSheet from './BottomSheet';
import { RecipeStep } from '../types';
import { formatMinutes } from '../utils/quantities';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { useStyles } from '../theme/ThemeProvider';

interface Props {
  visible: boolean;
  step: RecipeStep | null;     // null = nouvelle étape
  index: number;               // position (0-based) ; pour une nouvelle étape = nombre d'étapes
  total: number;
  onSave: (text: string, timerMin?: number) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
  onClose: () => void;
}

const TIMERS = [5, 10, 15, 20, 30, 45, 60, 90];

export default function StepEditorSheet({ visible, step, index, total, onSave, onMove, onDelete, onClose }: Props) {
  const styles = useStyles(makeStyles);
  const [text, setText] = useState('');
  const [timer, setTimer] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!visible) return;
    setText(step?.text ?? '');
    setTimer(step?.timerMin);
  }, [visible]);

  const confirmDelete = () =>
    Alert.alert('Supprimer cette étape ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: onDelete },
    ]);

  const customTimer = () =>
    Alert.prompt('Minuteur', 'Durée en minutes', (v) => {
      const n = parseInt(v, 10);
      setTimer(!isNaN(n) && n > 0 ? n : undefined);
    }, 'plain-text', timer ? String(timer) : '', 'number-pad');

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>{step ? `Étape ${index + 1}` : 'Nouvelle étape'}</Text>

      <TextInput
        style={styles.input}
        placeholder="Ex. Faire dorer le poulet dans l'huile."
        placeholderTextColor={COLORS.textSecondary}
        value={text}
        onChangeText={setText}
        multiline
        autoFocus={!step}
      />

      <Text style={styles.label}>Minuteur (optionnel)</Text>
      <View style={styles.chips}>
        <TouchableOpacity
          style={[styles.chip, timer === undefined && styles.chipOn]}
          onPress={() => setTimer(undefined)}
          accessibilityRole="button"
          accessibilityState={{ selected: timer === undefined }}
        >
          <Text style={[styles.chipText, timer === undefined && styles.chipTextOn]}>Aucun</Text>
        </TouchableOpacity>
        {TIMERS.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.chip, timer === m && styles.chipOn]}
            onPress={() => setTimer(m)}
            accessibilityRole="button"
            accessibilityState={{ selected: timer === m }}
          >
            <Text style={[styles.chipText, timer === m && styles.chipTextOn]}>{formatMinutes(m)}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.chip, timer !== undefined && !TIMERS.includes(timer) && styles.chipOn]}
          onPress={customTimer}
          accessibilityRole="button"
        >
          <Text style={[styles.chipText, timer !== undefined && !TIMERS.includes(timer) && styles.chipTextOn]}>
            {timer !== undefined && !TIMERS.includes(timer) ? formatMinutes(timer) : 'Autre…'}
          </Text>
        </TouchableOpacity>
      </View>

      {step && (
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.secondary, index === 0 && { opacity: 0.35 }]}
            disabled={index === 0}
            onPress={() => onMove(-1)}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-up" size={17} color={COLORS.text} />
            <Text style={styles.secondaryText}>Monter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondary, index >= total - 1 && { opacity: 0.35 }]}
            disabled={index >= total - 1}
            onPress={() => onMove(1)}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-down" size={17} color={COLORS.text} />
            <Text style={styles.secondaryText}>Descendre</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondary, { backgroundColor: COLORS.dangerSoft }]} onPress={confirmDelete} accessibilityRole="button">
            <Ionicons name="trash-outline" size={17} color={COLORS.dangerText} />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.save, !text.trim() && { opacity: 0.4 }]}
        disabled={!text.trim()}
        onPress={() => onSave(text.trim(), timer)}
        accessibilityRole="button"
      >
        <Text style={styles.saveText}>{step ? 'Enregistrer' : "Ajouter l'étape"}</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

const makeStyles = () => StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md },
  input: {
    minHeight: 110,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.sandDark,
    backgroundColor: COLORS.background,
    padding: SPACING.md - 2,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.text,
    textAlignVertical: 'top',
  },
  label: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: 36, paddingHorizontal: 12, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.sand, justifyContent: 'center' },
  chipOn: { backgroundColor: COLORS.ink },
  chipText: { fontSize: 13, fontWeight: '800', color: COLORS.textMuted },
  chipTextOn: { color: '#fff' },
  row: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    borderRadius: 22,
    backgroundColor: COLORS.sand,
  },
  secondaryText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  save: { height: 54, borderRadius: 27, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.lg },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
