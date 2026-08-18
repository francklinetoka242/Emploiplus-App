import * as Linking from 'expo-linking';
import { Slot, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

type AuthContextValue = {
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
  setSignedOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

async function hasValidCandidateProfile(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('candidates')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.warn('Candidate profile check failed.');
    return false;
  }

  return !!data;
}

export default function Layout() {
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
      } catch (e) {
        // ignore if already prevented or unavailable
      }
    })();
  }, []);

  useEffect(() => {
    const handleDeepLink = (url?: string | null) => {
      if (!url) {
        return;
      }

      try {
        const parsed = new URL(url);
        const path = parsed.pathname || '';

        if (path.includes('/auth/confirm-email') || path.includes('/auth/reset-password')) {
          const target = path.includes('/auth/confirm-email') ? '/auth/confirm-email' : '/auth/reset-password';
          router.replace(target as any);
        }
      } catch (_error) {
        const fallback = url.includes('confirm-email') ? '/auth/confirm-email' : url.includes('reset-password') ? '/auth/reset-password' : null;
        if (fallback) {
          router.replace(fallback as any);
        }
      }
    };

    Linking.getInitialURL()
      .then(handleDeepLink)
      .catch(() => undefined);

    const subscription = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));

    return () => {
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    const verifyAccess = async () => {
      try {
        if (!rootNavigationState?.key) {
          return;
        }

        const isProtectedCandidateRoute = segments[0] === 'candidate';

        if (!isProtectedCandidateRoute) {
          if (isMounted) {
            const {
              data: { session },
            } = await supabase.auth.getSession();

            if (session && session.user?.email_confirmed_at) {
              const hasProfile = await hasValidCandidateProfile(session.user.id);
              if (hasProfile) {
                router.replace('/candidate/jobs' as any);
              }
            }
          }
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session || !session.user?.email_confirmed_at) {
          if (isMounted) {
            setIsAuthenticated(false);
            router.replace('/auth' as any);
          }
          return;
        }

        const hasProfile = await hasValidCandidateProfile(session.user.id);

        if (!isMounted) {
          return;
        }

        if (!hasProfile) {
          await supabase.auth.signOut();
          setIsAuthenticated(false);
          router.replace('/auth' as any);
          return;
        }

        setIsAuthenticated(true);
      } catch (_error) {
        console.warn('Candidate access verification failed.');
        if (isMounted) {
          setIsAuthenticated(false);
        }
      }
    };

    verifyAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (!rootNavigationState?.key) {
          return;
        }

        if (!session || !session.user?.email_confirmed_at) {
          if (segments[0] === 'candidate') {
            router.replace('/auth' as any);
          }
          setIsAuthenticated(false);
          return;
        }

        const hasProfile = await hasValidCandidateProfile(session.user.id);

        if (!hasProfile) {
          await supabase.auth.signOut();
          if (segments[0] === 'candidate') {
            router.replace('/auth' as any);
          }
          setIsAuthenticated(false);
          return;
        }

        setIsAuthenticated(true);
        if (segments[0] !== 'candidate' && segments[0] !== 'auth') {
          router.replace('/candidate/jobs' as any);
        }
      } catch (_error) {
        console.warn('Auth state change failed.');
        if (segments[0] === 'candidate') {
          router.replace('/auth' as any);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, segments]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      setAuthenticated: (value: boolean) => setIsAuthenticated(value),
      setSignedOut: () => setIsAuthenticated(false),
    }),
    [isAuthenticated]
  );

  return (
    <AuthContext.Provider value={value}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'left', 'right']}>
            <Slot />
          </SafeAreaView>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AuthContext.Provider>
  );
}
