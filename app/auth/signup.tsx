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

export default function SignupScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    const normalizedEmail = email.trim();

    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner votre prénom et votre nom.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      Alert.alert('Email invalide', 'Veuillez saisir une adresse email valide.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Mot de passe trop court', 'Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Confirmation incorrecte', 'Les mots de passe ne correspondent pas.');
      return;
    }

    if (!agreeTerms) {
      Alert.alert('Conditions', 'Vous devez accepter les conditions générales avant de continuer.');
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = Linking.createURL('/auth/confirm-email');

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      const userId = authData?.user?.id;
      if (!userId) {
        throw new Error('USER_NOT_CREATED');
      }

      const { error: candidateError } = await supabase.from('candidates').insert({
        user_id: userId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: normalizedEmail,
        status: 'active',
      });

      if (candidateError) {
        throw candidateError;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.signOut();
      }

      Alert.alert(
        'Inscription réussie',
        'Un email de confirmation vient de vous être envoyé. Veuillez le valider avant de vous connecter.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/auth/login' as any),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Inscription impossible', error?.message ?? 'Une erreur est survenue pendant l’inscription.');
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
        <Text style={styles.title}>Créer mon compte</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Prénom</Text>
          <TextInput value={firstName} onChangeText={setFirstName} placeholder="Prénom" style={styles.input} />

          <Text style={styles.label}>Nom</Text>
          <TextInput value={lastName} onChangeText={setLastName} placeholder="Nom" style={styles.input} />

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
            placeholder="Minimum 8 caractères"
            style={styles.input}
          />

          <Text style={styles.label}>Confirmer le mot de passe</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Confirmez votre mot de passe"
            style={styles.input}
          />

          <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreeTerms((prev) => !prev)} activeOpacity={0.8}>
            <View style={[styles.checkboxBox, agreeTerms && styles.checkboxBoxChecked]}>
              {agreeTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>J’accepte les conditions générales.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.primaryButton, loading && styles.disabledButton]} onPress={handleSignUp} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? 'Inscription...' : 'S’inscrire'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/auth/login' as any)}>
          <Text style={styles.footerText}>Déjà inscrit ? Se connecter</Text>
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#00009e',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxChecked: {
    backgroundColor: '#00009e',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  checkboxText: {
    marginLeft: 10,
    color: '#374151',
    flex: 1,
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
    marginTop: 20,
  },
});
