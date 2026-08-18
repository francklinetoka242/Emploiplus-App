import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Clipboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCvJobAnalysis } from '../../hooks/useCvJobAnalysis';
import type { CvJobAnalysisResult } from '../../lib/cv-job-analysis/cvJobAnalysisTypes';

interface CvJobAnalysisSectionProps {
  candidateId: string | null;
  jobId: string;
  isAuthenticated: boolean;
}

export function CvJobAnalysisSection({
  candidateId,
  jobId,
  isAuthenticated,
}: CvJobAnalysisSectionProps) {
  const router = useRouter();
  const { data, isAnalyzing, error, analyze, reset } = useCvJobAnalysis(
    isAuthenticated ? candidateId : null,
    jobId,
  );

  // Reset when jobId changes to avoid showing previous job's analysis
  useEffect(() => {
    reset();
  }, [jobId, reset]);

  const handleCopyLetter = async () => {
    if (!data?.cover_letter_draft) return;

    try {
      await Clipboard.setString(data.cover_letter_draft);
      Alert.alert('Succès', 'Lettre copiée');
    } catch (err) {
      Alert.alert('Erreur', 'La copie a échoué.');
    }
  };

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analyse de votre CV</Text>
        <Text style={styles.descriptionText}>
          Connectez-vous pour analyser votre CV par rapport à cette offre.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/auth/login' as any)}
        >
          <Text style={styles.buttonText}>Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Initial state - no analysis yet
  if (!data && !isAnalyzing && !error) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analyse de votre CV</Text>
        <Text style={styles.descriptionText}>
          Comparez votre CV avec les exigences de cette offre et obtenez un score personnalisé,
          vos points forts, vos axes d'amélioration et une proposition de lettre de motivation.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={analyze}
          disabled={isAnalyzing}
        >
          <Text style={styles.buttonText}>Analyser mon CV avec cette offre</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading state
  if (isAnalyzing) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analyse de votre CV</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00009e" />
          <Text style={styles.loadingText}>Analyse de votre CV en cours…</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analyse de votre CV</Text>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color="#dc2626" />
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={analyze}
          disabled={isAnalyzing}
        >
          <Text style={styles.secondaryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Success state - display analysis results
  if (!data) return null;

  return (
    <View>
      {/* Score Card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Score de compatibilité</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreValue}>{data.match_score}%</Text>
          <View style={styles.scoreBar}>
            <View
              style={[
                styles.scoreBarFill,
                { width: `${Math.min(data.match_score, 100)}%` },
              ]}
            />
          </View>
          {data.experienceVerified ? (
            <Text style={styles.experienceText}>{data.experienceVerified}</Text>
          ) : null}
        </View>
      </View>

      {/* Strengths Card */}
      {data.strengths && data.strengths.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Points forts</Text>
          {data.strengths.slice(0, 5).map((strength, idx) => (
            <View key={`${strength}-${idx}`} style={styles.listItem}>
              <View style={styles.bulletPoint} />
              <Text style={styles.listItemText}>{strength}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Improvements Card */}
      {(data.gaps && data.gaps.length > 0) || (data.improvements && data.improvements.length > 0) ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Axes d'amélioration</Text>
          {(data.gaps?.length ? data.gaps : data.improvements || [])
            .slice(0, 5)
            .map((improvement, idx) => (
              <View key={`${improvement}-${idx}`} style={styles.listItem}>
                <View style={styles.bulletPoint} />
                <Text style={styles.listItemText}>{improvement}</Text>
              </View>
            ))}
        </View>
      ) : null}

      {/* Summary Card */}
      {data.summary ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analyse du profil</Text>
          <Text style={styles.bodyText}>{data.summary}</Text>
        </View>
      ) : null}

      {/* Cover Letter Card */}
      {data.cover_letter_draft ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proposition de lettre de motivation</Text>
          <ScrollView style={styles.letterContainer} scrollEnabled={false}>
            <Text style={styles.letterText}>{data.cover_letter_draft}</Text>
          </ScrollView>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleCopyLetter}
          >
            <Ionicons name="copy" size={16} color="#111827" />
            <Text style={styles.secondaryButtonText}>Copier la lettre</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 21,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#00009e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dfe7f2',
    borderRadius: 12,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    color: '#374151',
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  scoreContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#00009e',
    marginBottom: 12,
  },
  scoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  scoreBarFill: {
    height: '100%',
    backgroundColor: '#00009e',
  },
  experienceText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00009e',
    marginTop: 8,
    flexShrink: 0,
  },
  listItemText: {
    flex: 1,
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
  },
  bodyText: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 21,
  },
  letterContainer: {
    maxHeight: 300,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  letterText: {
    color: '#374151',
    fontSize: 13,
    lineHeight: 19,
  },
});

export default CvJobAnalysisSection;
