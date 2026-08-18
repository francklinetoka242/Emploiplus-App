import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function ConfirmEmailScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    let active = true;

    const verify = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!active) {
          return;
        }

        if (error) {
          throw error;
        }

        if (session?.user?.email_confirmed_at) {
          setStatus('success');
          return;
        }

        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.email_confirmed_at) {
          setStatus('success');
          return;
        }

        setStatus('error');
      } catch (error: any) {
        if (active) {
          setStatus('error');
          console.warn('Email confirmation check failed:', error);
        }
      }
    };

    verify();

    return () => {
      active = false;
    };
  }, []);

  const continueToLogin = () => {
    router.replace('/auth/login' as any);
  };

  const handleTryAgain = async () => {
    try {
      const { error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }
      setStatus('loading');
      const { data: userData } = await supabase.auth.getUser();
      setStatus(userData?.user?.email_confirmed_at ? 'success' : 'error');
    } catch (error: any) {
      Alert.alert('Confirmation', error?.message ?? 'La confirmation n’a pas pu être vérifiée.');
      setStatus('error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirmation email</Text>

      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" color="#00009e" />
          <Text style={styles.text}>Vérification de votre adresse email…</Text>
        </>
      )}

      {status === 'success' && (
        <>
          <Text style={styles.success}>Votre email est confirmé.</Text>
          <Text style={styles.text}>Vous pouvez maintenant vous connecter à votre espace candidat.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={continueToLogin}>
            <Text style={styles.primaryButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </>
      )}

      {status === 'error' && (
        <>
          <Text style={styles.error}>La confirmation n’a pas encore été validée.</Text>
          <Text style={styles.text}>Retournez dans l’application et réessayez, ou ouvrez de nouveau le lien envoyé par email.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleTryAgain}>
            <Text style={styles.primaryButtonText}>Vérifier</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={continueToLogin}>
            <Text style={styles.secondaryButtonText}>Retour connexion</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 18,
  },
  success: {
    fontSize: 22,
    fontWeight: '700',
    color: '#15803d',
    marginBottom: 12,
    textAlign: 'center',
  },
  error: {
    fontSize: 22,
    fontWeight: '700',
    color: '#b91c1c',
    marginBottom: 12,
    textAlign: 'center',
  },
  text: {
    color: '#475569',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#00009e',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
});
