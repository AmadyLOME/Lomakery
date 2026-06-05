import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';

interface Section {
  id: string;
  emoji: string;
  title: string;
  content: HelpItem[];
}

interface HelpItem {
  question: string;
  answer: string;
}

const SECTIONS: Section[] = [
  {
    id: 'liste',
    emoji: '🛒',
    title: 'La Liste de courses',
    content: [
      {
        question: 'À acheter vs À la casa',
        answer: 'La vue "À acheter" regroupe tout ce qu\'il faut aller chercher. La vue "À la casa" liste ce que vous avez déjà à la maison. Appuyez sur la checkbox d\'un article pour le déplacer d\'une liste à l\'autre.',
      },
      {
        question: 'Comment cocher un article ?',
        answer: 'Appuyez sur le cercle à gauche de l\'article. S\'il est dans "À acheter" il passe dans "À la casa", et inversement.',
      },
      {
        question: 'Gestion du stock',
        answer: 'Les articles avec un seuil défini affichent des boutons − et + dans "À la casa". Décrémenter le stock en dessous du seuil le remet automatiquement dans "À acheter".',
      },
    ],
  },
  {
    id: 'parametrer',
    emoji: '⚙️',
    title: 'Paramétrer le garde-manger',
    content: [
      {
        question: 'Créer un groupe',
        answer: 'Appuyez sur le bouton + en bas à droite pour créer un groupe (ex : Boucherie, Poissonnerie). Les groupes permettent d\'organiser vos articles par rayon.',
      },
      {
        question: 'Ajouter un article',
        answer: 'Dans un groupe, appuyez sur "+ Article". Saisissez le nom, l\'unité (kg, L, pièces…), et optionnellement le stock actuel et le seuil d\'alerte.',
      },
      {
        question: 'Stock et seuil d\'alerte',
        answer: 'Le stock est la quantité disponible à la maison. Le seuil est le minimum en dessous duquel l\'article bascule automatiquement dans "À acheter". Ces champs sont optionnels — sans seuil, l\'article fonctionne avec la simple checkbox.',
      },
      {
        question: 'Supprimer un article ou un groupe',
        answer: 'Appuyez sur le × à droite de l\'article ou du groupe. Un groupe supprimé retire également tous ses articles.',
      },
    ],
  },
  {
    id: 'famille',
    emoji: '👨‍👩‍👧',
    title: 'Partager avec votre famille',
    content: [
      {
        question: 'Inviter votre partenaire',
        answer: 'Allez dans Profil → votre foyer affiche un code d\'invitation. Partagez-le via le bouton ↗. Votre partenaire crée un compte, choisit "Rejoindre" et entre le code.',
      },
      {
        question: 'Synchronisation en temps réel',
        answer: 'Toutes les modifications sont synchronisées instantanément entre les deux téléphones. Si votre femme coche un article, vous le voyez disparaître en temps réel.',
      },
    ],
  },
  {
    id: 'compte',
    emoji: '👤',
    title: 'Mon compte',
    content: [
      {
        question: 'Se déconnecter',
        answer: 'Profil → bouton "Se déconnecter" en bas de page. Vos données restent sauvegardées dans le cloud.',
      },
      {
        question: 'Mes données sont-elles sauvegardées ?',
        answer: 'Oui, toutes les données sont stockées dans Firebase (Google Cloud). Elles sont accessibles même si vous changez de téléphone.',
      },
    ],
  },
];

export default function HelpScreen() {
  const [openSections, setOpenSections] = useState<string[]>(['liste']);
  const [openItems, setOpenItems] = useState<string[]>([]);

  function toggleSection(id: string) {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function toggleItem(key: string) {
    setOpenItems((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>💡</Text>
        <Text style={styles.heroTitle}>Comment utiliser Lomakery</Text>
        <Text style={styles.heroSubtitle}>
          Tout ce qu'il faut savoir pour gérer vos courses en famille.
        </Text>
      </View>

      {SECTIONS.map((section) => {
        const isOpen = openSections.includes(section.id);
        return (
          <View key={section.id} style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection(section.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionEmoji}>{section.emoji}</Text>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {isOpen && (
              <View style={styles.sectionBody}>
                {section.content.map((item, idx) => {
                  const key = `${section.id}-${idx}`;
                  const isItemOpen = openItems.includes(key);
                  return (
                    <View key={key} style={styles.item}>
                      <TouchableOpacity
                        style={styles.itemHeader}
                        onPress={() => toggleItem(key)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.question}>{item.question}</Text>
                        <Text style={styles.itemChevron}>{isItemOpen ? '−' : '+'}</Text>
                      </TouchableOpacity>
                      {isItemOpen && (
                        <Text style={styles.answer}>{item.answer}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  hero: {
    alignItems: 'center',
    padding: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  heroEmoji: { fontSize: 48, marginBottom: SPACING.sm },
  heroTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  heroSubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceWarm,
  },
  sectionEmoji: { fontSize: 20, marginRight: SPACING.sm },
  sectionTitle: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  chevron: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  sectionBody: { borderTopWidth: 1, borderTopColor: COLORS.border },
  item: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  question: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },
  itemChevron: {
    fontSize: 20,
    color: COLORS.mustard,
    fontWeight: '700',
    marginLeft: SPACING.sm,
  },
  answer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
});
