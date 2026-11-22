# Installer le SDK Android en local (sans Android Studio)

Ce guide prépare le poste pour compiler l'application mobile Geek Collection (React Native / Expo)
et l'installer directement sur un smartphone Android branché en USB, sans compte Expo ni service
cloud.

## Analyse de l'existant

État du poste au 22/11/2026 :

| Élément | État | Conséquence |
|---|---|---|
| Node.js | v22.22.1, npm 10.9.2 | suffisant pour React Native / Expo |
| Java | OpenJDK 25 | **trop récent** : React Native et Gradle demandent le **JDK 17** |
| SDK Android | absent (`ANDROID_HOME` vide) | à installer |
| `adb` | absent | fourni par les `platform-tools` du SDK |
| Disque `/home` | 16 Go libres (93 % utilisé) | suffisant, mais **juste** : SDK, NDK et cache Gradle prennent 6 à 8 Go |
| API Geek Collection | `https://geekcollection.metalhorreur.fr/api/v1` répond (`401` sans jeton) | joignable, prête pour l'application |

Choix retenus :

- **Pas d'Android Studio** : les « command-line tools » suffisent et prennent beaucoup moins de place.
- **Pas d'émulateur** : le téléphone sert d'appareil de test par USB, ce qui économise plusieurs Go.
- **Compilation locale** avec `npx expo run:android` : elle génère un vrai APK et l'installe sur le
  téléphone, sans passer par EAS (le service de compilation cloud d'Expo).

## 1. Installer JDK 17 et les outils de base

```bash
sudo apt update
sudo apt install openjdk-17-jdk unzip wget android-sdk-platform-tools-common
```

`android-sdk-platform-tools-common` ajoute les règles udev, qui permettent à `adb` de voir le
téléphone sans `sudo`.

Le JDK 25 reste installé : `JAVA_HOME` (étape 3) désigne le 17 pour la compilation Android.

## 2. Télécharger les « command-line tools »

Récupérer le lien du zip Linux sur https://developer.android.com/studio#command-line-tools-only (section
« Command line tools only »). Le numéro de version change : remplacer `XXXXXXXX` par celui de la
page.

```bash
mkdir -p ~/Android/Sdk/cmdline-tools
cd ~/Android/Sdk/cmdline-tools
wget https://dl.google.com/android/repository/commandlinetools-linux-15859902_latest.zip
unzip commandlinetools-linux-*_latest.zip
mv cmdline-tools latest
rm commandlinetools-linux-*_latest.zip
```

Le dossier doit s'appeler exactement `~/Android/Sdk/cmdline-tools/latest/`, sinon `sdkmanager`
ne fonctionne pas.

## 3. Variables d'environnement (dans `~/.zshrc`)

```bash
cat >> ~/.zshrc <<'EOF'

# Android / React Native
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
EOF
source ~/.zshrc
```

Vérification : `java -version` doit afficher 17, et `sdkmanager --version` doit répondre.

## 4. Installer les paquets du SDK

```bash
sdkmanager --licenses                # tout accepter (y)
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

Le NDK et CMake ne sont pas à installer à la main. Comme les licences sont acceptées, Gradle
télécharge les versions exactes que demande React Native lors de la première compilation.

## 5. Préparer le téléphone Android

1. **Paramètres › À propos du téléphone** : appuyer 7 fois sur « Numéro de build » pour activer le
   mode développeur.
2. **Paramètres › Options pour les développeurs** : activer « **Débogage USB** ».
3. Brancher le téléphone en USB et accepter l'empreinte RSA qui s'affiche sur l'écran.
4. Vérifier la connexion :

   ```bash
   adb devices
   # doit afficher : <numéro>   device
   ```

| Affichage | Solution |
|---|---|
| `unauthorized` | déverrouiller le téléphone et accepter la demande de débogage |
| `no permissions` | débrancher, lancer `sudo udevadm control --reload-rules`, rebrancher |
| liste vide | vérifier que le câble transmet les données (pas seulement la charge) et que le mode USB est « Transfert de fichiers » |

## 6. Vérification finale

```bash
echo $ANDROID_HOME && adb --version && java -version && adb devices
```

## Étape suivante

Une fois le SDK prêt, l'application se crée et se lance sur le téléphone avec :

```bash
cd /home/util01/GEEKCOLLECTION/geekcollection_app
npx expo run:android
```

La première compilation est longue (téléchargement de Gradle, du NDK et des dépendances). Les
suivantes sont beaucoup plus rapides.
