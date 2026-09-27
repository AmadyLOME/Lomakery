import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Share, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { logout } from '../services/auth';
import { getHousehold } from '../services/household';
import { subscribeToMembers, setMemberPhoto } from '../services/members';
import { pickPhoto, askPhotoSource, AVATAR_OPTIONS, PhotoSource } from '../services/photos';
import Avatar from '../components/Avatar';
import { Household, MemberProfile } from '../types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <TouchableOpacity onPress={changePhoto} style={styles.avatarWrap} activeOpacity={0.8}>
          <Avatar name={user?.displayName ?? undefined} photo={me?.photo} size={scale(88)} />
          <View style={styles.avatarBadge}>
            {photoBusy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.avatarBadgeText}>📷</Text>}
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{user?.displayName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {household && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mon foyer</Text>
          <Text style={styles.householdName}>{household.name}</Text>
          <Text style={styles.memberCount}>
            {household.members.length} membre{household.members.length > 1 ? 's' : ''}
          </Text>

          {otherMembers.length > 0 && (
            <View style={styles.membersList}>
              {otherMembers.map((m) => (
                <View key={m.uid} style={styles.memberRow}>
                  <Avatar name={m.displayName} photo={m.photo} size={scale(40)} />
                  <Text style={styles.memberName}>{m.displayName}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.inviteRow} onPress={shareInviteCode} onLongPress={copyInviteCode}>
            <View>
              <Text style={styles.inviteLabel}>Code d'invitation</Text>
              <Text style={styles.inviteCode}>{household.inviteCode}</Text>
              <Text style={styles.inviteHint}>Appui long pour copier</Text>
            </View>
            <Text style={styles.shareIcon}>↗</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.helpBtn}
        onPress={() => navigation.navigate('Help')}
      >
        <Text style={styles.helpText}>💡  Aide & Guide</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() =>
          Alert.alert('Déconnexion', 'Êtes-vous sûr ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Se déconnecter', style: 'destructive', onPress: logout },
          ])
        }
      >
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrap: { marginBottom: SPACING.sm },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  avatarBadgeText: { fontSize: moderateScale(14) },
  membersList: { alignSelf: 'stretch', marginBottom: SPACING.md, gap: SPACING.sm },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  memberName: { fontSize: FONT_SIZE.lg, color: COLORS.text, fontWeight: '600' },
  name: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text },
  email: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.mustard,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  householdName: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text },
  memberCount: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginBottom: SPACING.md },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inviteLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  inviteCode: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.primary, letterSpacing: 4 },
  inviteHint: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2, fontStyle: 'italic' },
  shareIcon: { fontSize: 22, color: COLORS.primary },
  logoutBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.danger,
  },
  helpBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.mustard,
  },
  helpText: { color: COLORS.mustard, fontSize: FONT_SIZE.lg, fontWeight: '600' },
  logoutText: { color: COLORS.danger, fontSize: FONT_SIZE.lg, fontWeight: '600' },
});
