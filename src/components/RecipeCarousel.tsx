import React, { useState } from 'react';
import { View, Image, FlatList, TouchableOpacity, StyleSheet, useWindowDimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Text } from './Text';
import { Recipe } from '../types';
import { useRecipePhoto } from '../hooks/useRecipePhoto';
import { AvailabilityBadge } from './Availability';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS, TAB_BAR_SPACE } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale } from '../utils/responsive';

interface RecipeStats {
  total: number;
  available: number;
  toBuy: number;
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
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`Supprimer ${recipe.name}`}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.dangerText} />
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
            <AvailabilityBadge status="available" label="Tout est à la casa" />
          ) : (
            <>
              {stats.available > 0 && <AvailabilityBadge status="available" count={stats.available} />}
              {stats.toBuy > 0 && <AvailabilityBadge status="toBuy" count={stats.toBuy} />}
              {stats.missing > 0 && <AvailabilityBadge status="missing" count={stats.missing} />}
            </>
          )}
          {stats.total > 0 && <Text style={[styles.badge, styles.badgeNeutral]}>{stats.total} ing.</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: TAB_BAR_SPACE - 20 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  photoBox: { aspectRatio: 4 / 3, backgroundColor: COLORS.sand },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.md },
  placeholderEmoji: { fontSize: moderateScale(56) },
  placeholderHint: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center' },
  deleteBtn: {
    position: 'absolute',
    top: SPACING.md - 4,
    right: SPACING.md - 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: SPACING.md },
  name: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.text },
  desc: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginTop: SPACING.xs, lineHeight: 20 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.sm },
  badge: {
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  badgeGreen: { backgroundColor: COLORS.greenSoft, color: COLORS.green },
  badgeRed: { backgroundColor: COLORS.dangerSoft, color: COLORS.dangerText },
  badgeNeutral: { backgroundColor: COLORS.sand, color: COLORS.textMuted },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.sandDark },
  dotActive: { backgroundColor: COLORS.primary, width: 20 },
});
