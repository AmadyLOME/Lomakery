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
- expo-keep-awake (mode cuisine, mode magasin), expo-print + expo-sharing (fiche recette en PDF)
- Polices : Nunito (interface) et Caveat (légendes des polaroïds), via `@expo-google-fonts`
- Distribution : Expo Go + EAS Update, branche `production`, runtime `1.0.0`

## Structure

```
App.tsx                  chargement des polices et du réglage Apparence, puis ThemeProvider → AppNavigator
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

## Fonctionnalités (état actuel)

- **Accueil** : guirlande de 5 polaroïds de famille, repas du jour (cuisiné / mangé), aperçu courses et menu, mur de
  mots (épinglables), infos utiles (champs secrets masqués). Profil via l'avatar.
- **Courses** : « À acheter » / « À la casa », rayons repliables, stock et seuil, ajout rapide avec suggestions,
  bandeau « Annuler », ordre alphabétique. **Mode en magasin** (plein écran, écran allumé, progression) et **ordre
  des rayons** (flèches ↑↓, commun au foyer, appliqué partout). Paramétrage : articles et rayons.
- **Recettes** : liste ou carrousel, recherche (nom ou ingrédient) et filtre par étiquettes. Fiche : photo,
  étiquettes, **portions** (quantités recalculées), onglets **Ingrédients | Étapes** (disponibilité de chaque
  ingrédient, absents → courses ; durées, étapes avec minuteur), **mode cuisine**, **partage** (message ou PDF).
- **Menu** : planning de la semaine midi / soir, date de cuisson, restes, mangé / sauté / reporté, menus enregistrés,
  absents de la semaine → courses. 3 semaines conservées.
- **Profil** : photo, foyer et code d'invitation, **Apparence Auto / Clair / Sombre** (propre au téléphone), aide.
- **Notifications** : push à la famille (ajouts à acheter, stock bas…) ; notification locale en fin de minuteur.
- **Aide intégrée** (`HelpScreen`) : à mettre à jour à chaque nouveauté, y compris « Quoi de neuf ? ».

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
- Nouveau concept visuel : maquette validée (Artifact) avant de coder.
- Vérifier avant de livrer : `npx tsc --noEmit` et `npx expo-doctor`. Mettre à jour l'aide intégrée et ce fichier.

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

## Historique des livraisons

Maquettes : canvas « TeninGrocery — Maquette UI arrondie » (Artifact claude.ai). Toutes les livraisons ci-dessous
sont **en production** (septembre 2026).

| Livraison | Contenu | Message EAS Update |
|---|---|---|
| Accueil, photos, menu planifié | Accueil, polaroïds, mots, infos, planning midi / soir, menus enregistrés | — |
| 1 | Du menu aux courses en un geste, ajout rapide dans Courses, bandeau « Annuler » | Livraison 1 : ajout rapide, Annuler, absents vers courses |
| 2 | Portions, étiquettes + recherche, étapes + mode cuisine, partage (message / PDF) | Livraison 2 : portions, étiquettes, étapes, mode cuisine, partage |
| 3 | Mode en magasin, ordre des rayons | Livraison 3 : mode en magasin et ordre des rayons |
| Mode sombre | Réglage Apparence Auto / Clair / Sombre, palette sombre | Mode sombre : réglage Apparence (Auto / Clair / Sombre) |

Détails de conception à retenir :

- **Portions** : `servings` = nombre de personnes pour lequel les quantités sont saisies (4 par défaut). Le sélecteur
  « Pour N personnes » n'est pas enregistré ; seul le premier nombre d'une quantité est recalculé
  (`utils/quantities.ts` : décimales et fractions), le texte libre reste tel quel.
- **Étiquettes** : `tags: string[]` libres, couleur dérivée du nom (`utils/tags.ts`), comparaison sans accents ni
  majuscules. Choix / création depuis la fiche recette.
- **Étapes** : `steps: { id, text, timerMin? }[]` (pas de `timerMin: undefined` dans Firestore), `prepMin`,
  `cookMin`, `restMin`. Mode cuisine : toujours sombre, ingrédients de l'étape repérés par leur nom dans le texte,
  minuteur = notification locale programmée + vibration.
- **Partage** : texte via `Share.share` (gras WhatsApp `*…*`), PDF via `Print.printToFileAsync` (HTML de
  `utils/recipeShare.ts`, photo en data URI) puis `Sharing.shareAsync`.
- **Mode magasin** : articles non cochés + ceux cochés pendant la visite (barrés) ; cocher = « À la casa » pour tout
  le foyer ; article avec seuil → quantité demandée. Ordre des rayons : champ `order` écrit en lot
  (`setGroupOrder`) ; rayons sans `order` à la fin, par nom.
- **Mode sombre** : réglage stocké dans AsyncStorage (`appearance`), lu avant le premier affichage ; palettes
  `LIGHT_COLORS` / `DARK_COLORS` (fond #141A14, surfaces #1F2A20, orange éclairci) ; polaroïds sur papier clair ;
  `app.json` → `userInterfaceStyle: automatic`.

## Prochaines idées

- Gestion globale des étiquettes (renommer, supprimer) depuis le Profil.
- Lien d'import pour qu'un autre foyer TeninGrocery ajoute une recette partagée en un geste.
- Nom de fichier du PDF = nom de la recette (nécessite `expo-file-system`).
- Rappels de cuisson (notifications locales), suggestions à partir de l'historique, partage de la liste en texte.
- Vraie app (build EAS + TestFlight) avec hors-ligne complet, Siri / widget iOS.
- Base Firebase de test, règles déployées par la Firebase CLI et vérifications automatiques.

## Limites connues

- Expo Go impose sa version du SDK : il faut migrer quand il se met à jour.
- Pas de notifications push sur Android dans Expo Go (SDK 53+).
- Recette et production partagent la même base Firebase.
- Règles Firestore publiées à la main (pas de Firebase CLI ni de CI).
- Minuteur du mode cuisine : l'alerte hors de l'app exige l'autorisation des notifications sur l'iPhone.
- Le PDF partagé porte un nom de fichier automatique.
- Piste : vraie app via build EAS + TestFlight (compte Apple Developer).
