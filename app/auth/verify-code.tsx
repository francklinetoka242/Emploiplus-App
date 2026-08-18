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

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const inputRefs = useRef<(TextInput | null)[]>([]);

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
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newCode = code.split('');
    newCode[index] = value.charAt(0);
    setCode(newCode.join(''));

    // Auto-focus next input
    if (value && index < 5) {
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

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      Alert.alert('Code incomplet', 'Veuillez entrer les 6 chiffres du code.');
      return;
    }

    setLoading(true);

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

      if (!supabaseUrl) {
        throw new Error('SUPABASE_URL not configured');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code,
          userId: userId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.attemptsRemaining !== undefined) {
          setAttemptsLeft(data.attemptsRemaining);
          Alert.alert(
            'Code incorrect',
            `Code invalide. ${data.attemptsRemaining} tentative${
              data.attemptsRemaining > 1 ? 's' : ''
            } restante${data.attemptsRemaining > 1 ? 's' : ''}.`,
          );
        } else {
          Alert.alert('Erreur', data.error || 'Une erreur est survenue.');
        }
        setCode('');
        return;
      }

      Alert.alert('Succès', 'Votre email a été confirmé avec succès!', [
        {
          text: 'OK',
          onPress: () => {
            router.replace('/auth/login' as any);
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message ?? 'Une erreur est survenue lors de la vérification du code.');
      console.error('Verify code error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

      if (!supabaseUrl) {
        throw new Error('SUPABASE_URL not configured');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/resend-verification-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          userId: userId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          Alert.alert(
            'Trop de demandes',
            `Veuillez attendre ${data.retryAfter} secondes avant de demander un nouveau code.`,
          );
        } else {
          Alert.alert('Erreur', data.error || 'Une erreur est survenue.');
        }
        return;
      }

      setCode('');
      setTimeLeft(1200);
      Alert.alert('Succès', 'Un nouveau code a été envoyé à votre email.');
    } catch (error: any) {
      Alert.alert('Erreur', error?.message ?? 'Une erreur est survenue lors du renvoi du code.');
      console.error('Resend code error:', error);
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

        {/* Code input fields */}
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
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  codeInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    fontSize: 24,
    fontWeight: '600',
    color: '#00009e',
    textAlign: 'center',
  },
  codeInputFocused: {
    borderColor: '#00009e',
    backgroundColor: '#F3F4FF',
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
});
