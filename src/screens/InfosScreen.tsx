import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Text } from '../components/Text';
import ScreenHeader from '../components/ScreenHeader';
import RoundButton from '../components/RoundButton';
import InfoEditSheet from '../components/InfoEditSheet';
import { useAuth } from '../hooks/useAuth';
import { subscribeToInfos, saveInfo, deleteInfo } from '../services/infos';
import { InfoCard, InfoField } from '../types';
import { softColor } from '../constants/palette';
import { formatRelative } from '../utils/time';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TAB_BAR_SPACE } from '../constants/theme';
import { useStyles } from '../theme/ThemeProvider';

export default function InfosScreen() {
  const styles = useStyles(makeStyles);
  const navigation = useNavigation<any>();
  const { user, profile } = useAuth();
  const householdId: string = profile?.householdId ?? '';

  const [infos, setInfos] = useState<InfoCard[]>([]);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<{ visible: boolean; info: InfoCard | null }>({ visible: false, info: null });

  useEffect(() => {
    if (!householdId) return;
    return subscribeToInfos(householdId, setInfos);
  }, [householdId]);

  const toggleReveal = (key: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const copy = (value: string, label: string) => {
    Clipboard.setStringAsync(value);
    Alert.alert('Copié', `${label} a été copié.`);
  };

  const call = (value: string) => Linking.openURL(`tel:${value.replace(/[^\d+]/g, '')}`).catch(() => {});

  const handleSave = async (data: { title: string; color: number; fields: InfoField[] }) => {
    const current = editor.info;
    setEditor({ visible: false, info: null });
    try {
      await saveInfo(
        householdId,
        { ...data, updatedBy: user?.uid ?? '', updatedByName: user?.displayName ?? '', updatedAt: Date.now() },
        current?.id
      );
    } catch (e: any) {
      Alert.alert('Erreur', "La fiche n'a pas pu être enregistrée.\n" + (e?.message ?? ''));
    }
  };

  const handleDelete = async () => {
    const current = editor.info;
    setEditor({ visible: false, info: null });
    if (current) await deleteInfo(householdId, current.id);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Infos utiles"
        onBack={() => navigation.goBack()}
        right={<RoundButton icon="add" variant="primary" label="Ajouter une info" onPress={() => setEditor({ visible: true, info: null })} />}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {infos.length === 0 && (
          <Text style={styles.empty}>
            Aucune fiche. Touche + pour ajouter le Wi-Fi, le pédiatre, le code du portail, les jours de poubelles…
          </Text>
        )}

        {infos.map((info) => {
          const c = softColor(info.color);
          return (
            <View key={info.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardHead}
                onPress={() => setEditor({ visible: true, info })}
                accessibilityRole="button"
                accessibilityHint="Modifier la fiche"
              >
                <View style={[styles.titleChip, { backgroundColor: c.bg }]}>
                  <Text style={[styles.titleChipText, { color: c.fg }]}>{info.title}</Text>
                </View>
                <View style={{ flex: 1 }} />
                <Text style={styles.meta}>
                  {info.updatedByName ? `${info.updatedByName} · ` : ''}{formatRelative(info.updatedAt)}
                </Text>
                <Ionicons name="create-outline" size={17} color={COLORS.textSecondary} />
              </TouchableOpacity>

              {info.fields.map((f, i) => {
                const key = `${info.id}-${i}`;
                const hidden = f.secret && !revealed.has(key);
                return (
                  <View key={key} style={styles.fieldRow}>
                    <View style={{ flex: 1 }}>
                      {f.label ? <Text style={styles.fieldLabel}>{f.label}</Text> : null}
                      <Text style={styles.fieldValue} selectable={!hidden}>
                        {hidden ? '•'.repeat(Math.min(Math.max(f.value.length, 4), 12)) : f.value}
                      </Text>
                    </View>
                    {f.secret && (
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => toggleReveal(key)}
                        accessibilityRole="button"
                        accessibilityLabel={hidden ? `Afficher ${f.label || 'la valeur'}` : `Masquer ${f.label || 'la valeur'}`}
                      >
                        <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={COLORS.text} />
                      </TouchableOpacity>
                    )}
                    {f.kind === 'phone' && f.value ? (
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => call(f.value)}
                        accessibilityRole="button"
                        accessibilityLabel={`Appeler ${f.label || info.title}`}
                      >
                        <Ionicons name="call-outline" size={18} color={COLORS.text} />
                      </TouchableOpacity>
                    ) : null}
                    {f.value ? (
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => copy(f.value, f.label || info.title)}
                        accessibilityRole="button"
                        accessibilityLabel={`Copier ${f.label || 'la valeur'}`}
                      >
                        <Ionicons name="copy-outline" size={18} color={COLORS.text} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </View>
          );
        })}

        <View style={styles.note}>
          <Ionicons name="lock-closed-outline" size={15} color={COLORS.textMuted} />
          <Text style={styles.noteText}>
            Visible seulement par le foyer. Évitez les codes bancaires et les mots de passe importants.
          </Text>
        </View>
      </ScrollView>

      <InfoEditSheet
        visible={editor.visible}
        initial={editor.info}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => setEditor({ visible: false, info: null })}
      />
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.lg - 4, paddingBottom: TAB_BAR_SPACE, gap: SPACING.sm + 2 },
  empty: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted, lineHeight: 21, paddingTop: SPACING.sm },
  card: { backgroundColor: COLORS.surface, borderRadius: 24, padding: SPACING.md - 2, gap: SPACING.sm + 2, ...SHADOWS.soft },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  titleChip: { borderRadius: BORDER_RADIUS.full, paddingHorizontal: 11, paddingVertical: 4 },
  titleChipText: { fontSize: 14, fontWeight: '800' },
  meta: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  fieldValue: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.xs, paddingTop: SPACING.xs },
  noteText: { flex: 1, fontSize: 12, fontWeight: '700', color: COLORS.textMuted, lineHeight: 17 },
});
