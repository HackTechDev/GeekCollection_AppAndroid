#!/usr/bin/env bash
#
# Installe l'environnement de développement Android de GeekCollection
# (JDK 17, SDK Android en ligne de commande, adb), sans Android Studio ni émulateur.
#
# Usage :
#   ./setup_android_env.sh           installe ce qui manque (demande sudo pour apt)
#   ./setup_android_env.sh --check   vérifie seulement, sans rien installer
#
# Le script peut être relancé sans risque : ce qui est déjà en place est laissé tel quel.
# Détails et explications : INSTALL_ANDROID_SDK.md et HOW_TO_BUILD.md.

set -euo pipefail

# --- Réglages ---------------------------------------------------------------

JAVA_HOME_17=/usr/lib/jvm/java-17-openjdk-amd64
SDK_DIR="${ANDROID_HOME:-$HOME/Android/Sdk}"
# Version des « command-line tools » : voir https://developer.android.com/studio#command-line-tools-only
CMDLINE_TOOLS_VERSION=15859902
CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RN_VERSIONS="$PROJECT_DIR/node_modules/react-native/gradle/libs.versions.toml"

# Versions demandées par React Native 0.88. Relues dans node_modules quand il existe,
# pour suivre automatiquement une mise à jour de React Native.
COMPILE_SDK=37
BUILD_TOOLS=37.0.0
NDK_VERSION=27.1.12297006

read_rn_version() { # $1 = clé dans libs.versions.toml
  sed -nE "s/^$1 *= *\"([^\"]+)\".*/\1/p" "$RN_VERSIONS" | head -n1
}
if [[ -f "$RN_VERSIONS" ]]; then
  COMPILE_SDK="$(read_rn_version compileSdk || true)"; COMPILE_SDK="${COMPILE_SDK:-37}"
  BUILD_TOOLS="$(read_rn_version buildTools || true)"; BUILD_TOOLS="${BUILD_TOOLS:-37.0.0}"
  NDK_VERSION="$(read_rn_version ndkVersion || true)"; NDK_VERSION="${NDK_VERSION:-27.1.12297006}"
fi

# sdkmanager nomme la plateforme 37 « android-37.0 », les précédentes « android-36 ».
if (( ${COMPILE_SDK%%.*} >= 37 )) && [[ "$COMPILE_SDK" != *.* ]]; then
  PLATFORM="platforms;android-${COMPILE_SDK}.0"
else
  PLATFORM="platforms;android-${COMPILE_SDK}"
fi
SDK_PACKAGES=("platform-tools" "$PLATFORM" "build-tools;${BUILD_TOOLS}" "ndk;${NDK_VERSION}")

CHECK_ONLY=false
[[ "${1:-}" == "--check" ]] && CHECK_ONLY=true

# --- Affichage --------------------------------------------------------------

if [[ -t 1 ]]; then
  GREEN=$'\e[32m'; RED=$'\e[31m'; YELLOW=$'\e[33m'; BOLD=$'\e[1m'; RESET=$'\e[0m'
else
  GREEN=''; RED=''; YELLOW=''; BOLD=''; RESET=''
fi
step() { echo; echo "${BOLD}== $* ==${RESET}"; }
ok()   { echo "  ${GREEN}✔${RESET} $*"; }
warn() { echo "  ${YELLOW}!${RESET} $*"; }
fail() { echo "  ${RED}✘${RESET} $*"; }
die()  { fail "$*"; exit 1; }

PROBLEMS=0
problem() { fail "$*"; PROBLEMS=$((PROBLEMS + 1)); }

# --- 1. Paquets système -------------------------------------------------------

step "1. JDK 17 et outils système"

APT_PACKAGES=(openjdk-17-jdk unzip wget android-sdk-platform-tools-common)
missing=()
for pkg in "${APT_PACKAGES[@]}"; do
  if dpkg -s "$pkg" >/dev/null 2>&1; then ok "$pkg"; else missing+=("$pkg"); fi
done

if (( ${#missing[@]} > 0 )); then
  if $CHECK_ONLY; then
    problem "paquets manquants : ${missing[*]}"
  else
    warn "installation de : ${missing[*]} (sudo demandé)"
    sudo apt-get update
    sudo apt-get install -y "${missing[@]}"
    ok "paquets installés"
  fi
fi

if [[ -x "$JAVA_HOME_17/bin/java" ]]; then
  ok "JDK 17 : $JAVA_HOME_17"
else
  problem "JDK 17 introuvable dans $JAVA_HOME_17"
fi

if command -v node >/dev/null 2>&1; then
  ok "Node.js $(node --version)"
else
  problem "Node.js absent : l'installer (version 20 ou plus) avant de compiler l'application"
fi

# --- 2. Command-line tools ---------------------------------------------------

step "2. Command-line tools du SDK Android"

SDKMANAGER="$SDK_DIR/cmdline-tools/latest/bin/sdkmanager"
if [[ -x "$SDKMANAGER" ]]; then
  ok "déjà présents dans $SDK_DIR/cmdline-tools/latest"
elif $CHECK_ONLY; then
  problem "sdkmanager absent ($SDKMANAGER)"
else
  warn "téléchargement de $CMDLINE_TOOLS_URL"
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  wget -q --show-progress -O "$tmp/tools.zip" "$CMDLINE_TOOLS_URL" \
    || die "téléchargement impossible : vérifier CMDLINE_TOOLS_VERSION sur developer.android.com"
  unzip -q "$tmp/tools.zip" -d "$tmp"
  mkdir -p "$SDK_DIR/cmdline-tools"
  rm -rf "$SDK_DIR/cmdline-tools/latest"
  # Le dossier doit s'appeler exactement « latest », sinon sdkmanager ne trouve pas le SDK.
  mv "$tmp/cmdline-tools" "$SDK_DIR/cmdline-tools/latest"
  ok "installés dans $SDK_DIR/cmdline-tools/latest"
fi

# --- 3. Variables d'environnement --------------------------------------------

step "3. Variables d'environnement"

case "${SHELL##*/}" in
  zsh) RC_FILE="$HOME/.zshrc" ;;
  *)   RC_FILE="$HOME/.bashrc" ;;
esac

if grep -q 'ANDROID_HOME=' "$RC_FILE" 2>/dev/null; then
  ok "déjà définies dans $RC_FILE"
elif $CHECK_ONLY; then
  problem "ANDROID_HOME n'est pas défini dans $RC_FILE"
else
  cat >> "$RC_FILE" <<EOF

# Android / React Native (ajouté par setup_android_env.sh)
export JAVA_HOME=$JAVA_HOME_17
export ANDROID_HOME=\$HOME/Android/Sdk
export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools
EOF
  ok "ajoutées à $RC_FILE"
fi

# Pour la suite de ce script, quel que soit l'état du terminal.
export JAVA_HOME="$JAVA_HOME_17"
export ANDROID_HOME="$SDK_DIR"
export PATH="$JAVA_HOME/bin:$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"

# --- 4. Paquets du SDK ---------------------------------------------------------

step "4. Paquets du SDK (React Native : compileSdk $COMPILE_SDK, build-tools $BUILD_TOOLS, NDK $NDK_VERSION)"

sdk_package_dir() { # « build-tools;37.0.0 » → $SDK_DIR/build-tools/37.0.0
  echo "$SDK_DIR/${1//;//}"
}

to_install=()
for pkg in "${SDK_PACKAGES[@]}"; do
  # source.properties est écrit en dernier par sdkmanager : son absence trahit un téléchargement interrompu.
  if [[ -f "$(sdk_package_dir "$pkg")/source.properties" ]]; then ok "$pkg"; else to_install+=("$pkg"); fi
done

if (( ${#to_install[@]} > 0 )); then
  if $CHECK_ONLY; then
    problem "paquets du SDK manquants : ${to_install[*]}"
  elif [[ ! -x "$SDKMANAGER" ]]; then
    problem "sdkmanager absent : impossible d'installer ${to_install[*]}"
  else
    warn "acceptation des licences du SDK"
    yes | "$SDKMANAGER" --sdk_root="$SDK_DIR" --licenses >/dev/null || true
    warn "installation de : ${to_install[*]} (plusieurs Go pour le NDK)"
    "$SDKMANAGER" --sdk_root="$SDK_DIR" "${to_install[@]}"
    ok "paquets du SDK installés"
  fi
fi

# --- 5. Téléphone --------------------------------------------------------------

step "5. Téléphone Android"

ADB="$SDK_DIR/platform-tools/adb"
if [[ ! -x "$ADB" ]]; then
  problem "adb absent ($ADB)"
else
  devices="$("$ADB" devices | tail -n +2 | sed '/^\s*$/d' || true)"
  if [[ -z "$devices" ]]; then
    warn "aucun téléphone détecté : activer le débogage USB et brancher le téléphone (voir INSTALL_ANDROID_SDK.md)"
  else
    while read -r serial state; do
      case "$state" in
        device)       ok "$serial prêt" ;;
        unauthorized) warn "$serial : déverrouiller le téléphone et accepter la demande de débogage" ;;
        *)            warn "$serial : état « $state » (voir INSTALL_ANDROID_SDK.md)" ;;
      esac
    done <<< "$devices"
  fi
fi

# --- 6. Dépendances du projet --------------------------------------------------

step "6. Dépendances JavaScript du projet"

if [[ -d "$PROJECT_DIR/node_modules" ]]; then
  ok "node_modules présent"
elif $CHECK_ONLY; then
  problem "node_modules absent : lancer « npm install --legacy-peer-deps »"
elif command -v npm >/dev/null 2>&1; then
  # --legacy-peer-deps : conflit sans effet sur Android entre react et react-dom (voir HOW_TO_BUILD.md).
  (cd "$PROJECT_DIR" && npm install --legacy-peer-deps)
  ok "dépendances installées"
fi

# --- Bilan -----------------------------------------------------------------------

step "Bilan"

df_free="$(df -h "$HOME" | awk 'NR==2 {print $4}')"
echo "  Espace libre dans $HOME : $df_free (la première compilation prend plusieurs Go)"

if (( PROBLEMS > 0 )); then
  fail "$PROBLEMS problème(s) à corriger$($CHECK_ONLY && echo ' : relancer sans --check pour les installer')"
  exit 1
fi

ok "environnement prêt"
echo
echo "  Ouvrir un nouveau terminal (ou « source $RC_FILE »), puis compiler :"
echo "    cd $PROJECT_DIR"
echo "    npx expo prebuild --platform android --clean"
echo "    cd android && ./gradlew assembleRelease"
echo "    adb install -r app/build/outputs/apk/release/app-release.apk"
