import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Recipe } from '../types';
import { useRecipePhoto } from '../hooks/useRecipePhoto';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { moderateScale } from '../utils/responsive';

interface RecipeStats {
  total: number;
  available: number;
  missing: number;
}

interface RecipeCarouselProps {
  recipes: Recipe[];
  householdId: string;
  getStats: (recipe: Recipe) => RecipeStats;
  onOpen: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
}

const CARD_GAP = SPACING.md;

export default function RecipeCarousel({ recipes, householdId, getStats, onOpen, onDelete }: RecipeCarouselProps) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  // La carte occupe ~82 % de la largeur : on aperçoit la suivante
  const cardWidth = Math.min(width * 0.82, 520);
  const sideInset = (width - cardWidth) / 2;
  const interval = cardWidth + CARD_GAP;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / interval);
    if (i !== index) setIndex(Math.max(0, Math.min(recipes.length - 1, i)));
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={recipes}
        keyExtractor={(r) => r.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={interval}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: sideInset - CARD_GAP / 2, paddingVertical: SPACING.lg }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={{ width: cardWidth, marginHorizontal: CARD_GAP / 2 }}>
            <RecipeCard
              recipe={item}
              householdId={householdId}
              stats={getStats(item)}
              onOpen={() => onOpen(item)}
              onDelete={() => onDelete(item)}
            />
          </View>
        )}
      />

      {recipes.length > 1 && (
        <View style={styles.dots}>
          {recipes.map((r, i) => (
            <View key={r.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

interface RecipeCardProps {
  recipe: Recipe;
  householdId: string;
  stats: RecipeStats;
  onOpen: () => void;
  onDelete: () => void;
}

function RecipeCard({ recipe, householdId, stats, onOpen, onDelete }: RecipeCardProps) {
  const photoUri = useRecipePhoto(householdId, recipe.id, recipe.photoUpdatedAt);
  const allReady = stats.total > 0 && stats.missing === 0 && stats.available === stats.total;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onOpen}>
      <View style={styles.photoBox}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.placeholderEmoji}>🍳</Text>
            <Text style={styles.placeholderHint}>Ouvre la recette pour ajouter une photo</Text>
          </View>
        )}
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={8}>
          <Text style={styles.deleteBtnText}>🗑</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{recipe.name}</Text>
        {recipe.description ? (
          <Text style={styles.desc} numberOfLines={3}>{recipe.description}</Text>
        ) : null}

        <View style={styles.badges}>
          {stats.total === 0 ? (
            <Text style={[styles.badge, styles.badgeNeutral]}>Aucun ingrédient</Text>
          ) : allReady ? (
            <Text style={[styles.badge, styles.badgeGreen]}>🟢 Tout est à la casa</Text>
          ) : (
            <>
              <Text style={[styles.badge, styles.badgeGreen]}>🟢 {stats.available}</Text>
              {stats.missing > 0 && <Text style={[styles.badge, styles.badgeRed]}>🔴 {stats.missing}</Text>}
            </>
          )}
          {stats.total > 0 && <Text style={[styles.badge, styles.badgeNeutral]}>{stats.total} ing.</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  photoBox: { aspectRatio: 4 / 3, backgroundColor: COLORS.surfaceWarm },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.md },
  placeholderEmoji: { fontSize: moderateScale(56) },
  placeholderHint: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center' },
  deleteBtn: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: BORDER_RADIUS.full,
    padding: SPACING.xs + 2,
  },
  deleteBtnText: { fontSize: 16 },
  body: { padding: SPACING.md },
  name: { fontSize: FONT_SIZE.xxl, fontWeight: '700', color: COLORS.text },
  desc: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginTop: SPACING.xs, lineHeight: 20 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.sm },
  badge: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  badgeGreen: { backgroundColor: COLORS.green + '22', color: COLORS.green },
  badgeRed: { backgroundColor: COLORS.danger + '22', color: COLORS.danger },
  badgeNeutral: { backgroundColor: COLORS.border, color: COLORS.textSecondary },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: SPACING.lg },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.primary, width: 18 },
});
