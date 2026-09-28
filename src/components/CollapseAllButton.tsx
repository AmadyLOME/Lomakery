import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import { useStyles } from '../theme/ThemeProvider';

interface Props {
  allCollapsed: boolean;
  onPress: () => void;
}

// Pilule « Tout replier / Tout déplier » au-dessus d'une liste de groupes
export default function CollapseAllButton({ allCollapsed, onPress }: Props) {
  const styles = useStyles(makeStyles);
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} accessibilityRole="button" hitSlop={6}>
      <Ionicons name={allCollapsed ? 'chevron-expand' : 'chevron-collapse'} size={15} color={COLORS.text} />
      <Text style={styles.text}>{allCollapsed ? 'Tout déplier' : 'Tout replier'}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = () => StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.sand,
  },
  text: { fontSize: 13, fontWeight: '800', color: COLORS.text },
});
