# GeekCollection — application Android

Application React Native (Expo SDK 58, expo-router) qui affiche « Ma bibliothèque » du site
[Geek Collection](https://geekcollection.metalhorreur.fr/), via l'API v1 en lecture seule
(documentation : `../geekcollection/API.md`).

## Fonctionnalités

- **Connexion** avec l'e-mail et le mot de passe du site. Seul le jeton `gc_…` est gardé, dans le
  stockage sécurisé Android (Keystore, via `expo-secure-store`) ; le mot de passe n'est jamais
  enregistré. L'appareil apparaît dans « Mon compte › Applications connectées » sous le nom
  « GeekCollection – <nom du téléphone> ».
- **Bibliothèque** : toute la collection est chargée (pages de 100) puis gardée en **copie locale**
  (`library.json`) : lecture hors ligne et recherche instantanée, sans appel réseau.
  - recherche sans accents ni majuscules dans le titre, le titre original, les réalisateurs et
    l'édition (plusieurs mots possibles) ;
  - tri : ajout récent, titre A→Z, date de sortie (films sans date en fin de liste) ;
  - filtres : format (DVD, Blu-ray, 4K…, d'après ce que contient la collection), vus, pas vus, prêtés ;
  - tirer vers le bas pour synchroniser.
- **Fiche d'un exemplaire** : jaquette et affiche, titres, sortie, réalisateurs, pays (drapeaux),
  édition, format, boîtier, état, emplacement, prêt, date d'ajout, avis.
- **Mon compte** : statistiques, synchronisation, lien vers le site, déconnexion (révoque le jeton
  et efface la copie locale).
- Jeton révoqué (depuis le site, changement de mot de passe…) : retour automatique à l'écran de
  connexion.

## Structure

| Fichier | Rôle |
|---|---|
| `src/api/client.ts` | appels à l'API, types, erreurs (`ApiError`) |
| `src/storage/tokenStore.ts` | jeton et compte dans le stockage sécurisé |
| `src/storage/libraryCache.ts` | copie locale de la bibliothèque |
| `src/context/AuthContext.tsx` | démarrage, connexion, déconnexion |
| `src/context/LibraryContext.tsx` | chargement, synchronisation, copie locale |
| `src/app/_layout.tsx` | navigation ; écrans protégés selon la connexion |
| `src/app/login.tsx` | écran de connexion |
| `src/app/index.tsx` | liste, recherche, tri, filtres |
| `src/app/item/[id].tsx` | fiche d'un exemplaire |
| `src/app/account.tsx` | compte et déconnexion |
| `src/utils/format.ts` | recherche sans accents, dates, drapeaux |

## Compiler et installer sur le téléphone

Guide détaillé, avec l'analyse et les solutions aux erreurs courantes : `HOW_TO_BUILD.md`.

Prérequis : SDK Android et JDK 17 (voir `INSTALL_ANDROID_SDK.md`), téléphone en débogage USB
(`adb devices` doit l'afficher).

```bash
npm install --legacy-peer-deps

# Version de développement (rechargement à chaud, serveur Metro sur le PC)
npm run android

# Version autonome (APK qui fonctionne sans le PC)
npm run android:release
```

Ou compiler l'APK puis l'installer à la main :

```bash
cd android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

L'APK de « release » est signé avec la clé de débogage générée par Expo : suffisant pour
l'installer sur son propre téléphone, pas pour le Play Store.

Le dossier `android/` est généré (`npx expo prebuild`) et ignoré par git : la configuration se fait
dans `app.json`.

## Vérifications

```bash
npm run typecheck     # TypeScript
npx expo-doctor       # dépendances et configuration Expo
```
