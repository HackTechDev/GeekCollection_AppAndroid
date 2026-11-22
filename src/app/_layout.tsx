import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { LibraryProvider } from '../context/LibraryContext';
import { colors } from '../theme';

function RootNavigator() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const signedIn = status === 'signedIn';
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" options={{ title: 'Ma bibliothèque' }} />
        <Stack.Screen name="item/[id]" options={{ title: '' }} />
        <Stack.Screen name="account" options={{ title: 'Mon compte' }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LibraryProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </LibraryProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
});
