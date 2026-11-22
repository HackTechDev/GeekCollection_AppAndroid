# Compiler et installer GeekCollection sur Android

Ce guide compile l'application à la main sur le poste et l'installe sur un smartphone Android branché
en USB. Il ne demande ni compte Expo ni service cloud (EAS).

Le SDK Android et le JDK 17 doivent être déjà installés : voir `INSTALL_ANDROID_SDK.md`.

## Analyse

### État du projet

| Élément | Valeur |
|---|---|
| Framework | Expo SDK 58, React Native 0.88, expo-router 58 |
| Nom de l'application | GeekCollection |
| Identifiant Android | `fr.metalhorreur.geekcollection` |
| Point d'entrée | `expo-router/entry`, écrans dans `src/app/` |
| Configuration native | `app.json` (nom, identifiant, icônes, plugins) |
| Dossier `android/` | **généré** par `npx expo prebuild`, ignoré par git |

Contrôles déjà passés :

- `npx tsc --noEmit` : aucune erreur TypeScript ;
- `npx expo-doctor` : 20 contrôles sur 20 réussis ;
- `npx expo export --platform android` : le bundle JavaScript Android se construit (2,6 Mo).

La compilation native complète (Gradle) n'a pas encore été menée jusqu'au bout sur ce poste : la
première est longue et se fait à la main avec ce guide.

### Points d'attention

- **Conflit `react` / `react-dom`** : une dépendance d'expo-router réclame `react-dom@19.3.1` alors
  que le projet utilise `react@19.3.0`. `npm install` échoue avec `ERESOLVE` : il faut ajouter
  `--legacy-peer-deps`. Le conflit est sans effet sur Android, qui n'utilise pas `react-dom`.
- **Dossier `android/` généré** : il ne se modifie jamais à la main. Après un changement de
  `app.json`, des icônes ou d'un module natif, on le régénère avec `npx expo prebuild --clean`.
- **JDK** : le poste a deux JDK, le 17 et le 25. Gradle et React Native demandent le **17**. C'est
  `JAVA_HOME` qui fixe la version utilisée.
- **Signature** : l'APK de « release » est signé avec la clé de débogage que génère Expo. Il
  s'installe sans problème sur son propre téléphone, mais il ne peut pas aller sur le Play Store.
- **Première compilation** : elle dure 10 à 20 minutes, le temps de télécharger Gradle, le NDK, CMake
  et les dépendances Maven. Les licences du SDK étant acceptées, Gradle installe lui-même les versions
  du NDK et de CMake que demande React Native. Il faut compter plusieurs Go dans `~/.gradle` et
  `~/Android/Sdk`.

### Deux façons de compiler

| | APK autonome (`assembleRelease`) | Version de développement (`expo run:android`) |
|---|---|---|
| Usage | utiliser l'application au quotidien | modifier le code et voir le résultat tout de suite |
| PC nécessaire ensuite | non | oui : le serveur Metro doit tourner |
| JavaScript | intégré dans l'APK | chargé depuis le PC, rechargement à chaud |
| Commande | `./gradlew assembleRelease` puis `adb install` | `npx expo run:android` |

## 1. Préparer l'environnement

Les variables sont dans `~/.zshrc` ; cette étape ne sert que si le terminal était ouvert avant leur
ajout.

```bash
source ~/.zshrc
java -version        # doit afficher 17
adb devices          # le téléphone doit apparaître avec « device »
```

## 2. Installer les dépendances

Seulement si `node_modules/` manque, par exemple après un `git clone` :

```bash
cd /home/util01/GEEKCOLLECTION/geekcollection_app
npm install --legacy-peer-deps
```

## 3. Générer le projet Android natif

```bash
npx expo prebuild --platform android --clean
```

## 4. Compiler l'APK autonome

```bash
cd android
./gradlew assembleRelease
```

L'APK est créé ici : `android/app/build/outputs/apk/release/app-release.apk`.

## 5. Installer sur le téléphone

```bash
adb install -r app/build/outputs/apk/release/app-release.apk
```

L'icône **GeekCollection** apparaît dans les applications du téléphone.

## Autre possibilité : version de développement

Cette commande compile, installe et lance l'application en une fois. Les modifications du code
s'affichent aussitôt sur le téléphone :

```bash
cd /home/util01/GEEKCOLLECTION/geekcollection_app
npx expo run:android
```

## En cas de problème

| Message | Solution |
|---|---|
| `ERESOLVE could not resolve` pendant `npm install` | ajouter `--legacy-peer-deps` |
| `SDK location not found` | `echo "sdk.dir=$HOME/Android/Sdk" > android/local.properties` |
| Erreur Java ou Gradle de version | vérifier que `echo $JAVA_HOME` donne `/usr/lib/jvm/java-17-openjdk-amd64` |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | désinstaller l'ancienne version : `adb uninstall fr.metalhorreur.geekcollection` |
| Téléphone absent de `adb devices` | voir le tableau de l'étape 5 de `INSTALL_ANDROID_SDK.md` |
| Plus de place sur le disque | `cd android && ./gradlew clean` efface la compilation précédente |
