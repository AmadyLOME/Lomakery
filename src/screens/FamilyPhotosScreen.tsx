import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../components/Text';
import ScreenHeader from '../components/ScreenHeader';
import { useAuth } from '../hooks/useAuth';
import {
  subscribeToFamilyPhotos,
  addFamilyPhoto,
  replaceFamilyPhoto,
  setPhotoCaption,
  removeFamilyPhoto,
  MAX_FAMILY_PHOTOS,
} from '../services/familyPhotos';
import { pickPhoto, askPhotoSource, toDataUri, FAMILY_PHOTO_OPTIONS, PhotoSource } from '../services/photos';
import { notify } from '../services/notifications';
import { FamilyPhoto } from '../types';
import { formatRelative } from '../utils/time';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS, TAB_BAR_SPACE } from '../constants/theme';
import { useStyles } from '../theme/ThemeProvider';

const TILTS = [-2, 3, -3, 2, -1];

export default function FamilyPhotosScreen() {
  const styles = useStyles(makeStyles);
  const navigation = useNavigation<any>();
  const { user, profile } = useAuth();
  const householdId: string = profile?.householdId ?? '';
  const myName = user?.displayName || 'Moi';

  const [photos, setPhotos] = useState<FamilyPhoto[]>([]);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null); // id de la photo en cours, ou 'new'

  useEffect(() => {
    if (!householdId) return;
    return subscribeToFamilyPhotos(householdId, setPhotos);
  }, [householdId]);

  const pick = (onPicked: (base64: string) => Promise<void>, busyKey: string, removable?: () => void) => {
    const run = async (source: PhotoSource) => {
      try {
        const base64 = await pickPhoto(source, FAMILY_PHOTO_OPTIONS);
        if (!base64) return;
        setBusy(busyKey);
        await onPicked(base64);
      } catch (e: any) {
        Alert.alert('Erreur', "La photo n'a pas pu être enregistrée.\n" + (e?.message ?? ''));
      } finally {
        setBusy(null);
      }
    };
    askPhotoSource('Photo de famille', run, removable);
  };

  const addPhoto = () =>
    pick(async (base64) => {
      await addFamilyPhoto(householdId, base64, user?.uid ?? '', myName);
      notify(householdId, '📸 Photos de famille', `${myName} a ajouté une photo`);
    }, 'new');

  const replace = (photo: FamilyPhoto) =>
    pick((base64) => replaceFamilyPhoto(householdId, photo.id, base64, user?.uid ?? '', myName), photo.id);

  const remove = (photo: FamilyPhoto) =>
    Alert.alert('Retirer cette photo ?', 'Elle disparaîtra de la guirlande pour tout le foyer.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: () => removeFamilyPhoto(householdId, photo.id) },
    ]);

  const saveCaption = (photo: FamilyPhoto) => {
    const value = (captions[photo.id] ?? photo.caption).trim();
    if (value !== photo.caption) setPhotoCaption(householdId, photo.id, value).catch(() => {});
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title="Photos de famille"
        subtitle={`${photos.length} photo${photos.length > 1 ? 's' : ''} sur ${MAX_FAMILY_PHOTOS}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {photos.map((photo, i) => (
          <View key={photo.id} style={styles.card}>
            <View style={[styles.polaroid, { transform: [{ rotate: `${TILTS[i % TILTS.length]}deg` }] }]}>
              <View style={styles.photoBox}>
                <Image source={{ uri: toDataUri(photo.data) }} style={styles.photo} />
                {busy === photo.id && (
                  <View style={styles.busy}><ActivityIndicator color="#fff" /></View>
                )}
              </View>
              <Text style={styles.polaroidCaption} numberOfLines={1}>{captions[photo.id] ?? photo.caption}</Text>
            </View>

            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.label}>Légende</Text>
              <TextInput
                style={styles.captionInput}
                value={captions[photo.id] ?? photo.caption}
                onChangeText={(v) => setCaptions((c) => ({ ...c, [photo.id]: v }))}
                onBlur={() => saveCaption(photo)}
                onSubmitEditing={() => saveCaption(photo)}
                placeholder="Ex. Dakar 2025"
                placeholderTextColor={COLORS.textSecondary}
                maxLength={24}
                returnKeyType="done"
              />
              <Text style={styles.meta}>Ajoutée par {photo.addedByName} · {formatRelative(photo.createdAt)}</Text>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => replace(photo)} accessibilityRole="button">
                  <Ionicons name="camera-outline" size={15} color={COLORS.text} />
                  <Text style={styles.actionText}>Remplacer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.dangerSoft }]} onPress={() => remove(photo)} accessibilityRole="button">
                  <Text style={[styles.actionText, { color: COLORS.dangerText }]}>Retirer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        {photos.length < MAX_FAMILY_PHOTOS && (
          <TouchableOpacity style={styles.add} onPress={addPhoto} disabled={busy === 'new'} accessibilityRole="button">
            {busy === 'new' ? (
              <ActivityIndicator color={COLORS.textMuted} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={18} color={COLORS.textMuted} />
                <Text style={styles.addText}>Ajouter une photo</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.note}>
          <Ionicons name="lock-closed-outline" size={15} color={COLORS.textMuted} />
          <Text style={styles.noteText}>
            Visibles seulement par le foyer. Au-delà de 3 photos, la guirlande les fait défiler. L'animation
            s'arrête si « Réduire les animations » est activé sur l'iPhone.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.lg - 4, paddingBottom: TAB_BAR_SPACE, gap: SPACING.sm + 2 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md - 2,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: SPACING.md - 2,
    ...SHADOWS.soft,
  },
  polaroid: {
    width: 96,
    backgroundColor: COLORS.paper,
    paddingTop: 6,
    paddingHorizontal: 6,
    shadowColor: '#3C280A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  photoBox: { width: 84, height: 84, backgroundColor: '#F1E8D6', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  busy: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  polaroidCaption: { height: 26, lineHeight: 26, textAlign: 'center', fontFamily: FONTS.handwritten, fontSize: 16, color: '#3A3226' },
  label: { fontSize: 12, fontWeight: '800', color: COLORS.textMuted },
  captionInput: {
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.sandDark,
    backgroundColor: COLORS.background,
    paddingHorizontal: 14,
    fontFamily: FONTS.handwritten,
    fontSize: 20,
    color: COLORS.text,
  },
  meta: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: COLORS.sand,
  },
  actionText: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  add: {
    height: 56,
    borderRadius: 22,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.sandDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addText: { fontSize: 15, fontWeight: '800', color: COLORS.textMuted },
  note: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.xs, paddingTop: SPACING.xs },
  noteText: { flex: 1, fontSize: 12, fontWeight: '700', color: COLORS.textMuted, lineHeight: 17 },
});
