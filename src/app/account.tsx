import Constants from 'expo-constants';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { colors, radius } from '../theme';
import { formatDateTime } from '../utils/format';

export default function AccountScreen() {
  const { account, signOut } = useAuth();
  const { items, syncedAt, refreshing, refresh } = useLibrary();

  const seen = items.filter((i) => i.seen).length;
  const loaned = items.filter((i) => i.loaned).length;

  function confirmSignOut() {
    Alert.alert('Se déconnecter ?', 'Le jeton de ce téléphone sera révoqué et la copie locale effacée.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{account?.public_name ?? 'Mon compte'}</Text>
        <Text style={styles.muted}>{account?.email}</Text>
      </View>

      <View style={[styles.card, styles.stats]}>
        <Stat value={items.length} label="exemplaires" />
        <Stat value={seen} label="vus" />
        <Stat value={loaned} label="prêtés" />
      </View>

      <View style={styles.card}>
        <Text style={styles.muted}>
          {syncedAt ? `Dernière synchronisation : ${formatDateTime(syncedAt)}` : 'Jamais synchronisée'}
        </Text>
        <Pressable style={styles.button} onPress={refresh} disabled={refreshing}>
          <Text style={styles.buttonText}>{refreshing ? 'Synchronisation…' : 'Synchroniser maintenant'}</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={() => Linking.openURL('https://geekcollection.metalhorreur.fr/')}
        >
          <Text style={[styles.buttonText, styles.secondaryText]}>Ouvrir le site pour modifier la collection</Text>
        </Pressable>
      </View>

      <Pressable style={[styles.button, styles.danger]} onPress={confirmSignOut}>
        <Text style={styles.buttonText}>Se déconnecter</Text>
      </Pressable>

      <Text style={styles.version}>GeekCollection {Constants.expoConfig?.version}</Text>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, gap: 10 },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.primary },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondary: { backgroundColor: colors.primarySoft },
  secondaryText: { color: colors.primaryDark },
  danger: { backgroundColor: colors.danger },
  version: { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 8 },
});
