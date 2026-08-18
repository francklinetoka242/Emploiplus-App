import { useRouter } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { debugDuplicateKeys, debugExactUuidInList } from '../../../lib/debug-duplicate-keys';
import {
    fetchMyApplicationsForCandidate,
    formatDate,
    getConnectedCandidate,
    isNetworkError
} from '../../../lib/jobs';

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Soumise',
  reviewed: "En cours d'analyse",
  shortlisted: 'Présélectionnée',
  rejected: 'Refusée',
  accepted: 'Acceptée',
  withdrawn: 'Retirée',
};

export default function CandidateApplicationsScreen() {
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    setError(null);

    try {
      const { candidate, error: candidateError } = await getConnectedCandidate();
      if (candidateError || !candidate) {
        setError("Aucun profil candidat n'est associé à ce compte.");
        return;
      }

      const { data, error: fetchError } = await fetchMyApplicationsForCandidate(candidate.id);
      if (fetchError) {
        setError(isNetworkError(fetchError) ? 'Vérifiez votre connexion et réessayez.' : 'Les candidatures sont indisponibles.');
        return;
      }

      setApplications(data ?? []);
    } catch (loadError: any) {
      setError(isNetworkError(loadError) ? 'Vérifiez votre connexion et réessayez.' : 'Une erreur est survenue lors du chargement des candidatures.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadApplications();
  };

  const getStatusLabel = (status: string | null | undefined) => STATUS_LABELS[String(status ?? '').toLowerCase()] ?? 'En attente';

  debugDuplicateKeys('CandidateApplicationsScreen', 'applications', applications, (application) => application?.id);
  debugExactUuidInList('CandidateApplicationsScreen', 'applications', applications, (application) => application?.id, 'f4f29e28-f276-40e4-bbfa-553acd7cdf94');

  const recentApplications = applications.slice(0, 5);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#00009e" />
          <Text style={styles.loaderText}>Chargement des candidatures...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes candidatures</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>ℹ Après 30 jours, vos candidatures sont automatiquement supprimées de cette page.</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Impossible d'afficher vos candidatures</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadApplications}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!error && applications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Aucune candidature</Text>
          <Text style={styles.emptyText}>Vous n'avez pas encore postulé à une offre.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/candidate/jobs' as any)}>
            <Text style={styles.primaryButtonText}>Voir les emplois</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!error && recentApplications.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00009e" />}
        >
          {recentApplications.map((application) => {
            const offer = application.offer;
            return (
              <TouchableOpacity
                key={application.id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/candidate/jobs/[id]', params: { id: application.job_offer_id } } as any)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.jobTitle}>{offer?.title ?? 'Offre'}</Text>
                    <Text style={styles.company}>{offer?.company ?? 'Entreprise'}</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{getStatusLabel(application.status)}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaPill}>{offer?.location_city ?? 'Localisation'}</Text>
                  <Text style={styles.metaPill}>{offer?.contract_type ?? 'Contrat'}</Text>
                </View>

                <Text style={styles.dateText}>Candidature envoyée le {formatDate(application.applied_at)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  loaderText: {
    marginTop: 12,
    color: '#374151',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  infoBox: {
    marginTop: 12,
    backgroundColor: '#dbeafe',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0284c7',
    padding: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#0c4a6e',
    lineHeight: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  errorBox: {
    marginHorizontal: 20,
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fdba74',
    padding: 16,
  },
  errorTitle: {
    color: '#7c2d12',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  errorText: {
    color: '#9a4c1d',
    fontSize: 13,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#00009e',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    color: '#4b5563',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: '#00009e',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 18,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  cardInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  company: {
    color: '#374151',
    fontSize: 14,
  },
  badge: {
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#1f2a8a',
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  metaPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    color: '#374151',
    fontSize: 11,
    fontWeight: '600',
  },
  dateText: {
    color: '#64748B',
    fontSize: 12,
  },
});
