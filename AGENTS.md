# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# TeninGrocery (projet Expo « Lomakery »)

App mobile familiale, en français : liste de courses partagée avec stock, recettes, planning des repas de la
semaine, et un Accueil (photos de famille, repas du jour, mots, infos utiles). Tout le foyer est synchronisé en
temps réel. Il n'y a **aucun serveur à nous** : les téléphones parlent directement à Firebase et reçoivent le code
via EAS Update.

## Stack

- Expo SDK 57 · React Native 0.86 · React 19.2 · TypeScript 6 (strict)
- React Navigation 7 : onglets (barre flottante maison) + piles natives
- Firebase JS 12 : Auth (email / mot de passe, session gardée via AsyncStorage) + Cloud Firestore (europe-west9),
  offre Spark (gratuite)
- expo-notifications + API push d'Expo (envoyée depuis le téléphone, sans backend)
- expo-image-picker + expo-image-manipulator : photos en JPEG base64 **dans Firestore** (Firebase Storage exige
  l'offre Blaze)
- Polices : Nunito (interface) et Caveat (légendes des polaroïds), via `@expo-google-fonts`
- Distribution : Expo Go + EAS Update, branche `production`, runtime `1.0.0`

## Structure

```
App.tsx                  chargement des polices puis AppNavigator
firestore.rules          règles Firestore (source de vérité, voir « Déploiement »)
src/
  navigation/            AppNavigator : Accueil (pile : Mots, Infos, Photos, Profil, Aide) · Courses · Recettes · Menu
  screens/               un fichier par écran
  components/            Text, ScreenHeader, RoundButton, Segmented, FloatingTabBar, SlotGrid, PolaroidGarland, feuilles modales…
  services/              accès Firestore / Auth / notifications / photos, un fichier par domaine
  hooks/                 useAuth, useRecipePhoto
  theme/                 ThemeProvider (réglage Apparence, useTheme, useStyles)
  utils/                 weeks (semaines, créneaux), menuDisplay, time, responsive, ingredients (disponibilité),
                         quantities (portions), tags, recipeShare (texte / HTML du partage)
  constants/             theme (couleurs, arrondis, polices, TAB_BAR_SPACE), palette
  types/                 types partagés
```

## Données Firestore

Tout ce qui est partagé vit sous `households/{householdId}` ; un compte appartient à un seul foyer
(`users/{uid}.householdId`).

| Chemin | Contenu |
|---|---|
| `users/{uid}` | profil privé (email, nom, householdId) |
| `invites/{code}` | code d'invitation → householdId (lecture par `get` seulement) |
| `households/{id}` | nom, `members[]`, `inviteCode` |
| `…/familyList`, `…/familyGroups` | articles (stock, seuil) et rayons (`order` = parcours du magasin, commun au foyer) |
| `…/recipes`, `…/recipePhotos` | recettes (ingrédients, `servings`, `tags[]`, `steps[]`, `prepMin`/`cookMin`/`restMin`) et leurs photos (séparées pour ne pas les recharger) |
| `…/weeks/{lundi AAAA-MM-JJ}` | menu planifié : `entries[]` (créneaux, cuisson, mangé, sauté/reporté) |
| `…/savedMenus` | menus enregistrés, positions relatives |
| `…/members/{uid}` | nom + photo visibles par le foyer |
| `…/pushTokens/{uid}` | tokens de notification |
| `…/notes`, `…/typing/{uid}` | mots de la famille et indicateur « écrit un mot » |
| `…/infos` | fiches d'infos utiles |
| `…/familyPhotos` | photos de la guirlande (5 max) |

L'app ne garde que 3 semaines de menu (passée, actuelle, prochaine) : les plus anciennes sont effacées à
l'ouverture du Menu.

## Conventions de code

- **Toujours importer `Text` / `TextInput` depuis `src/components/Text`**, jamais depuis `react-native` : le
  composant convertit `fontWeight` en famille Nunito. Pour une autre police, fixer `fontFamily` (ex.
  `FONTS.handwritten`).
- Couleurs, arrondis, espacements et polices viennent de `constants/theme.ts` ; pas de valeurs en dur quand un
  jeton existe. Boutons en pilule, cartes arrondies (`borderRadius` 20 à 28), ombre `SHADOWS.soft`.
- Écrans à onglet : `ScreenHeader` (grand titre à gauche, `onBack` pour les écrans empilés) et
  `paddingBottom: TAB_BAR_SPACE` sous la barre flottante.
- Firestore refuse `undefined` : normaliser avant d'écrire. Les modifications concurrentes d'un même document
  passent par une transaction (voir `updateWeek`).
- Textes et commentaires en français ; accessibilité : `accessibilityRole` / `accessibilityLabel` sur les boutons à
  icône, cibles de 44 px minimum, respect de « Réduire les animations ».
- **Thème clair / sombre** : `COLORS`, `SHADOWS` et `SOFT_COLORS` sont mis à jour sur place par `applyScheme()`
  (`src/theme/ThemeProvider.tsx`). Dans chaque fichier : `const makeStyles = () => StyleSheet.create({…})` et, dans
  chaque composant, `const styles = useStyles(makeStyles);` (ou `useTheme()` s'il n'a pas de styles mais lit `COLORS`).
  Ne jamais figer une couleur au chargement du module (tableau ou objet de haut niveau) : utiliser un getter ou
  `useTheme().scheme`. Toute nouvelle couleur = un jeton dans les deux palettes ; texte sur pastille moutarde / orange
  clair : `COLORS.onAccent`.
- Vérifier avant de livrer : `npx tsc --noEmit` et `npx expo-doctor`.

## Développement et déploiement

1. Une branche par chantier : `git checkout -b feat/…`
2. Test en direct : `npx expo start`, puis scanner le QR code avec Expo Go (les données sont celles de
   production : il n'y a pas encore de base de test).
3. Si `firestore.rules` a changé : **publier les règles dans la console Firebase avant de mettre à jour l'app**
   (Firestore → Règles, coller le fichier entier). Sinon l'app reçoit des `permission-denied`.
4. Fusion : `git checkout main && git merge --ff-only feat/…`
5. Publication : `npx eas-cli update --branch production --environment production --message "…"`
6. **Toujours pousser** : `git push origin main`. En juin 2026, le code de production n'était que sur un PC dont le
   disque est mort ; il a fallu le reconstituer depuis le bundle publié.
7. Sur les iPhones : Expo Go → Projects → Lomakery → production → ouvrir l'update la plus récente (les autres
   membres : QR code « Preview » du tableau de bord Expo).

## Feuille de route

Maquettes : canvas « TeninGrocery — Maquette UI arrondie » (Artifact claude.ai), rangées « courses et recettes plus
malignes » et « mode magasin et mode sombre ». Statut : **validées**. Livraison 1 (points 1 et 3) en production ;
livraison 2 (points 4, 5, 7, 8) en production ; livraison 3 (point 2) en production ; mode sombre (point 6) développé.

1. **Du menu aux courses en un geste** — bouton « Ajouter les N manquants aux courses » sur la fiche recette et
   pour la semaine du menu. Les articles connus passent « À acheter » ; les absents sont créés dans un rayon choisi
   (proposé d'après les autres recettes, sinon à choisir). Une feuille de confirmation liste ce qui va être fait.
2. **Mode « En magasin »** — vue plein écran des seuls articles « À acheter », gros ronds à cocher, barre de
   progression (8 / 15), écran maintenu allumé (`expo-keep-awake`), rayons dans l'**ordre du parcours magasin**
   (nouveau champ `order` sur `familyGroups`, réglé par flèches ↑↓ plutôt que glisser-déposer, commun au foyer).
3. **Ajout rapide dans Courses** — champ « + Ajouter » avec suggestions tirées des articles connus (passer « À
   acheter », ou créer un nouvel article), et bandeau **« Annuler »** de quelques secondes après un cochage ou une
   suppression.
4. **Portions** — nombre de personnes de référence par recette (`servings`) et sélecteur « Pour N personnes » ;
   les quantités numériques sont recalculées (« 1 kg » → « 1,5 kg »), le texte libre est affiché tel quel.
5. **Étiquettes de recettes** — étiquettes libres par recette (`tags: string[]`) avec couleurs, filtre en pastilles
   dans l'onglet Recettes (plus une recherche par nom ou ingrédient). Les étiquettes se choisissent / créent depuis la
   fiche recette ; une gestion globale (renommer, supprimer) pourra venir plus tard.
6. **Mode sombre** — réglage « Apparence : Auto / Clair / Sombre » dans le Profil (propre au téléphone,
   AsyncStorage `appearance`) ; palettes `LIGHT_COLORS` / `DARK_COLORS` dans `theme.ts` (fond #141A14, surfaces
   #1F2A20, orange éclairci pour le contraste). Le mode cuisine reste toujours sombre, les polaroïds gardent un papier
   clair.

7. **Étapes de recette et mode cuisine** — onglet « Ingrédients | Étapes » dans la fiche recette ; étapes
   numérotées et réordonnables (`steps: { id, text, timerMin? }[]`), durées de préparation / cuisson / marinade ;
   « Mode cuisine » plein écran : une étape à la fois en grand, progression, ingrédients de l'étape (quantités selon
   les portions), minuteur avec alerte (notification locale), écran maintenu allumé.

8. **Partager une recette** — bouton partager dans la fiche recette → feuille « Partager la recette » : format
   « Message » (texte lisible dans WhatsApp, SMS, Mail) ou « Fiche PDF » (mise en page avec photo, via
   `expo-print` + `expo-sharing`) ; choix des portions (quantités recalculées) et de ce qui est inclus
   (ingrédients, étapes, photo) ; aperçu ; puis menu de partage natif iOS (`Share` pour le texte,
   `Sharing.shareAsync` pour le PDF). Plus tard : lien
   d'import pour qu'un autre foyer TeninGrocery ajoute la recette en un geste.

Plus tard : rappels de cuisson (notifications locales), vraie app (build EAS + TestFlight) avec hors-ligne complet,
base Firebase de test, règles déployées par la Firebase CLI et vérifications automatiques, partage de la liste en
texte, suggestions à partir de l'historique, Siri / widget iOS.

## Limites connues

- Expo Go impose sa version du SDK : il faut migrer quand il se met à jour.
- Pas de notifications push sur Android dans Expo Go (SDK 53+).
- Recette et production partagent la même base Firebase.
- Règles Firestore publiées à la main (pas de Firebase CLI ni de CI).
- Piste : vraie app via build EAS + TestFlight (compte Apple Developer).
