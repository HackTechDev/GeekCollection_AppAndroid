import { type ComponentRef, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, radius } from '../theme';

export default function LoginScreen() {
  const { signIn, notice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const canSubmit = email.trim() !== '' && password !== '' && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'too_many_requests' && e.retryAfter) {
        const minutes = Math.ceil(e.retryAfter / 60);
        setError(`Trop de tentatives. Réessaie dans ${minutes} minute${minutes > 1 ? 's' : ''}.`);
      } else {
        setError(e instanceof Error ? e.message : 'Connexion impossible.');
      }
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>🎬</Text>
          <Text style={styles.title}>GeekCollection</Text>
          <Text style={styles.subtitle}>Ta bibliothèque de films, dans ta poche</Text>

          <View style={styles.card}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="moi@example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!submitting}
            />

            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              ref={passwordRef}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              editable={!submitting}
            />

            {error ? (
              <Text style={styles.error}>{error}</Text>
            ) : (
              notice && <Text style={styles.notice}>{notice}</Text>
            )}

            <Pressable
              onPress={submit}
              disabled={!canSubmit}
              style={({ pressed }) => [styles.button, !canSubmit && styles.buttonDisabled, pressed && styles.buttonPressed]}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Se connecter</Text>}
            </Pressable>
          </View>

          <Text style={styles.footer}>
            Utilise le compte du site{' '}
            <Text style={styles.link} onPress={() => Linking.openURL('https://geekcollection.metalhorreur.fr/')}>
              geekcollection.metalhorreur.fr
            </Text>
            . Le mot de passe n'est pas enregistré sur le téléphone.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 56, textAlign: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: '#fff', textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 15, color: colors.primarySoft, textAlign: 'center', marginTop: 4, marginBottom: 28 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    backgroundColor: '#f9fafb',
  },
  error: {
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    padding: 10,
    borderRadius: radius.sm,
    marginBottom: 16,
    fontSize: 14,
  },
  notice: {
    color: '#92400e',
    backgroundColor: colors.loanedSoft,
    padding: 10,
    borderRadius: radius.sm,
    marginBottom: 16,
    fontSize: 14,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { backgroundColor: colors.primaryDark },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { color: colors.primarySoft, fontSize: 13, textAlign: 'center', marginTop: 20, lineHeight: 19 },
  link: { color: '#fff', textDecorationLine: 'underline' },
});
