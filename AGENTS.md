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
  utils/                 weeks (semaines, créneaux), menuDisplay, time, responsive
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
| `…/familyList`, `…/familyGroups` | articles (stock, seuil) et rayons |
| `…/recipes`, `…/recipePhotos` | recettes et leurs photos (séparées pour ne pas les recharger) |
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

## Limites connues

- Expo Go impose sa version du SDK : il faut migrer quand il se met à jour.
- Pas de notifications push sur Android dans Expo Go (SDK 53+).
- Recette et production partagent la même base Firebase.
- Règles Firestore publiées à la main (pas de Firebase CLI ni de CI).
- Piste : vraie app via build EAS + TestFlight (compte Apple Developer).
