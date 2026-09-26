import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Share, Alert, Clipboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { logout } from '../services/auth';
import { getHousehold } from '../services/household';
import { Household } from '../types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { scale, moderateScale } from '../utils/responsive';

export default function ProfileScreen() {
  const { user, profile } = useAuth();
  const navigation = useNavigation<any>();
  const [household, setHousehold] = useState<Household | null>(null);

  useEffect(() => {
    if (profile?.householdId) {
      getHousehold(profile.householdId).then(setHousehold);
    }
  }, [profile?.householdId]);

  async function shareInviteCode() {
    if (!household) return;
    await Share.share({
      message: `Rejoins notre liste de courses sur TeninGrocery ! Code : ${household.inviteCode}`,
    });
  }

  function copyInviteCode() {
    if (!household) return;
    Clipboard.setString(household.inviteCode);
    Alert.alert('Copié !', `Le code ${household.inviteCode} a été copié dans le presse-papiers.`);
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.displayName ?? '?')[0].toUpperCase()}
          </Text>
        </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },
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
  avatar: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 3,
    borderColor: COLORS.mustard,
  },
  avatarText: { color: '#fff', fontSize: moderateScale(32), fontWeight: '700' },
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
