import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Share, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/Text';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import RoundButton from '../components/RoundButton';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { logout } from '../services/auth';
import { getHousehold } from '../services/household';
import { subscribeToMembers, setMemberPhoto } from '../services/members';
import { pickPhoto, askPhotoSource, AVATAR_OPTIONS, PhotoSource } from '../services/photos';
import Avatar from '../components/Avatar';
import { Household, MemberProfile } from '../types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS, TAB_BAR_SPACE } from '../constants/theme';
import { scale, moderateScale } from '../utils/responsive';

export default function ProfileScreen() {
  const { user, profile } = useAuth();
  const navigation = useNavigation<any>();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const householdId: string | undefined = profile?.householdId;

  useEffect(() => {
    if (!householdId) return;
    getHousehold(householdId).then(setHousehold);
    return subscribeToMembers(householdId, setMembers);
  }, [householdId]);

  const me = members.find((m) => m.uid === user?.uid);
  // Membres du foyer, moi en premier ; ceux qui n'ont pas encore ouvert la nouvelle version n'ont pas de profil
  const otherMembers = (household?.members ?? [])
    .filter((uid) => uid !== user?.uid)
    .map((uid) => members.find((m) => m.uid === uid) ?? { uid, displayName: 'Membre' });

  function changePhoto() {
    if (!householdId || !user) return;
    const upload = async (source: PhotoSource) => {
      try {
        const base64 = await pickPhoto(source, AVATAR_OPTIONS);
        if (!base64) return;
        setPhotoBusy(true);
        await setMemberPhoto(householdId, user.uid, base64);
      } catch (e: any) {
        Alert.alert('Erreur', "La photo n'a pas pu être enregistrée.\n" + (e?.message ?? ''));
      } finally {
        setPhotoBusy(false);
      }
    };
    const remove = async () => {
      setPhotoBusy(true);
      try {
        await setMemberPhoto(householdId, user.uid, null);
      } finally {
        setPhotoBusy(false);
      }
    };
    askPhotoSource('Photo de profil', upload, me?.photo ? remove : undefined);
  }

  async function shareInviteCode() {
    if (!household) return;
    await Share.share({
      message: `Rejoins notre liste de courses sur TeninGrocery ! Code : ${household.inviteCode}`,
    });
  }

  function copyInviteCode() {
    if (!household) return;
    Clipboard.setStringAsync(household.inviteCode);
    Alert.alert('Copié !', `Le code ${household.inviteCode} a été copié dans le presse-papiers.`);
  }

  const confirmLogout = () =>
    Alert.alert('Déconnexion', 'Êtes-vous sûr ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: logout },
    ]);

  const everyone = household ? [me ?? { uid: user?.uid ?? '', displayName: user?.displayName ?? '' }, ...otherMembers] : [];

  return (
    <View style={styles.container}>
      <ScreenHeader title="Profil" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Moi */}
        <View style={[styles.card, styles.meCard]}>
          <TouchableOpacity
            onPress={changePhoto}
            accessibilityRole="button"
            accessibilityLabel="Changer la photo de profil"
          >
            <Avatar name={user?.displayName ?? undefined} photo={me?.photo} size={scale(76)} />
            <View style={styles.avatarBadge}>
              {photoBusy ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={15} color="#fff" />}
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{user?.displayName}</Text>
            <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
          </View>
        </View>

        {/* Foyer */}
        {household && (
          <View style={[styles.card, { gap: SPACING.md - 2 }]}>
            <View style={styles.householdRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>MON FOYER</Text>
                <Text style={styles.householdName}>{household.name}</Text>
                <Text style={styles.memberCount}>
                  {household.members.length} membre{household.members.length > 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.avatarStack}>
                {everyone.map((m, idx) => (
                  <View key={m.uid} style={[styles.stackedAvatar, idx > 0 && { marginLeft: -12 }]}>
                    <Avatar name={m.displayName} photo={m.photo} size={scale(38)} />
                  </View>
                ))}
              </View>
            </View>

            {otherMembers.length > 0 && (
              <View style={styles.membersList}>
                {otherMembers.map((m) => (
                  <View key={m.uid} style={styles.memberRow}>
                    <Avatar name={m.displayName} photo={m.photo} size={scale(34)} />
                    <Text style={styles.memberName}>{m.displayName}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.invitePill}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inviteLabel}>Code d'invitation</Text>
                <Text style={styles.inviteCode}>{household.inviteCode}</Text>
              </View>
              <RoundButton icon="copy-outline" label="Copier le code" onPress={copyInviteCode} />
              <RoundButton icon="share-outline" variant="primary" label="Partager le code" onPress={shareInviteCode} />
            </View>
          </View>
        )}

        {/* Réglages */}
        <View style={[styles.card, styles.listCard]}>
          <TouchableOpacity style={styles.listRow} onPress={() => navigation.navigate('Help')} accessibilityRole="button">
            <View style={[styles.listIcon, { backgroundColor: COLORS.sand }]}>
              <Ionicons name="help-circle-outline" size={20} color={COLORS.mustardText} />
            </View>
            <Text style={styles.listText}>Aide &amp; guide</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.listDivider} />
          <TouchableOpacity style={styles.listRow} onPress={confirmLogout} accessibilityRole="button">
            <View style={[styles.listIcon, { backgroundColor: COLORS.dangerSoft }]}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.dangerText} />
            </View>
            <Text style={[styles.listText, { color: COLORS.dangerText }]}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.lg - 4, paddingBottom: TAB_BAR_SPACE, gap: SPACING.md - 2 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg - 2,
    ...SHADOWS.soft,
  },
  meCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avatarBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  name: { fontSize: moderateScale(22), fontWeight: '800', color: COLORS.text },
  email: { fontSize: FONT_SIZE.md, color: COLORS.textMuted, marginTop: 2 },
  householdRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.mustardText, letterSpacing: 1 },
  householdName: { fontSize: moderateScale(20), fontWeight: '800', color: COLORS.text },
  memberCount: { fontSize: FONT_SIZE.md, color: COLORS.textMuted },
  avatarStack: { flexDirection: 'row' },
  stackedAvatar: { borderRadius: 999, borderWidth: 3, borderColor: COLORS.surface },
  membersList: { gap: SPACING.sm },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 2 },
  memberName: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  invitePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingLeft: SPACING.lg - 4,
    paddingRight: SPACING.sm,
  },
  inviteLabel: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textMuted },
  inviteCode: { fontSize: moderateScale(20), fontWeight: '800', color: COLORS.primary, letterSpacing: 4 },
  listCard: { padding: 0, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md - 2, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg - 4 },
  listIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  listText: { flex: 1, fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  listDivider: { height: 1, backgroundColor: COLORS.sand, marginLeft: 72 },
});
