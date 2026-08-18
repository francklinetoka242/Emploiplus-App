import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function AuthIndexScreen() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) {
          return;
        }

        if (session && session.user?.email_confirmed_at) {
          const { data: candidate, error } = await supabase
            .from('candidates')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (!isMounted) {
            return;
          }

          if (!error && candidate) {
            router.replace('/candidate/jobs' as any);
            return;
          }

          if (error && error.code !== 'PGRST116') {
            console.warn('Candidate lookup failed:', error.message);
          }
        }

        setIsCheckingSession(false);
      } catch (error) {
        if (isMounted) {
          setIsCheckingSession(false);
        }
        console.warn('Auth splash check failed:', error);
        Alert.alert('Erreur', 'Impossible de vérifier la session active.');
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isCheckingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00009e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/images/Logo.png')} style={styles.logo} resizeMode="contain" />

      <TouchableOpacity style={[styles.button, styles.primary]} onPress={() => router.push('/auth/signup' as any)}>
        <Text style={[styles.buttonText, styles.primaryText]}>Je m'inscris</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => router.push('/auth/login' as any)}>
        <Text style={[styles.buttonText, styles.secondaryText]}>Se connecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 170,
    height: 170,
    marginBottom: 32,
  },
  button: {
    width: '82%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  primary: {
    backgroundColor: '#00009e',
  },
  secondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#e8a900',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#e8a900',
  },
});
