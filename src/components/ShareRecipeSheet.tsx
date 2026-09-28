import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Share, Alert, ActivityIndicator, Switch } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import BottomSheet from './BottomSheet';
import Segmented from './Segmented';
import { Recipe } from '../types';
import { recipeToText, recipeToHtml } from '../utils/recipeShare';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { useStyles } from '../theme/ThemeProvider';

interface Props {
  visible: boolean;
  recipe: Recipe;
  servings: number;              // portions affichées dans la fiche au moment d'ouvrir
  photoUri: string | null;
  onClose: () => void;
}

type Format = 'text' | 'pdf';

export default function ShareRecipeSheet({ visible, recipe, servings: initialServings, photoUri, onClose }: Props) {
  const styles = useStyles(makeStyles);
  const [format, setFormat] = useState<Format>('text');
  const [servings, setServings] = useState(initialServings);
  const [withIngredients, setWithIngredients] = useState(true);
  const [withSteps, setWithSteps] = useState(true);
  const [withPhoto, setWithPhoto] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) setServings(initialServings);
  }, [visible]);

  const hasSteps = (recipe.steps ?? []).length > 0;
  const opts = { servings, ingredients: withIngredients, steps: withSteps && hasSteps };

  const share = async () => {
    setBusy(true);
    try {
      if (format === 'text') {
        await Share.share({ message: recipeToText(recipe, opts) });
      } else {
        const html = recipeToHtml(recipe, { ...opts, photoUri: withPhoto ? photoUri : null });
        const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
        if (!(await Sharing.isAvailableAsync())) throw new Error('Partage indisponible sur cet appareil.');
        await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: recipe.name });
      }
      onClose();
    } catch (e: any) {
      Alert.alert('Partage impossible', e?.message ?? '');
    } finally {
      setBusy(false);
    }
  };

  const preview = recipeToText(recipe, opts).split('\n').slice(0, 9).join('\n');

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Partager la recette</Text>
      <Text style={styles.subtitle}>WhatsApp, SMS, Mail… via le menu de partage</Text>

      <Segmented
        options={[
          { value: 'text', label: 'Message' },
          { value: 'pdf', label: 'Fiche PDF' },
        ]}
        value={format}
        onChange={(v) => setFormat(v as Format)}
        stretch
      />

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Pour</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[styles.stepBtn, servings <= 1 && { opacity: 0.35 }]}
            disabled={servings <= 1}
            onPress={() => setServings((n) => n - 1)}
            accessibilityRole="button"
            accessibilityLabel="Une personne de moins"
          >
            <Ionicons name="remove" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.stepValue}>{servings} pers.</Text>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setServings((n) => Math.min(50, n + 1))}
            accessibilityRole="button"
            accessibilityLabel="Une personne de plus"
          >
            <Ionicons name="add" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Ingrédients</Text>
        <Switch value={withIngredients} onValueChange={setWithIngredients} trackColor={{ true: COLORS.primary }} />
      </View>
      <View style={[styles.row, !hasSteps && { opacity: 0.4 }]}>
        <Text style={styles.rowLabel}>Étapes{hasSteps ? '' : ' (aucune)'}</Text>
        <Switch value={withSteps && hasSteps} disabled={!hasSteps} onValueChange={setWithSteps} trackColor={{ true: COLORS.primary }} />
      </View>
      {format === 'pdf' && (
        <View style={[styles.row, !photoUri && { opacity: 0.4 }]}>
          <Text style={styles.rowLabel}>Photo{photoUri ? '' : ' (aucune)'}</Text>
          <Switch value={withPhoto && !!photoUri} disabled={!photoUri} onValueChange={setWithPhoto} trackColor={{ true: COLORS.primary }} />
        </View>
      )}

      {format === 'text' && (
        <View style={styles.preview}>
          <Text style={styles.previewText}>{preview}{'\n'}…</Text>
        </View>
      )}

      <TouchableOpacity style={[styles.submit, busy && { opacity: 0.5 }]} disabled={busy} onPress={share} accessibilityRole="button">
        {busy ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="share-outline" size={19} color="#fff" />
            <Text style={styles.submitText}>{format === 'text' ? 'Partager le message' : 'Créer et partager le PDF'}</Text>
          </>
        )}
      </TouchableOpacity>
    </BottomSheet>
  );
}

const makeStyles = () => StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginTop: 2, marginBottom: SPACING.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.sand,
  },
  rowLabel: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.sand, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 16, fontWeight: '800', color: COLORS.text, minWidth: 64, textAlign: 'center' },
  preview: { backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md - 4, padding: SPACING.md - 2, marginTop: SPACING.md },
  previewText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, lineHeight: 19 },
  submit: {
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
