import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { formatDate } from '../../../lib/jobs';
import {
  fetchCandidateProfileCompletionSnapshot,
  getCurrentCandidateProfile,
} from '../../../lib/candidate-profile';
import { fetchCandidateNotifications, type NotificationRow } from '../../../lib/notifications';
import { readPageCache, writePageCache } from '../../../lib/session-page-cache';
import { debugDuplicateKeys, debugExactUuidInList } from '../../../lib/debug-duplicate-keys';

type DashboardData = {
  profile: any;
  applications: any[];
  matchingJobs: any[];
  profileCompletion: number;
  completionItems: any[];
  missingItems: string[];
  hasCv: boolean;
  experiencesCount: number;
  educationCount: number;
  skillsCount: number;
  languagesCount: number;
  hasPreferences: boolean;
};

export default function CandidateDashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittingJobId, setSubmittingJobId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  const loadDashboard = useCallback(async () => {
    setError(null);

    try {
      const { candidate: profile, error: profileError } = await getCurrentCandidateProfile({ useCache: true });

      if (profileError || !profile) {
        setError('Session expirée. Veuillez vous reconnecter.');
        return;
      }

      const profileData = await fetchCandidateProfileCompletionSnapshot({ useCache: true });
      const completion = profileData.completion;

      const [notificationsData, { data: applicationsData = [] }, { data: matchingData = [] }] = await Promise.all([
        fetchCandidateNotifications(3),
        supabase
          .from('job_applications')
          .select('id, status, applied_at, job_offer_id')
          .eq('candidate_id', profile.id)
          .order('applied_at', { ascending: false, nullsFirst: false })
          .limit(10),
        supabase.rpc('match_job_offers_for_candidate', {
          candidate_id: profile.id,
          match_threshold: 0,
          match_count: 3,
          match_offset: 0,
        }),
      ]);

      setNotifications(notificationsData ?? []);

      const offerIds = Array.from(
        new Set([
          ...((applicationsData ?? []).map((item: any) => item.job_offer_id).filter(Boolean)),
          ...((matchingData ?? []).map((item: any) => item.id).filter(Boolean)),
        ])
      );

      let offersById: Record<string, any> = {};
      if (offerIds.length > 0) {
        const { data: relatedOffers } = await supabase
          .from('job_offers')
          .select('id, title, company, location_city, contract_type, salary, status, publish_at')
          .in('id', offerIds);

        offersById = Object.fromEntries((relatedOffers ?? []).map((item: any) => [item.id, item]));
      }

      const applicationsWithOffers = (applicationsData ?? []).map((application: any) => ({
        ...application,
        offer: offersById[application.job_offer_id] ?? null,
      }));

      const matchingJobsWithDetails = (matchingData ?? []).map((match: any) => ({
        ...offersById[match.id],
        ...match,
      }));

      setData({
        profile,
        applications: applicationsWithOffers,
        matchingJobs: matchingJobsWithDetails,
        profileCompletion: completion.completionPercentage,
        completionItems: completion.completionItems,
        missingItems: completion.missingItems,
        hasCv: Boolean(profile.cv_url),
        experiencesCount: profileData.experiences?.length ?? 0,
        educationCount: profileData.educations?.length ?? 0,
        skillsCount: profileData.skills?.length ?? 0,
        languagesCount: profileData.languages?.length ?? 0,
        hasPreferences: Boolean(profileData.preferences),
      });
    } catch (fetchError: any) {
      setError('Une erreur est survenue lors du chargement du tableau de bord.');
      console.warn('Dashboard load error:', fetchError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleApplyFromDashboard = useCallback(
    async (jobId: string) => {
      setSubmittingJobId(jobId);
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          Alert.alert('Session expirée', 'Veuillez vous reconnecter pour postuler.');
          router.replace('/auth/login' as any);
          return;
        }

        router.push({ pathname: '/candidate/jobs/[id]', params: { id: jobId } } as any);
      } catch (submitError: any) {
        const message = String(submitError?.message ?? '').toLowerCase();
        if (message.includes('network') || message.includes('failed to fetch')) {
          Alert.alert('Connexion', 'Vérifiez votre connexion et réessayez.');
        } else {
          Alert.alert('Erreur', 'La candidature n\'a pas pu être ouverte.');
        }
      } finally {
        setSubmittingJobId(null);
      }
    },
    [router]
  );

  const progress = data?.profileCompletion ?? 0;

  const missingChecklist = useMemo(() => {
    const checks = new Set<string>();

    if (!data?.hasCv) {
      checks.add('CV');
    }

    if (!data?.profile?.first_name || !data?.profile?.last_name) {
      checks.add('Nom complet');
    }

    if (!data?.profile?.headline) {
      checks.add('Headline');
    }

    if ((data?.experiencesCount ?? 0) === 0) {
      checks.add('Expérience');
    }

    if ((data?.educationCount ?? 0) === 0) {
      checks.add('Formation');
    }

    if ((data?.skillsCount ?? 0) === 0) {
      checks.add('Compétences');
    }

    if ((data?.languagesCount ?? 0) === 0) {
      checks.add('Langues');
    }

    if (!data?.hasPreferences) {
      checks.add('Préférences');
    }

    const fallback = (data?.missingItems ?? []).map((item) => {
      const normalized = item.toLowerCase();
      if (normalized.includes('cv')) return 'CV';
      if (normalized.includes('exp')) return 'Expérience';
      if (normalized.includes('compétence')) return 'Compétences';
      if (normalized.includes('formation')) return 'Formation';
      if (normalized.includes('langue')) return 'Langues';
      if (normalized.includes('préfér') || normalized.includes('preference')) return 'Préférences';
      if (normalized.includes('titre') || normalized.includes('headline')) return 'Headline';
      if (normalized.includes('nom') || normalized.includes('full name')) return 'Nom complet';
      if (normalized.includes('photo')) return 'Photo';
      return item;
    });

    fallback.forEach((item) => checks.add(item));

    return Array.from(checks).slice(0, 4);
  }, [data]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  debugDuplicateKeys('CandidateDashboardScreen', 'notifications', notifications, (notification) => notification?.id);
  debugDuplicateKeys('CandidateDashboardScreen', 'matchingJobs', data?.matchingJobs ?? [], (job) => job?.id);
  debugExactUuidInList('CandidateDashboardScreen', 'notifications', notifications, (notification) => notification?.id, 'f4f29e28-f276-40e4-bbfa-553acd7cdf94');
  debugExactUuidInList('CandidateDashboardScreen', 'matchingJobs', data?.matchingJobs ?? [], (job) => job?.id, 'f4f29e28-f276-40e4-bbfa-553acd7cdf94');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00009e" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Tableau de bord indisponible</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => loadDashboard()}>
            <Text style={styles.primaryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboard(); }} tintColor="#00009e" />}
      >
        <View style={styles.profileCard}>
          <View style={styles.profileCardHeader}>
            <Text style={styles.profileLabel}>Complétion du profil</Text>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>

          <View style={styles.progressWrapper}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
          </View>

          {missingChecklist.length > 0 ? (
            <View style={styles.missingList}>
              {missingChecklist.map((item, index) => (
                <View key={`${item}-${index}`} style={styles.missingPill}>
                  <Text style={styles.missingPillText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.completeText}>Votre profil est complet.</Text>
          )}

          <TouchableOpacity
            style={styles.primaryButtonWide}
            onPress={() => router.push('/candidate/profile' as any)}
          >
            <Text style={styles.primaryButtonText}>Compléter mon profil</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.notificationCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Notifications importantes</Text>
            {unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            ) : null}
          </View>

          {notifications.length === 0 ? (
            <Text style={styles.emptyNotificationText}>Aucune notification pour le moment.</Text>
          ) : (
            <View style={styles.notificationList}>
              {notifications.slice(0, 3).map((notification) => (
                <View
                  key={notification.id}
                  style={[styles.notificationItem, !notification.is_read && styles.notificationItemUnread]}
                >
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle} numberOfLines={1}>{notification.title ?? 'Notification'}</Text>
                    <Text style={styles.notificationMeta} numberOfLines={2}>{notification.content ?? 'Aucun détail disponible.'}</Text>
                  </View>
                  {notification.created_at ? (
                    <Text style={styles.notificationDate}>{formatDate(notification.created_at)}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.secondaryButtonFull}
            onPress={() => router.push('/candidate/notifications' as any)}
          >
            <Ionicons name="arrow-forward" size={20} color="#00009e" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommandations</Text>
        </View>
        {(data?.matchingJobs ?? []).length > 0 ? (
          <View style={styles.listCard}>
            {(data?.matchingJobs ?? []).map((job: any) => (
              <View
                key={job.id}
                style={styles.matchCard}
              >
                <View style={styles.matchHeader}>
                  <View style={styles.matchTextWrap}>
                    <Text style={styles.listTitle}>{job.title ?? 'Offre recommandée'}</Text>
                    <Text style={styles.listMeta}>{job.company ?? 'Entreprise'}</Text>
                  </View>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreBadgeText}>{Math.round((job.score ?? 0) * 100)}%</Text>
                  </View>
                </View>

                <View style={styles.matchFooter}>
                  <Text style={styles.locationPill}>{job.location_city ?? 'Localisation'}</Text>
                  <Text style={styles.contractPill}>{job.contract_type ?? 'CDI'}</Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => router.push({ pathname: '/candidate/jobs/[id]', params: { id: job.id } } as any)}
                  >
                    <Text style={styles.secondaryButtonText}>Voir plus</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryButtonSmall, submittingJobId === job.id && styles.buttonDisabled]}
                    onPress={() => handleApplyFromDashboard(job.id)}
                    disabled={submittingJobId === job.id}
                  >
                    {submittingJobId === job.id ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Postuler</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucune recommandation calculée pour le moment.</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  greeting: {
    fontSize: 31,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    color: '#4b5563',
    fontSize: 14,
    marginTop: 6,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 18,
    marginBottom: 18,
  },
  profileCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  profileLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  progressWrapper: {
    marginTop: 12,
  },
  progressBarBackground: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#00009e',
  },
  progressText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  missingList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  missingPill: {
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  missingPillText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
  },
  completeText: {
    marginTop: 14,
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButtonWide: {
    marginTop: 16,
    backgroundColor: '#00009e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 18,
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 999,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  notificationList: {
    gap: 10,
    marginTop: 14,
  },
  notificationItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  notificationItemUnread: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  notificationMeta: {
    marginTop: 4,
    color: '#475569',
    fontSize: 11,
    lineHeight: 16,
  },
  notificationDate: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyNotificationText: {
    color: '#4b5563',
    fontSize: 13,
    marginTop: 12,
  },
  secondaryButtonFull: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#dfe7f2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  statLabel: {
    color: '#4b5563',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  listCard: {
    gap: 12,
    marginBottom: 18,
  },
  matchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  matchTextWrap: {
    flex: 1,
  },
  listTitle: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
  },
  listMeta: {
    color: '#4b5563',
    fontSize: 12,
    fontWeight: '500',
  },
  scoreBadge: {
    backgroundColor: '#fffbf0',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    minWidth: 58,
    alignItems: 'center',
  },
  scoreBadgeText: {
    color: '#e8a900',
    fontSize: 11,
    fontWeight: '800',
  },
  matchFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  locationPill: {
    backgroundColor: '#f1f5f9',
    color: '#334155',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '700',
  },
  contractPill: {
    backgroundColor: '#ecfeff',
    color: '#0f766e',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  secondaryButtonText: {
    color: '#00009e',
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButtonSmall: {
    flex: 1,
    backgroundColor: '#e8a900',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  metaPill: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 18,
  },
  emptyText: {
    color: '#4b5563',
    fontSize: 14,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 18,
    alignItems: 'center',
  },
  actionTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  errorText: {
    color: '#4b5563',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: '#00009e',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  skeletonCard: {
    height: 100,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
  },
  skeletonRow: {
    height: 60,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
