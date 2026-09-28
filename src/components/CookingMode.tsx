import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, ScrollView, TouchableOpacity, StyleSheet, Vibration, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Recipe } from '../types';
import { normalizeName } from '../utils/ingredients';
import { scaleQuantity, formatMinutes } from '../utils/quantities';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { useStyles } from '../theme/ThemeProvider';

interface Props {
  recipe: Recipe;
  factor: number;          // portions choisies / portions de référence
  onClose: () => void;
}

interface Timer {
  step: number;
  totalSec: number;
  endAt: number | null;    // en cours : heure de fin ; en pause : null
  remainingSec: number;
  notificationId: string | null;
  done: boolean;
}

const DARK = '#1F2E1F';
const DARK_2 = '#2B3A2C';
const LIGHT = '#FBF6EA';
const SOFT = '#CFE0CF';
const INK = '#1E2E1E';        // texte sur les pastilles claires (le mode cuisine est toujours sombre)
const INK_MUTED = '#5E574A';

function formatClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(r).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Ingrédients cités dans le texte d'une étape (avec leur quantité selon les portions)
function stepIngredients(recipe: Recipe, text: string, factor: number) {
  const t = normalizeName(text);
  return (recipe.ingredients ?? []).filter((ing) => {
    const n = normalizeName(ing.name);
    return n && (t.includes(n) || t.includes(n.replace(/[sx]$/, '')));
  }).map((ing) => ({ ...ing, quantity: scaleQuantity(ing.quantity, factor) }));
}

// Mode cuisine : une étape à la fois, en grand, écran allumé, minuteur avec alerte
export default function CookingMode({ recipe, factor, onClose }: Props) {
  const styles = useStyles(makeStyles);
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const steps = recipe.steps ?? [];
  const [index, setIndex] = useState(0);
  const [timer, setTimer] = useState<Timer | null>(null);
  const [, setTick] = useState(0);
  const timerRef = useRef<Timer | null>(null);
  timerRef.current = timer;

  // Rafraîchit l'affichage du minuteur et détecte la fin
  useEffect(() => {
    const t = setInterval(() => {
      const cur = timerRef.current;
      if (cur?.endAt && !cur.done && Date.now() >= cur.endAt) {
        Vibration.vibrate([0, 400, 200, 400]);
        setTimer({ ...cur, endAt: null, remainingSec: 0, done: true, notificationId: null });
      }
      setTick((n) => n + 1);
    }, 500);
    return () => clearInterval(t);
  }, []);

  // En quittant, on annule l'alerte programmée
  useEffect(() => () => {
    const id = timerRef.current?.notificationId;
    if (id) Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  }, []);

  const remaining = (t: Timer) => (t.endAt ? (t.endAt - Date.now()) / 1000 : t.remainingSec);

  const schedule = async (sec: number, stepNumber: number) => {
    try {
      return await Notifications.scheduleNotificationAsync({
        content: { title: `⏱ ${recipe.name}`, body: `Minuteur terminé (étape ${stepNumber})`, sound: 'default' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.round(sec)) },
      });
    } catch {
      return null; // sans autorisation de notifications, le minuteur marche quand même dans l'app
    }
  };

  const cancelScheduled = (t: Timer | null) => {
    if (t?.notificationId) Notifications.cancelScheduledNotificationAsync(t.notificationId).catch(() => {});
  };

  const startTimer = async (stepIdx: number, minutes: number) => {
    const begin = async () => {
      cancelScheduled(timerRef.current);
      const totalSec = minutes * 60;
      const notificationId = await schedule(totalSec, stepIdx + 1);
      setTimer({ step: stepIdx, totalSec, endAt: Date.now() + totalSec * 1000, remainingSec: totalSec, notificationId, done: false });
    };
    const cur = timerRef.current;
    if (cur && !cur.done && cur.step !== stepIdx) {
      Alert.alert('Remplacer le minuteur ?', `Le minuteur de l'étape ${cur.step + 1} est en cours.`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Remplacer', style: 'destructive', onPress: begin },
      ]);
    } else {
      await begin();
    }
  };

  const pauseResume = async () => {
    const cur = timerRef.current;
    if (!cur || cur.done) return;
    if (cur.endAt) {
      cancelScheduled(cur);
      setTimer({ ...cur, endAt: null, remainingSec: remaining(cur), notificationId: null });
    } else {
      const notificationId = await schedule(cur.remainingSec, cur.step + 1);
      setTimer({ ...cur, endAt: Date.now() + cur.remainingSec * 1000, notificationId });
    }
  };

  const stopTimer = () => {
    cancelScheduled(timerRef.current);
    setTimer(null);
  };

  if (steps.length === 0) return null;
  const step = steps[index];
  const ings = stepIngredients(recipe, step.text, factor);
  const isLast = index === steps.length - 1;
  const timerHere = timer && timer.step === index ? timer : null;
  const timerElsewhere = timer && timer.step !== index ? timer : null;

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top + SPACING.sm, paddingBottom: insets.bottom + SPACING.md }]}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.quit} onPress={onClose} accessibilityRole="button">
            <Ionicons name="close" size={18} color={LIGHT} />
            <Text style={styles.quitText}>Quitter</Text>
          </TouchableOpacity>
          <View style={styles.awake}>
            <Ionicons name="sunny-outline" size={14} color={SOFT} />
            <Text style={styles.awakeText}>Écran allumé</Text>
          </View>
        </View>

        <Text style={styles.kicker}>{recipe.name.toUpperCase()} · ÉTAPE {index + 1} / {steps.length}</Text>
        <View style={styles.progress}>
          {steps.map((s, i) => (
            <View key={s.id} style={[styles.progressBar, { backgroundColor: i < index ? '#7FB38F' : i === index ? COLORS.primaryLight : '#3A4A3B' }]} />
          ))}
        </View>

        {timerElsewhere && (
          <TouchableOpacity style={styles.otherTimer} onPress={() => setIndex(timerElsewhere.step)} accessibilityRole="button">
            <Ionicons name="timer-outline" size={16} color={LIGHT} />
            <Text style={styles.otherTimerText}>
              Étape {timerElsewhere.step + 1} · {timerElsewhere.done ? 'terminé !' : formatClock(remaining(timerElsewhere))}
            </Text>
            <Text style={styles.otherTimerLink}>Voir ›</Text>
          </TouchableOpacity>
        )}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: SPACING.lg }}>
          <Text style={styles.stepText}>{step.text}</Text>

          {ings.length > 0 && (
            <View style={styles.ings}>
              {ings.map((ing) => (
                <View key={ing.id} style={styles.ing}>
                  <Text style={styles.ingText}>{ing.name}{ing.quantity ? ` · ${ing.quantity}` : ''}</Text>
                </View>
              ))}
            </View>
          )}

          {timerHere ? (
            <View style={[styles.timer, timerHere.done && { backgroundColor: '#E2EBE4' }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.timerLabel}>{timerHere.done ? 'TERMINÉ' : 'MINUTEUR'}</Text>
                <Text style={styles.timerClock}>{timerHere.done ? '00:00' : formatClock(remaining(timerHere))}</Text>
                <Text style={styles.timerSub}>
                  {timerHere.done ? 'Le temps est écoulé.' : `sur ${formatMinutes(Math.round(timerHere.totalSec / 60))} · une alerte sonne à la fin`}
                </Text>
              </View>
              {!timerHere.done && (
                <TouchableOpacity style={styles.timerBtn} onPress={pauseResume} accessibilityRole="button" accessibilityLabel={timerHere.endAt ? 'Mettre en pause' : 'Reprendre'}>
                  <Ionicons name={timerHere.endAt ? 'pause' : 'play'} size={24} color="#fff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.timerStop} onPress={stopTimer} accessibilityRole="button" accessibilityLabel="Arrêter le minuteur">
                <Ionicons name="stop" size={18} color={INK} />
              </TouchableOpacity>
            </View>
          ) : step.timerMin ? (
            <TouchableOpacity style={styles.startTimer} onPress={() => startTimer(index, step.timerMin!)} accessibilityRole="button">
              <Ionicons name="timer-outline" size={22} color={INK} />
              <Text style={styles.startTimerText}>Lancer le minuteur · {formatMinutes(step.timerMin)}</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        <View style={styles.nav}>
          <TouchableOpacity
            style={[styles.navBtn, styles.navPrev, index === 0 && { opacity: 0.35 }]}
            disabled={index === 0}
            onPress={() => setIndex((i) => i - 1)}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={20} color={LIGHT} />
            <Text style={[styles.navText, { color: LIGHT }]}>Précédente</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, styles.navNext]}
            onPress={() => (isLast ? onClose() : setIndex((i) => i + 1))}
            accessibilityRole="button"
          >
            <Text style={styles.navText}>{isLast ? 'Terminé !' : 'Étape suivante'}</Text>
            <Ionicons name={isLast ? 'checkmark' : 'chevron-forward'} size={20} color={INK} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK, paddingHorizontal: SPACING.lg - 4 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  quit: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: DARK_2 },
  quitText: { fontSize: 14, fontWeight: '800', color: LIGHT },
  awake: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, backgroundColor: DARK_2 },
  awakeText: { fontSize: 12, fontWeight: '800', color: SOFT },
  kicker: { fontSize: 14, fontWeight: '800', color: COLORS.mustardLight, letterSpacing: 1 },
  progress: { flexDirection: 'row', gap: 5, marginTop: SPACING.sm + 2, marginBottom: SPACING.lg },
  progressBar: { flex: 1, height: 6, borderRadius: 3 },
  otherTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#3F4575',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    minHeight: 40,
    marginBottom: SPACING.md,
  },
  otherTimerText: { flex: 1, fontSize: 14, fontWeight: '800', color: LIGHT },
  otherTimerLink: { fontSize: 14, fontWeight: '800', color: LIGHT },
  stepText: { fontSize: 28, fontWeight: '800', color: LIGHT, lineHeight: 38 },
  ings: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.lg },
  ing: { backgroundColor: DARK_2, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  ingText: { fontSize: 14, fontWeight: '800', color: SOFT },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 4,
    backgroundColor: LIGHT,
    borderRadius: 26,
    padding: SPACING.md + 2,
    marginTop: SPACING.lg,
  },
  timerLabel: { fontSize: 13, fontWeight: '800', color: INK_MUTED },
  timerClock: { fontSize: 42, fontWeight: '800', color: INK, lineHeight: 48, fontVariant: ['tabular-nums'] },
  timerSub: { fontSize: 13, fontWeight: '700', color: INK_MUTED },
  timerBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  timerStop: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1E8D6', alignItems: 'center', justifyContent: 'center' },
  startTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: 60,
    borderRadius: 30,
    backgroundColor: COLORS.mustardLight,
    marginTop: SPACING.lg,
  },
  startTimerText: { fontSize: 17, fontWeight: '800', color: INK },
  nav: { flexDirection: 'row', gap: SPACING.sm + 2 },
  navBtn: { height: 60, borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  navPrev: { flex: 1, backgroundColor: DARK_2 },
  navNext: { flex: 1.4, backgroundColor: COLORS.primaryLight },
  navText: { fontSize: 16, fontWeight: '800', color: INK },
});
