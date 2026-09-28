import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { COLORS, SPACING, TAB_BAR_SPACE } from '../constants/theme';

const DURATION_MS = 5000;

interface Toast {
  message: string;
  undo?: () => void;
}

// Bandeau « … · Annuler » affiché quelques secondes au-dessus de la barre d'onglets
export function useUndoToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, undo?: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, undo });
    timer.current = setTimeout(() => setToast(null), DURATION_MS);
  }, []);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { toast, show, hide };
}

export default function UndoToast({ toast, onHide }: { toast: Toast | null; onHide: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: toast ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [toast]);

  if (!toast) return null;

  return (
    <Animated.View style={[styles.toast, { opacity }]} accessibilityLiveRegion="polite">
      <Ionicons name="checkmark" size={18} color="#7FB38F" />
      <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
      {toast.undo && (
        <TouchableOpacity
          style={styles.undo}
          onPress={() => { toast.undo?.(); onHide(); }}
          accessibilityRole="button"
        >
          <Text style={styles.undoText}>Annuler</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: SPACING.lg - 4,
    right: SPACING.lg - 4,
    bottom: TAB_BAR_SPACE - 12,
    minHeight: 54,
    borderRadius: 27,
    backgroundColor: COLORS.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    paddingLeft: SPACING.md + 2,
    paddingRight: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  message: { flex: 1, fontSize: 14, fontWeight: '700', color: '#FBF6EA', paddingVertical: SPACING.sm },
  undo: { height: 38, borderRadius: 19, backgroundColor: COLORS.mustardLight, paddingHorizontal: 14, justifyContent: 'center' },
  undoText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
});
