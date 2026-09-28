import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import RoundButton from './RoundButton';
import { COLORS, SPACING } from '../constants/theme';
import { moderateScale } from '../utils/responsive';
import { useStyles } from '../theme/ThemeProvider';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void; // affiche un bouton retour rond à gauche
}

// Grand titre aligné à gauche, avec une action optionnelle à droite
export default function ScreenHeader({ title, subtitle, right, onBack }: ScreenHeaderProps) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + SPACING.sm }]}>
      {onBack ? (
        <View style={styles.back}>
          <RoundButton icon="chevron-back" label="Retour" onPress={onBack} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg - 4,
    paddingBottom: SPACING.md - 4,
    backgroundColor: COLORS.background,
  },
  subtitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  title: { fontSize: moderateScale(30), fontWeight: '800', color: COLORS.text, lineHeight: moderateScale(34) },
  right: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  back: { marginRight: SPACING.md - 4 },
});
