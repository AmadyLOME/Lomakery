import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { useAuth } from '../hooks/useAuth';
import { createHousehold, joinHousehold } from '../services/household';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';

export default function HouseholdSetupScreen() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!householdName.trim() || !user) return;
    setLoading(true);
    try {
      await createHousehold(householdName.trim(), user.uid);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim() || !user) return;
    setLoading(true);
    try {
      const id = await joinHousehold(inviteCode.trim(), user.uid);
      if (!id) Alert.alert('Erreur', 'Code invalide. Vérifiez avec votre partenaire.');
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configurez votre foyer</Text>
      <Text style={styles.subtitle}>
        Créez un foyer ou rejoignez celui de votre partenaire.
      </Text>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, mode === 'create' && styles.tabActive]}
          onPress={() => setMode('create')}
        >
          <Text style={[styles.tabText, mode === 'create' && styles.tabTextActive]}>
            Créer un foyer
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === 'join' && styles.tabActive]}
          onPress={() => setMode('join')}
        >
          <Text style={[styles.tabText, mode === 'join' && styles.tabTextActive]}>
            Rejoindre
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'create' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Nom du foyer (ex: Famille Lomé)"
            value={householdName}
            onChangeText={setHouseholdName}
          />
          <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Créer</Text>
            }
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Code d'invitation (ex: AB12CD)"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.button} onPress={handleJoin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Rejoindre</Text>
            }
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
    justifyContent: 'center',
  },
  title: { fontSize: FONT_SIZE.title, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  subtitle: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  tabs: { flexDirection: 'row', marginBottom: SPACING.lg },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    fontSize: FONT_SIZE.lg,
    marginBottom: SPACING.md,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: FONT_SIZE.lg, fontWeight: '600' },
});
