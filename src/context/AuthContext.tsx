import Constants from 'expo-constants';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { type Account, ApiError, fetchMe, login, logout } from '../api/client';
import { clearLibraryCache } from '../storage/libraryCache';
import { tokenStore } from '../storage/tokenStore';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: AuthStatus;
  token: string | null;
  account: Account | null;
  /** Message à afficher sur l'écran de connexion (session expirée), ou null. */
  notice: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** À appeler quand l'API répond `invalid_token` : retour à l'écran de connexion. */
  expireSession: (message?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function deviceName(): string {
  const name = Constants.deviceName;
  return name ? `GeekCollection – ${name}` : 'GeekCollection Android';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reset = useCallback(async () => {
    await tokenStore.clear();
    clearLibraryCache();
    setToken(null);
    setAccount(null);
    setStatus('signedOut');
  }, []);

  // Au lancement : jeton enregistré ? puis GET /me pour vérifier qu'il est toujours valable.
  useEffect(() => {
    (async () => {
      const saved = await tokenStore.read();
      if (!saved) {
        setStatus('signedOut');
        return;
      }
      const savedAccount = await tokenStore.readAccount();
      try {
        const { user } = await fetchMe(saved);
        await tokenStore.saveAccount(user);
        setAccount(user);
        setToken(saved);
        setStatus('signedIn');
      } catch (e) {
        if (e instanceof ApiError && e.isAuthError) {
          await reset();
          setNotice(e.message);
        } else {
          // Hors ligne ou serveur indisponible : on garde la session et la copie locale.
          setAccount(savedAccount);
          setToken(saved);
          setStatus('signedIn');
        }
      }
    })();
  }, [reset]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await login(email.trim(), password, deviceName());
    await tokenStore.save(result.token);
    await tokenStore.saveAccount(result.user);
    setNotice(null);
    setToken(result.token);
    setAccount(result.user);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    if (token) {
      try {
        await logout(token);
      } catch {
        // Même hors ligne, on oublie le jeton localement ; il reste révocable depuis le site.
      }
    }
    await reset();
  }, [token, reset]);

  const expireSession = useCallback(
    async (message?: string) => {
      await reset();
      setNotice(message ?? 'Ta session a expiré : reconnecte-toi.');
    },
    [reset],
  );

  const value = useMemo(
    () => ({ status, token, account, notice, signIn, signOut, expireSession }),
    [status, token, account, notice, signIn, signOut, expireSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
