import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Text, TextInput } from '../components/Text';
import ScreenHeader from '../components/ScreenHeader';
import Avatar from '../components/Avatar';
import { useAuth } from '../hooks/useAuth';
import { subscribeToMembers } from '../services/members';
import {
  subscribeToNotes,
  addNote,
  deleteNote,
  setNotePinned,
  setTyping,
  subscribeToTyping,
  TYPING_TTL_MS,
} from '../services/notes';
import { notify } from '../services/notifications';
import { FamilyNote, MemberProfile } from '../types';
import { formatRelative } from '../utils/time';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TAB_BAR_SPACE } from '../constants/theme';
import { scale } from '../utils/responsive';

export default function NotesScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const { user, profile } = useAuth();
  const householdId: string = profile?.householdId ?? '';
  const myName = user?.displayName || 'Moi';

  const [notes, setNotes] = useState<FamilyNote[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [typers, setTypers] = useState<{ uid: string; name: string; at: number }[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const lastTypingSent = useRef(0);

  useEffect(() => {
    if (!householdId) return;
    const u1 = subscribeToNotes(householdId, setNotes);
    const u2 = subscribeToMembers(householdId, setMembers);
    const u3 = subscribeToTyping(householdId, setTypers);
    return () => { u1(); u2(); u3(); };
  }, [householdId]);

  // Horloge : fait expirer l'indicateur « écrit… » et rafraîchit les heures relatives
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // En quittant l'écran, on n'est plus « en train d'écrire »
  useEffect(() => () => {
    if (householdId && user) setTyping(householdId, user.uid, myName, false).catch(() => {});
  }, [householdId, user?.uid]);

  const onChangeText = (value: string) => {
    setText(value);
    if (!householdId || !user) return;
    const t = Date.now();
    if (value.trim() && t - lastTypingSent.current > TYPING_TTL_MS / 2) {
      lastTypingSent.current = t;
      setTyping(householdId, user.uid, myName, true).catch(() => {});
    }
  };

  const send = async () => {
    const value = text.trim();
    if (!value || !householdId || !user || sending) return;
    setSending(true);
    try {
      await addNote(householdId, value, user.uid, myName);
      setText('');
      lastTypingSent.current = 0;
      setTyping(householdId, user.uid, myName, false).catch(() => {});
      notify(householdId, '💬 Mot de la famille', `${myName} : ${value.length > 90 ? value.slice(0, 90) + '…' : value}`);
    } catch (e: any) {
      Alert.alert('Erreur', "Le mot n'a pas pu être envoyé.\n" + (e?.message ?? ''));
    } finally {
      setSending(false);
    }
  };

  const openActions = (note: FamilyNote) => {
    const mine = note.authorUid === user?.uid;
    Alert.alert(note.authorName, note.text.length > 120 ? note.text.slice(0, 120) + '…' : note.text, [
      { text: note.pinned ? 'Désépingler' : 'Épingler en haut', onPress: () => setNotePinned(householdId, note.id, !note.pinned) },
      { text: 'Copier le texte', onPress: () => Clipboard.setStringAsync(note.text) },
      ...(mine
        ? [{
            text: 'Supprimer',
            style: 'destructive' as const,
            onPress: () => Alert.alert('Supprimer ce mot ?', undefined, [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Supprimer', style: 'destructive', onPress: () => deleteNote(householdId, note.id) },
            ]),
          }]
        : []),
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  };

  const activeTypers = typers.filter((t) => t.uid !== user?.uid && now - t.at < TYPING_TTL_MS);
  const memberOf = (uid: string) => members.find((m) => m.uid === uid);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Mots de la famille" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {notes.length === 0 && (
          <Text style={styles.empty}>Aucun mot pour l'instant. Écris le premier : un rappel, une info, un petit mot…</Text>
        )}
        {notes.map((note) => {
          const author = memberOf(note.authorUid);
          return (
            <TouchableOpacity
              key={note.id}
              style={[styles.note, note.pinned && styles.notePinned]}
              onPress={() => openActions(note)}
              onLongPress={() => openActions(note)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityHint="Épingler, copier ou supprimer"
            >
              <Avatar name={note.authorName} photo={author?.photo} size={scale(34)} />
              <View style={{ flex: 1 }}>
                <View style={styles.noteHead}>
                  <Text style={styles.noteAuthor}>{note.authorName}</Text>
                  <Text style={styles.noteTime}>{formatRelative(note.createdAt, now)}</Text>
                  <View style={{ flex: 1 }} />
                  {note.pinned && <Ionicons name="pin" size={15} color={COLORS.mustardText} />}
                </View>
                <Text style={styles.noteText}>{note.text}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {activeTypers.length > 0 && (
          <View style={styles.typing}>
            <View style={styles.dots}>
              <View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} />
            </View>
            <Text style={styles.typingText}>
              {activeTypers.map((t) => t.name).join(' et ')} {activeTypers.length > 1 ? 'écrivent' : 'écrit'} un mot…
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: keyboardOpen ? SPACING.sm : TAB_BAR_SPACE - 14 }]}>
        <TextInput
          style={styles.input}
          placeholder="Écrire un mot…"
          placeholderTextColor={COLORS.textSecondary}
          value={text}
          onChangeText={onChangeText}
          multiline
          maxLength={500}
          autoFocus={!!route?.params?.compose}
          accessibilityLabel="Écrire un mot"
        />
        <TouchableOpacity
          style={[styles.send, (!text.trim() || sending) && { opacity: 0.4 }]}
          onPress={send}
          disabled={!text.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Envoyer"
        >
          <Ionicons name="arrow-up" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { paddingHorizontal: SPACING.lg - 4, paddingBottom: SPACING.md, gap: SPACING.sm + 2 },
  empty: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted, lineHeight: 21, paddingTop: SPACING.sm },
  note: {
    flexDirection: 'row',
    gap: SPACING.sm + 2,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: SPACING.md - 4,
    ...SHADOWS.soft,
  },
  notePinned: { backgroundColor: '#F6ECCF' },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteAuthor: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  noteTime: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  noteText: { fontSize: 15, fontWeight: '600', color: COLORS.text, lineHeight: 21, marginTop: 2 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.xs },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.sandDark },
  typingText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg - 4,
    paddingTop: SPACING.sm,
  },
  input: {
    flex: 1,
    minHeight: 50,
    maxHeight: 120,
    borderRadius: 25,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md + 2,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 15,
    color: COLORS.text,
    ...SHADOWS.soft,
  },
  send: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
});
