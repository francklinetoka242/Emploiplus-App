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
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      Alert.alert('Email requis', 'Veuillez renseigner votre adresse email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      Alert.alert('Email invalide', 'Veuillez saisir une adresse email valide.');
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = Linking.createURL('/auth/reset-password');
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Demande envoyée',
        'Vérifiez votre boîte mail et ouvrez le lien reçu pour définir un nouveau mot de passe.',
        [
          {
            text: 'OK',
            onPress: () => router.push('/auth/login' as any),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Erreur', error?.message ?? 'Une erreur est survenue pendant la demande.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Mot de passe oublié</Text>
        <Text style={styles.subtitle}>Saisissez votre adresse email pour recevoir un lien de réinitialisation.</Text>

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

          <TouchableOpacity style={[styles.primaryButton, loading && styles.disabledButton]} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? 'Envoi...' : 'Envoyer le lien'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/auth/login' as any)}>
          <Text style={styles.footerText}>Retour à la connexion</Text>
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
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
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
  footerText: {
    textAlign: 'center',
    color: '#374151',
    marginTop: 22,
  },
});
