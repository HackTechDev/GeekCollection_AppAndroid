import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { ApiError, fetchWholeLibrary, type LibraryItem } from '../api/client';
import { readLibraryCache, writeLibraryCache } from '../storage/libraryCache';
import { useAuth } from './AuthContext';

type LibraryContextValue = {
  items: LibraryItem[];
  /** Date de la dernière synchronisation réussie (ISO). */
  syncedAt: string | null;
  /** Premier chargement, sans copie locale à afficher. */
  loading: boolean;
  refreshing: boolean;
  /** Message de la dernière synchronisation ratée, ou null. */
  error: string | null;
  refresh: () => Promise<void>;
  getItem: (id: number) => LibraryItem | undefined;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { status, token, account, expireSession } = useAuth();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRefreshing(true);
    try {
      const all = await fetchWholeLibrary(token, controller.signal);
      const now = new Date().toISOString();
      setItems(all);
      setSyncedAt(now);
      setError(null);
      if (account) await writeLibraryCache({ email: account.email, syncedAt: now, items: all });
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      if (e instanceof ApiError && e.isAuthError) {
        await expireSession(e.message);
        return;
      }
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      if (abortRef.current === controller) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  }, [token, account, expireSession]);

  // Connexion : afficher la copie locale tout de suite, puis synchroniser.
  useEffect(() => {
    if (status !== 'signedIn') {
      abortRef.current?.abort();
      setItems([]);
      setSyncedAt(null);
      setError(null);
      setLoading(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const cached = await readLibraryCache(account);
      if (cancelled) return;
      if (cached) {
        setItems(cached.items);
        setSyncedAt(cached.syncedAt);
        setLoading(false);
      }
      refresh();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, token]);

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const getItem = useCallback((id: number) => byId.get(id), [byId]);

  const value = useMemo(
    () => ({ items, syncedAt, loading, refreshing, error, refresh, getItem }),
    [items, syncedAt, loading, refreshing, error, refresh, getItem],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary doit être utilisé dans <LibraryProvider>');
  return ctx;
}
