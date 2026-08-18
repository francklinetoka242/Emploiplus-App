import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchJobById, type JobOffer } from '../../../lib/jobs';

export default function JobApplicationConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const [job, setJob] = useState<JobOffer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const jobId = params.jobId;
        if (!jobId) {
          setLoading(false);
          return;
        }

        const { data } = await fetchJobById(String(jobId));
        setJob(data);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [params.jobId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00009e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Candidature envoyée</Text>
        <Text style={styles.subtitle}>Votre candidature a bien été enregistrée.</Text>
        <Text style={styles.jobName}>{job?.title ?? 'Votre candidature'}</Text>

        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/candidate/applications' as any)}>
          <Text style={styles.buttonText}>Voir mes candidatures</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/candidate/jobs' as any)}>
          <Text style={styles.secondaryButtonText}>Retour aux emplois</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#4b5563',
    marginBottom: 20,
  },
  jobName: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#00009e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#dfe7f2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '700',
  },
});
