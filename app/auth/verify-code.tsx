import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function VerifyCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params?.email as string;
  const userId = params?.userId as string;
  const tokenFromDeepLink = params?.token as string;

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [autoVerified, setAutoVerified] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Auto-verify if deep link has token
  useEffect(() => {
    if (tokenFromDeepLink && !autoVerified && !loading) {
      console.log('🔗 Deep link detected, attempting auto-verification...');
      verifyWithToken(tokenFromDeepLink);
      setAutoVerified(true);
    }
  }, [tokenFromDeepLink, autoVerified]);

  useEffect(() => {
    if (!email) {
      Alert.alert('Erreur', 'Email manquant', [
        { text: 'OK', onPress: () => router.replace('/auth/signup' as any) },
      ]);
      return;
    }

    // Timer for code expiration
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [email, router]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCodeChange = (index: number, value: string) => {
    const sanitizedValue = value.replace(/\D/g, '');

    if (sanitizedValue.length > 1) {
      const pastedCode = sanitizedValue.slice(0, 6);
      setCode(pastedCode);

      const nextIndex = Math.min(pastedCode.length, 5);
      setTimeout(() => {
        inputRefs.current[nextIndex]?.focus();
      }, 0);
      return;
    }

    const newCode = code.split('');
    newCode[index] = sanitizedValue.charAt(0) || '';
    const nextCode = newCode.join('');
    setCode(nextCode);

    // Auto-focus next input
    if (sanitizedValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace') {
      const newCode = code.split('');
      newCode[index] = '';
      setCode(newCode.join(''));

      // Auto-focus previous input
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // Verify with token (from deep link)
  const verifyWithToken = async (token: string) => {
    setLoading(true);

    try {
      console.log('🔐 Verifying with token...');

      const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://www.emploiplus-group.com';

      const confirmResponse = await fetch(`${apiBaseUrl}/api/mobile?action=confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          userId,
        }),
      });

      console.log('Confirm response status:', confirmResponse.status);

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json().catch(() => ({}));
        console.error('Confirmation error:', errorData);
        Alert.alert('Erreur', errorData.message || 'Token invalide ou expiré');
        return;
      }

      const confirmData = await confirmResponse.json();
      console.log('✅ Email verified successfully!');

      Alert.alert('Succès', 'Votre email a été confirmé avec succès!', [
        {
          text: 'OK',
          onPress: () => {
            router.replace('/auth/login' as any);
          },
        },
      ]);
    } catch (error: any) {
      console.error('Token verification error:', error);
      Alert.alert('Erreur', error?.message ?? 'Une erreur est survenue lors de la vérification.');
    } finally {
      setLoading(false);
    }
  };

  // Verify with code (manual entry)
  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      Alert.alert('Code incomplet', 'Veuillez entrer les 6 chiffres du code.');
      return;
    }

    setLoading(true);

    try {
      console.log('🔑 Verifying with code...');

      const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://www.emploiplus-group.com';

      const confirmResponse = await fetch(`${apiBaseUrl}/api/mobile?action=confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          email,
          userId,
        }),
      });

      console.log('Confirm response status:', confirmResponse.status);

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json().catch(() => ({}));
        console.error('Confirmation error:', errorData);
        
        if (errorData.attemptsRemaining !== undefined) {
          setAttemptsLeft(errorData.attemptsRemaining);
          Alert.alert(
            'Code incorrect',
            `Code invalide. ${errorData.attemptsRemaining} tentative${
              errorData.attemptsRemaining > 1 ? 's' : ''
            } restante${errorData.attemptsRemaining > 1 ? 's' : ''}.`,
          );
        } else {
          Alert.alert('Erreur', errorData.message || 'Code invalide ou expiré');
        }
        setCode('');
        return;
      }

      const confirmData = await confirmResponse.json();
      console.log('✅ Email verified successfully!');

      Alert.alert('Succès', 'Votre email a été confirmé avec succès!', [
        {
          text: 'OK',
          onPress: () => {
            router.replace('/auth/login' as any);
          },
        },
      ]);
    } catch (error: any) {
      console.error('Code verification error:', error);
      Alert.alert('Erreur', error?.message ?? 'Une erreur est survenue lors de la vérification.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);

    try {
      console.log('📧 Requesting new code...');

      const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://www.emploiplus-group.com';

      const resendResponse = await fetch(`${apiBaseUrl}/api/mobile?action=resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          userId,
        }),
      });

      console.log('Resend response status:', resendResponse.status);

      if (!resendResponse.ok) {
        const errorData = await resendResponse.json().catch(() => ({}));
        console.error('Resend error:', errorData);
        
        if (resendResponse.status === 429) {
          Alert.alert(
            'Trop de demandes',
            `Veuillez attendre ${errorData.retryAfter} secondes avant de demander un nouveau code.`,
          );
        } else {
          Alert.alert('Erreur', errorData.message || 'Impossible de renvoyer le code');
        }
        return;
      }

      setCode('');
      setTimeLeft(1200);
      Alert.alert('Succès', 'Un nouveau code a été envoyé à votre email.');
    } catch (error: any) {
      console.error('Resend error:', error);
      Alert.alert('Erreur', error?.message ?? 'Une erreur est survenue lors du renvoi du code.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Vérifier votre email</Text>
        <Text style={styles.subtitle}>Un code de vérification a été envoyé à {email}</Text>

        {/* Loading indicator for auto-verification */}
        {loading && tokenFromDeepLink && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#00009e" size="large" />
            <Text style={styles.loadingText}>Vérification en cours...</Text>
          </View>
        )}

        {/* Code input fields */}
        {!loading || !tokenFromDeepLink ? (
          <>
            <View style={styles.codeContainer}>
              {Array.from({ length: 6 }).map((_, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[styles.codeInput, code.length === index && styles.codeInputFocused]}
                  value={code[index] || ''}
                  onChangeText={(value) => handleCodeChange(index, value)}
                  onKeyPress={(e) => handleKeyPress(index, e.nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  editable={!loading}
                  caretHidden
                  textAlign="center"
                />
              ))}
            </View>

            {/* Timer and attempts */}
            <View style={styles.infoContainer}>
              <Text style={[styles.timer, timeLeft < 300 && styles.timerWarning]}>
                Expire dans: {formatTime(timeLeft)}
              </Text>
              <Text style={styles.attemptsText}>Tentatives restantes: {attemptsLeft}</Text>
            </View>

            {/* Verify button */}
            <TouchableOpacity
              style={[styles.verifyButton, (loading || code.length !== 6) && styles.verifyButtonDisabled]}
              onPress={handleVerifyCode}
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.verifyButtonText}>Vérifier le code</Text>
              )}
            </TouchableOpacity>

            {/* Resend code button */}
            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendCode}
              disabled={loading}
            >
              <Text style={styles.resendButtonText}>Renvoyer un code</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {/* Back to signup */}
        <TouchableOpacity
          onPress={() => router.replace('/auth/signup' as any)}
          disabled={loading}
        >
          <Text style={styles.backText}>Retour à l'inscription</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 28,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 320,
    gap: 8,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  codeInput: {
    flex: 1,
    maxWidth: 42,
    height: 54,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    fontSize: 22,
    fontWeight: '600',
    color: '#e8a900',
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
  },
  codeInputFocused: {
    borderColor: '#e8a900',
    backgroundColor: '#fff8e8',
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timer: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timerWarning: {
    color: '#DC2626',
    fontWeight: '600',
  },
  attemptsText: {
    fontSize: 12,
    color: '#999',
  },
  verifyButton: {
    backgroundColor: '#00009e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00009e',
    marginBottom: 16,
  },
  resendButtonText: {
    color: '#00009e',
    fontSize: 14,
    fontWeight: '600',
  },
  backText: {
    color: '#00009e',
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#00009e',
    fontWeight: '500',
  },
});
