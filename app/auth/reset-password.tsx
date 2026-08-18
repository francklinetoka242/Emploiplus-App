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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    const trimmedPassword = password.trim();

    if (!trimmedPassword || trimmedPassword.length < 8) {
      Alert.alert('Mot de passe invalide', 'Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (trimmedPassword !== confirmPassword.trim()) {
      Alert.alert('Confirmation incorrecte', 'Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: trimmedPassword });
      if (error) {
        throw error;
      }

      Alert.alert('Mot de passe mis à jour', 'Votre mot de passe a bien été modifié.', [
        {
          text: 'OK',
          onPress: () => router.replace('/auth/login' as any),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message ?? 'La mise à jour du mot de passe a échoué.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Nouveau mot de passe</Text>
        <Text style={styles.subtitle}>Choisissez un nouveau mot de passe pour sécuriser votre compte.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Nouveau mot de passe</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Minimum 8 caractères"
            style={styles.input}
          />

          <Text style={styles.label}>Confirmer le mot de passe</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Saisissez à nouveau"
            style={styles.input}
          />

          <TouchableOpacity style={[styles.primaryButton, loading && styles.disabledButton]} onPress={handleReset} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? 'Mise à jour...' : 'Enregistrer'}</Text>
          </TouchableOpacity>
        </View>
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
    gap: 10,
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
});
