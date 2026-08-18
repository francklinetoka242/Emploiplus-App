import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

const TOKEN_KEY = 'emploiplus_access_token';
const REFRESH_TOKEN_KEY = 'emploiplus_refresh_token';
const USER_KEY = 'emploiplus_user';

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  [key: string]: any;
}

export interface Session {
  token: string;
  refreshToken?: string;
  user: SessionUser;
  expiresIn?: number;
}

export function useSessionManager() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [token, refreshToken, userStr] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);

        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            const nextSession = { token, user, refreshToken: refreshToken || undefined };
            setSession(nextSession);
          } catch (_parseError) {
            await clearSession();
          }
        }
      } catch (_error) {
        // Session errors are intentionally silent to keep the console focused on debug logs.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveSession = useCallback(
    async (token: string, user: SessionUser, refreshToken?: string, expiresIn?: number) => {
      if (!token || !user || !user.id) {
        return false;
      }

      try {
        await Promise.all([
          SecureStore.setItemAsync(TOKEN_KEY, token),
          SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
          refreshToken ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken) : Promise.resolve(),
        ]);

        const newSession = { token, user, refreshToken, expiresIn };
        setSession(newSession);

        if (expiresIn && expiresIn > 0) {
          const expirationTime = expiresIn * 1000;
          setTimeout(() => {
            clearSession();
          }, expirationTime);
        }

        return true;
      } catch (error) {
        console.error('[SessionManager] Erreur sauvegarde session:', error);
        return false;
      }
    },
    []
  );

  const clearSession = useCallback(async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      ]);
      setSession(null);
      return true;
    } catch (_error) {
      return false;
    }
  }, []);

  const getToken = useCallback(() => session?.token, [session]);
  const getUser = useCallback(() => session?.user, [session]);

  return {
    session,
    loading,
    saveSession,
    clearSession,
    getToken,
    getUser,
    isAuthenticated: !!session?.token,
  };
}
