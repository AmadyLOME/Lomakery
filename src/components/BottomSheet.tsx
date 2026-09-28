import React from 'react';
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../constants/theme';
import { useStyles } from '../theme/ThemeProvider';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// Fenêtre qui monte du bas. Elle ne dépasse jamais la zone sûre (encoche, Dynamic Island) :
// avec le clavier ouvert elle rétrécit et son contenu défile, quel que soit l'iPhone.
export default function BottomSheet({ visible, onClose, children }: Props) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={[styles.sheet, { maxHeight: height - insets.top - SPACING.md }]}>
          <View style={styles.grabber} />
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, SPACING.md) + SPACING.sm }]}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = () => StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31,46,31,0.45)' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: COLORS.sandDark, marginTop: SPACING.sm + 2 },
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
});
