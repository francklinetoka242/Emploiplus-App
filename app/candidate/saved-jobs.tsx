import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { fetchSavedOffersForCandidate, getConnectedCandidate, type JobOffer } from '../../lib/jobs';
import { debugDuplicateKeys, debugExactUuidInList } from '../../lib/debug-duplicate-keys';

export default function CandidateSavedJobsScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSavedJobs = useCallback(async () => {
    try {
      setError(null);
      const { candidate, error: candidateError } = await getConnectedCandidate();
      if (candidateError || !candidate) {
        setJobs([]);
        setError('Aucun profil candidat associé à ce compte.');
        return;
      }

      const { data: savedRecords, error: savedError } = await fetchSavedOffersForCandidate(candidate.id);
      if (savedError) {
        throw savedError;
      }

      const jobIds = (savedRecords ?? []).map((item) => item.job_offer_id).filter(Boolean) as string[];
      if (jobIds.length === 0) {
        setJobs([]);
        return;
      }

      const { data, error: jobsError } = await supabase
        .from('job_offers')
        .select('*')
        .in('id', jobIds)
        .eq('status', 'published')
        .order('publish_at', { ascending: false, nullsFirst: false });

      if (jobsError) {
        throw jobsError;
      }

      setJobs((data ?? []) as JobOffer[]);
    } catch (loadError: any) {
      setError('Impossible de charger vos offres enregistrées.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSavedJobs();
  }, [loadSavedJobs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSavedJobs();
  };

  debugDuplicateKeys('CandidateSavedJobsScreen', 'jobs', jobs, (job) => job?.id);
  debugExactUuidInList('CandidateSavedJobsScreen', 'jobs', jobs, (job) => job?.id, 'f4f29e28-f276-40e4-bbfa-553acd7cdf94');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00009e" />
        <Text style={styles.loadingText}>Chargement des offres enregistrées...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyTitle}>Offres enregistrées indisponibles</Text>
        <Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadSavedJobs()}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Offres enregistrées</Text>
        <Text style={styles.subtitle}>Retrouvez les offres que vous avez sauvegardées.</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00009e" />}
      >
        {jobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucune offre enregistrée</Text>
            <Text style={styles.emptyText}>Enregistrez des offres depuis la liste des emplois pour les retrouver ici.</Text>
          </View>
        ) : (
          jobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.jobCard}
              onPress={() => router.push({ pathname: '/candidate/jobs/[id]', params: { id: job.id } } as any)}
              activeOpacity={0.9}
            >
              <Text style={styles.jobTitle}>{job.title ?? 'Offre sans titre'}</Text>
              <Text style={styles.jobCompany}>{job.company ?? 'Entreprise non renseignée'}</Text>
              <Text style={styles.jobMeta}>{job.location_city ?? 'Localisation non renseignée'} · {job.contract_type ?? 'Contrat non renseigné'}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    color: '#4b5563',
    fontSize: 14,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    color: '#374151',
    fontSize: 14,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    color: '#4b5563',
    textAlign: 'center',
    fontSize: 14,
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: '#00009e',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
  },
  jobCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  jobTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  jobCompany: {
    color: '#374151',
    fontSize: 13,
    marginTop: 6,
  },
  jobMeta: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 6,
  },
});
