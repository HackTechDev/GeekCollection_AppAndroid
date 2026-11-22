import * as SecureStore from 'expo-secure-store';

import type { Account } from '../api/client';

// Le jeton est rangé dans le Keystore Android via expo-secure-store. Le mot de passe n'est jamais stocké.
const TOKEN_KEY = 'geekcollection_api_token';
// Le compte est gardé à côté du jeton pour pouvoir démarrer hors ligne.
const ACCOUNT_KEY = 'geekcollection_account';

export const tokenStore = {
  read: () => SecureStore.getItemAsync(TOKEN_KEY),
  save: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),

  async readAccount(): Promise<Account | null> {
    try {
      const raw = await SecureStore.getItemAsync(ACCOUNT_KEY);
      return raw ? (JSON.parse(raw) as Account) : null;
    } catch {
      return null;
    }
  },
  saveAccount: (account: Account) => SecureStore.setItemAsync(ACCOUNT_KEY, JSON.stringify(account)),

  async clear() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(ACCOUNT_KEY);
  },
};
