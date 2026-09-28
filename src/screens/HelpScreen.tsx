import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../components/Text';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, TAB_BAR_SPACE } from '../constants/theme';
import { moderateScale } from '../utils/responsive';

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
    id: 'nouveautes',
    emoji: '✨',
    title: 'Quoi de neuf ?',
    content: [
      {
        question: 'Un nouvel Accueil',
        answer: 'L\'app s\'ouvre maintenant sur l\'Accueil : guirlande de photos de famille, repas du jour, courses et menu en un coup d\'œil, mots de la famille et infos utiles. Le Profil se trouve derrière votre avatar, en haut à droite.',
      },
      {
        question: 'Un vrai planning pour le menu',
        answer: 'Le menu se planifie jour par jour (midi et soir), avec la date de cuisson, les restes, les repas mangés, sautés ou reportés, et des menus enregistrés à réutiliser.',
      },
      {
        question: 'Une interface plus douce',
        answer: 'Formes arrondies, nouvelle police, barre d\'onglets flottante, photos pour les recettes et les profils, et notifications quand la famille modifie quelque chose.',
      },
    ],
  },
  {
    id: 'accueil',
    emoji: '🏠',
    title: 'L\'Accueil',
    content: [
      {
        question: 'À quoi sert l\'Accueil ?',
        answer: 'C\'est le premier onglet, ouvert au lancement. De haut en bas : la guirlande de photos de famille, la carte « Aujourd\'hui » avec les repas du midi et du soir (cochez le rond quand un plat est cuisiné ou quand des restes sont mangés), les tuiles Courses et Menu (nombre d\'articles à acheter, stocks bas, plats prévus — touchez-les pour ouvrir l\'onglet), puis les mots de la famille et les infos utiles (« Tout voir » pour les ouvrir en grand).',
      },
      {
        question: 'Où est mon profil ?',
        answer: 'Touchez votre avatar (avec la petite roue ⚙︎) en haut à droite de l\'Accueil : vous y trouvez votre photo, le foyer et son code d\'invitation, l\'aide et la déconnexion.',
      },
      {
        question: 'Photos de famille',
        answer: 'La guirlande de polaroïds en haut de l\'Accueil montre jusqu\'à 5 photos du foyer (au-delà de 3, elles défilent). Touchez-la pour ajouter une photo, la remplacer, la retirer ou écrire sa légende. Les autres membres sont prévenus quand une photo est ajoutée. Les photos bougent doucement ; si « Réduire les animations » est activé dans les réglages d\'Accessibilité de l\'iPhone, elles restent immobiles.',
      },
      {
        question: 'Mots de la famille',
        answer: 'Un mur de petits mots partagé par le foyer : rappels, infos, messages. Touchez « Écrire un mot », puis la flèche pour l\'envoyer ; les autres membres reçoivent une notification et voient « … écrit un mot » pendant que vous écrivez. Touchez un mot pour l\'épingler en haut, le copier ou le supprimer (seul son auteur peut le supprimer).',
      },
      {
        question: 'Infos utiles',
        answer: 'Des fiches pour ce que tout le foyer doit avoir sous la main : Wi-Fi, médecin, code du portail, jours de poubelles… Touchez + (ou un modèle) pour en créer une. Un champ « Masquer » s\'affiche en •••• : l\'œil le révèle, le bouton copier le copie, et un champ « Téléphone » peut être appelé directement. Touchez le titre d\'une fiche pour la modifier ou la supprimer.',
      },
      {
        question: 'Mes infos sont-elles protégées ?',
        answer: 'Les mots et les fiches ne sont visibles que par les membres de votre foyer. Évitez tout de même d\'y noter des codes bancaires ou des mots de passe importants.',
      },
    ],
  },
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
        question: 'Rechercher ou ajouter un article',
        answer: 'Le champ « Rechercher ou ajouter un article… » filtre la liste pendant que vous tapez (sans tenir compte des accents). Il propose aussi de remettre à acheter un article qui est à la casa, ou de créer « … » s\'il n\'existe pas (rangé dans « Autres »). La touche Entrée fait l\'action directement.',
      },
      {
        question: 'Annuler une erreur',
        answer: 'Après avoir coché un article ou en avoir créé un, un bandeau « Annuler » s\'affiche quelques secondes en bas de l\'écran : touchez-le pour revenir en arrière.',
      },
      {
        question: 'Comment cocher un article ?',
        answer: 'Appuyez sur le cercle à gauche de l\'article. S\'il est dans "À acheter" il passe dans "À la casa", et inversement.',
      },
      {
        question: 'Gestion du stock',
        answer: 'Les articles avec un seuil défini affichent des boutons − et + dans "À la casa". Décrémenter le stock en dessous du seuil le remet automatiquement dans "À acheter".',
      },
      {
        question: 'Cocher un article "À acheter" avec seuil',
        answer: 'Si un article a un seuil configuré, appuyer sur sa checkbox vous demande combien vous en avez acheté. La quantité saisie s\'ajoute au stock existant. Si le total dépasse le seuil, l\'article passe automatiquement "À la casa". Sinon il reste "À acheter" avec le stock mis à jour.',
      },
      {
        question: 'Stock à la création',
        answer: 'En créant un article dans Paramétrage, si vous renseignez un stock supérieur au seuil, l\'article est placé directement "À la casa". Si le stock est inférieur ou égal au seuil, il est placé "À acheter".',
      },
    ],
  },
  {
    id: 'parametrer',
    emoji: '⚙️',
    title: 'Paramétrer le garde-manger',
    content: [
      {
        question: 'Ouvrir le paramétrage',
        answer: 'Dans l\'onglet Courses, touchez le bouton rond de réglages en haut à droite. La coche ✓ au même endroit referme le paramétrage.',
      },
      {
        question: 'Créer un groupe',
        answer: 'Dans le paramétrage, appuyez sur le bouton orange + en bas à droite pour créer un groupe (ex : Boucherie, Poissonnerie). Les groupes permettent d\'organiser vos articles par rayon. Appui long sur un groupe pour le renommer.',
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
        question: 'Modifier un article existant',
        answer: 'Appuyez sur l\'article (icône ✏️) pour modifier son nom, son groupe, son unité, son stock ou son seuil d\'alerte.',
      },
      {
        question: 'Supprimer un article ou un groupe',
        answer: 'Appuyez sur le × à droite de l\'article ou du groupe. Un groupe supprimé retire également tous ses articles.',
      },
    ],
  },
  {
    id: 'recettes',
    emoji: '🍳',
    title: 'Les Recettes',
    content: [
      {
        question: 'Créer une recette',
        answer: 'Dans l\'onglet Recettes, appuyez sur le bouton orange + en haut à droite. Donnez-lui un nom et une description optionnelle, puis validez.',
      },
      {
        question: 'Liste ou carrousel',
        answer: 'Sous le titre, le sélecteur « Liste / Carrousel » change l\'affichage des recettes. Le choix est mémorisé sur votre téléphone.',
      },
      {
        question: 'Ajouter une photo',
        answer: 'Ouvrez une recette et touchez la zone photo en haut : prenez une photo ou choisissez-en une dans la galerie. Elle apparaît dans la liste et le carrousel.',
      },
      {
        question: 'Ajouter des ingrédients',
        answer: 'Ouvrez une recette et appuyez sur le bouton +. Un écran s\'ouvre avec vos articles classés par groupe. Saisissez une quantité (optionnel) et sélectionnez l\'article. La pastille indique sa disponibilité : coche verte = à la casa, caddie orange = à acheter (déjà dans la liste), point d\'exclamation rouge = absent de la liste de courses.',
      },
      {
        question: 'Modifier la quantité d\'un ingrédient',
        answer: 'Dans le détail d\'une recette, appuyez sur l\'ingrédient (icône ✏️). Une boîte de dialogue s\'ouvre pour modifier la quantité.',
      },
      {
        question: 'Ajouter les ingrédients absents aux courses',
        answer: 'Dans une recette, le bouton « Ajouter les absents aux courses » crée d\'un coup les ingrédients qui ne sont pas encore dans votre liste, « À acheter », dans le rayon de votre choix. Le même bouton existe dans le Menu pour tous les plats de la semaine.',
      },
      {
        question: 'Article non trouvé dans la liste ?',
        answer: 'Si l\'article n\'existe pas encore, appuyez sur « Ajouter un article dans Paramétrage » pour l\'ajouter. Revenez ensuite sur la recette — il apparaîtra dans la liste.',
      },
      {
        question: 'Supprimer un ingrédient ou une recette',
        answer: 'Pour un ingrédient : appuyez sur le ✕ à droite dans le détail. Pour une recette : appuyez sur la poubelle sur sa carte (liste ou carrousel).',
      },
    ],
  },
  {
    id: 'menu',
    emoji: '📅',
    title: 'Menu de la semaine',
    content: [
      {
        question: 'Planifier un plat',
        answer: 'Dans l\'onglet Menu, touchez un créneau « Ajouter un plat » (Midi ou Soir). Choisissez la recette puis cochez les repas où elle sera mangée : un même plat peut couvrir plusieurs repas, pas forcément à la suite.',
      },
      {
        question: 'Quand cuisiner ?',
        answer: 'Pour chaque plat, indiquez s\'il est cuisiné le jour même, la veille ou un autre jour. Le premier repas affiche « À cuisiner… », les suivants « Restes ». Cochez le rond quand c\'est fait : il devient « Cuisiné ». Un point orange dans la frise signale les jours où il faut cuisiner.',
      },
      {
        question: 'Repas mangé, sauté ou reporté',
        answer: 'Touchez un repas du planning : « Mangé ✓ » le passe en vert. « Sauté… » ouvre la grille de la semaine pour le reporter sur un autre créneau (ou le sauter simplement) ; le repas sauté reste affiché, grisé, et « Annuler « sauté » » remet tout comme avant.',
      },
      {
        question: 'Modifier ou retirer un plat',
        answer: 'Touchez le plat dans le planning : marquer comme cuisiné, modifier ses repas, ou le retirer du menu. « Vider la semaine » en bas du planning retire tout d\'un coup.',
      },
      {
        question: 'Articles à acheter pour le menu',
        answer: 'La pastille rouge au-dessus du planning compte les ingrédients de vos plats marqués « À acheter ». Touchez-la pour voir la liste par rayon.',
      },
      {
        question: 'Trois semaines seulement',
        answer: 'L\'app garde la semaine passée, l\'actuelle et la prochaine. Chaque dimanche, la semaine la plus ancienne est effacée.',
      },
      {
        question: 'Enregistrer et réutiliser un menu',
        answer: 'Le bouton signet en haut à droite ouvre « Menus enregistrés » : donnez un nom au menu de la semaine affichée pour le garder, puis réutilisez-le plus tard pour cette semaine ou la prochaine (il remplace les plats existants).',
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
        answer: 'Touchez votre avatar en haut de l\'Accueil : la carte « Mon foyer » affiche le code d\'invitation. Partagez-le ou copiez-le avec les boutons ronds. Votre partenaire crée un compte, choisit « Rejoindre » et entre le code.',
      },
      {
        question: 'Un compte, un foyer',
        answer: 'Chaque compte appartient à un seul foyer. Pour un ami qui veut son propre foyer : il crée un compte dans l\'app et choisit « Créer un foyer ». Ses listes, recettes et menus restent séparés des vôtres.',
      },
      {
        question: 'Synchronisation en temps réel',
        answer: 'Toutes les modifications sont synchronisées instantanément entre les téléphones du foyer. Si quelqu\'un coche un article, vous le voyez changer en temps réel.',
      },
      {
        question: 'Notifications',
        answer: 'Les autres membres reçoivent une notification quand un article passe « À acheter », quand un stock est bas, quand le menu change ou quand un mot est écrit. Autorisez les notifications d\'Expo Go dans les Réglages de l\'iPhone si vous ne les recevez pas.',
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
        answer: 'Touchez votre avatar en haut de l\'Accueil, puis « Se déconnecter » en bas du profil. Vos données restent sauvegardées dans le cloud.',
      },
      {
        question: 'Changer ma photo de profil',
        answer: 'Dans le profil, touchez votre avatar (pastille appareil photo) : prenez une photo ou choisissez-en une. Les autres membres la voient dans l\'app.',
      },
      {
        question: 'Mes données sont-elles sauvegardées ?',
        answer: 'Oui, toutes les données sont stockées dans Firebase (Google Cloud). Elles sont accessibles même si vous changez de téléphone.',
      },
    ],
  },
];

export default function HelpScreen() {
  const [openSections, setOpenSections] = useState<string[]>(['accueil']);
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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}>
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>💡</Text>
        <Text style={styles.heroTitle}>Comment utiliser TeninGrocery</Text>
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
  heroEmoji: { fontSize: moderateScale(48), marginBottom: SPACING.sm },
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
