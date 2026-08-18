import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      Alert.alert('Champs requis', 'Veuillez renseigner votre email et votre mot de passe.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      Alert.alert('Email invalide', 'Veuillez saisir une adresse email valide.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        throw error;
      }

      const emailConfirmedAt = data.user?.email_confirmed_at;

      if (!emailConfirmedAt) {
        await supabase.auth.signOut();
        throw new Error('EMAIL_NOT_CONFIRMED');
      }

      const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .select('id')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (!candidate || candidateError) {
        await supabase.auth.signOut();
        if (candidateError && candidateError.code !== 'PGRST116') {
          throw candidateError;
        }
        Alert.alert('Accès refusé', 'Aucun profil candidat n’est associé à ce compte.');
        return;
      }

      router.replace('/candidate/jobs' as any);
    } catch (error: any) {
      const message = error?.message ?? '';

      if (message === 'EMAIL_NOT_CONFIRMED' || message.toUpperCase().includes('EMAIL_NOT_CONFIRMED')) {
        Alert.alert('Email non confirmé', 'Veuillez confirmer votre adresse email avant de vous connecter.');
        return;
      }

      Alert.alert('Connexion impossible', error?.message ?? 'Une erreur est survenue pendant la connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Connexion</Text>
        <Text style={styles.subtitle}>Accédez à votre espace candidat.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="prenom.nom@email.com"
            style={styles.input}
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Votre mot de passe"
            style={styles.input}
          />

          <TouchableOpacity style={[styles.primaryButton, loading && styles.disabledButton]} onPress={handleLogin} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? 'Connexion...' : 'Se connecter'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/auth/forgot-password' as any)}>
          <Text style={styles.linkText}>Mot de passe oublié ?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/auth/signup' as any)}>
          <Text style={styles.footerText}>Pas encore inscrit ? Créer un compte</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 24,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    fontSize: 16,
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#00009e',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 12,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  linkText: {
    textAlign: 'center',
    color: '#00009e',
    fontWeight: '600',
    marginTop: 22,
  },
  footerText: {
    textAlign: 'center',
    color: '#374151',
    marginTop: 18,
  },
});
