import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { debugDuplicateKeys, debugExactUuidInList } from '../../../lib/debug-duplicate-keys';
import {
    fetchJobFilterOptions,
    fetchJobOffers,
    formatDate,
    formatSalary,
    getConnectedCandidate,
    isNetworkError,
    JOBS_PAGE_SIZE,
    mergeUniqueJobOffers,
    toggleSavedOfferForCandidate,
    type JobOffer
} from '../../../lib/jobs';
import { readPageCache, writePageCache } from '../../../lib/session-page-cache';
import { supabase } from '../../../lib/supabase';

type JobsCacheState = {
  jobs: JobOffer[];
  search: string;
  contractFilter: string;
  locationFilter: string;
  page: number;
  hasMore: boolean;
  filters: {
    contracts: string[];
    locations: string[];
    tags: string[];
  };
  savedJobIds: Record<string, boolean>;
};

const JOBS_CACHE_KEY = 'jobs';
const JOBS_CACHE_TTL = 5 * 60 * 1000;

export default function CandidateJobsScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [search, setSearch] = useState('');
  const [contractFilter, setContractFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [contracts, setContracts] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  const jobsRef = useRef<JobOffer[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState<Record<string, boolean>>({});

  const loadFilters = useCallback(async () => {
    const { error, contracts: contractOptions, locations: locationOptions, tags: tagOptions } = await fetchJobFilterOptions();
    if (error) {
      return;
    }
    setContracts(contractOptions);
    setLocations(locationOptions);
    setTags(tagOptions);
  }, []);

  const loadSavedJobIds = useCallback(async (jobIds: string[]) => {
    if (jobIds.length === 0) {
      setSavedJobIds({});
      return;
    }

    const { candidate, error: candidateError } = await getConnectedCandidate();
    if (candidateError || !candidate) {
      setSavedJobIds({});
      return;
    }

    const { data, error } = await supabase
      .from('candidate_saved_offers')
      .select('job_offer_id')
      .eq('candidate_id', candidate.id)
      .in('job_offer_id', jobIds);

    if (error) {
      return;
    }

    const nextSaved = Object.fromEntries((data ?? []).map((item: any) => [item.job_offer_id, true]));
    setSavedJobIds((current) => ({ ...current, ...nextSaved }));
  }, []);

  const loadJobs = useCallback(
    async ({ reset = false, fromScratch = false } = {}) => {
      if (fromScratch) {
        setIsLoading(true);
      } else if (reset) {
        setIsRefreshing(true);
      }

      setErrorMessage(null);

      try {
        const pageIndex = reset ? 0 : pageRef.current;
        const { data, error, count } = await fetchJobOffers({
          search,
          contractType: contractFilter,
          locationCity: locationFilter,
          page: pageIndex,
          pageSize: JOBS_PAGE_SIZE,
        });

        if (error) {
          if (isNetworkError(error)) {
            setErrorMessage('Vérifiez votre connexion et réessayez.');
          } else {
            setErrorMessage('Les offres sont actuellement indisponibles.');
          }
          return;
        }

        const nextJobs = reset ? mergeUniqueJobOffers([], data) : mergeUniqueJobOffers(jobsRef.current, data);
        jobsRef.current = nextJobs;
        setJobs(nextJobs);

        const cacheState: JobsCacheState = {
          jobs: nextJobs,
          search,
          contractFilter,
          locationFilter,
          page: pageIndex,
          hasMore: nextJobs.length < (count ?? 0),
          filters: { contracts, locations, tags },
          savedJobIds,
        };

        await writePageCache(JOBS_CACHE_KEY, cacheState, JOBS_CACHE_TTL);

        const loadedCount = nextJobs.length;
        setHasMore(loadedCount < (count ?? 0));

        const nextPage = reset ? 1 : pageIndex + 1;
        pageRef.current = nextPage;
        setPage(nextPage);

        if (nextJobs.length > 0) {
          await loadSavedJobIds(nextJobs.map((job: JobOffer) => job.id));
        }
      } catch (error: any) {
        if (isNetworkError(error)) {
          setErrorMessage('Vérifiez votre connexion et réessayez.');
        } else {
          setErrorMessage('Une erreur est survenue lors du chargement des offres.');
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [contractFilter, loadSavedJobIds, locationFilter, search]
  );

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      const { value: cached } = await readPageCache<JobsCacheState>(JOBS_CACHE_KEY, JOBS_CACHE_TTL);

      if (active && cached) {
        setJobs(cached.jobs ?? []);
        setSearch(cached.search ?? '');
        setContractFilter(cached.contractFilter ?? '');
        setLocationFilter(cached.locationFilter ?? '');
        setSavedJobIds(cached.savedJobIds ?? {});
        jobsRef.current = cached.jobs ?? [];
        pageRef.current = cached.page ?? 0;
        setPage(cached.page ?? 0);
        setHasMore(cached.hasMore ?? true);
        setIsLoading(false);
      }

      await loadFilters();
      if (!active) {
        return;
      }

      if (!cached) {
        await loadJobs({ reset: true, fromScratch: true });
      } else {
        await loadJobs({ reset: false, fromScratch: false });
      }
    };

    initialize();

    return () => {
      active = false;
    };
  }, [loadFilters, loadJobs]);

  const handleRefresh = useCallback(() => {
    pageRef.current = 0;
    setPage(0);
    loadJobs({ reset: true, fromScratch: false });
  }, [loadJobs]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || isLoading) {
      return;
    }

    setIsLoadingMore(true);
    loadJobs({ reset: false, fromScratch: false });
  }, [hasMore, isLoading, isLoadingMore, loadJobs]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      pageRef.current = 0;
      setPage(0);
      loadJobs({ reset: true, fromScratch: false });
    }, 250);

    return () => clearTimeout(timeout);
  }, [search, contractFilter, locationFilter, loadJobs]);

  debugDuplicateKeys('CandidateJobsScreen', 'jobs', jobs, (job) => job?.id);
  debugExactUuidInList('CandidateJobsScreen', 'jobs', jobs, (job) => job?.id, 'f4f29e28-f276-40e4-bbfa-553acd7cdf94');

  const handleToggleSave = async (jobId: string) => {
    const { candidate, error: candidateError } = await getConnectedCandidate();
    if (candidateError || !candidate) {
      Alert.alert('Profil candidat manquant', 'Aucun profil candidat n’est associé à ce compte.');
      return;
    }

    try {
      const { saved } = await toggleSavedOfferForCandidate(candidate.id, jobId);
      setSavedJobIds((current) => ({ ...current, [jobId]: saved }));
    } catch (error: any) {
      const message = String(error?.message ?? '').toLowerCase();
      if (message.includes('network') || message.includes('failed to fetch')) {
        Alert.alert('Connexion', 'Vérifiez votre connexion et réessayez.');
      } else if (error?.message === 'MAX_SAVED_OFFERS_REACHED' || message.includes('max_saved_offers_reached')) {
        Alert.alert('Limite atteinte', 'Vous ne pouvez pas enregistrer plus de 5 offres. Veuillez supprimer une offre enregistrée existante afin de la remplacer.');
      } else {
        Alert.alert('Erreur', 'L’offre n’a pas pu être enregistrée.');
      }
    }
  };

  const renderJob = ({ item }: { item: JobOffer }) => (
    <TouchableOpacity
      key={item.id}
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/candidate/jobs/[id]', params: { id: item.id } } as any)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.companyBlock}>
          <Text style={styles.cardTitle}>{item.title ?? 'Offre sans titre'}</Text>
          <Text style={styles.cardCompany}>{item.company ?? 'Entreprise non renseignée'}</Text>
        </View>
        <View style={styles.cardActions}>
          <Text style={styles.cardDate}>{formatDate(item.publish_at ?? item.created_at)}</Text>
          <TouchableOpacity
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              handleToggleSave(item.id);
            }}
          >
            <Ionicons
              name={savedJobIds[item.id] ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={savedJobIds[item.id] ? '#00009e' : '#374151'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaPill}>{item.location_city ?? 'Localisation non renseignée'}</Text>
        <Text style={styles.metaPill}>{item.contract_type ?? 'Contrat non renseigné'}</Text>
      </View>

      {item.tags && item.tags.length > 0 ? (
        <View style={styles.tagsRow}>
          {item.tags.slice(0, 3).map((tag: string) => (
            <Text key={`${item.id}-${tag}`} style={styles.tag}>{tag}</Text>
          ))}
        </View>
      ) : null}

      <Text style={styles.cardDescription} numberOfLines={3}>
        {item.description ?? 'Description non disponible.'}
      </Text>

      <View style={styles.footerRow}>
        <Text style={styles.salary}>{formatSalary(item.salary)}</Text>
        <Text style={styles.viewLink}>Voir l’offre</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading && jobs.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#00009e" />
          <Text style={styles.loaderText}>Chargement des offres...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#64748B" style={styles.searchIcon} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un emploi..."
          placeholderTextColor="#64748B"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => loadJobs({ reset: true, fromScratch: false })}
        />
        <TouchableOpacity style={styles.filterToggleButton} onPress={() => setFiltersVisible(!filtersVisible)}>
          <Ionicons name={filtersVisible ? 'chevron-up' : 'chevron-down'} size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      {filtersVisible && (contracts.length > 0 || locations.length > 0) && (
        <View style={styles.filterSection}>
          {contracts.length > 0 && (
            <View style={styles.filterGroup}>
              <Text style={styles.filterTitle}>Contrat</Text>
              <View style={styles.filterChipsRow}>
                <TouchableOpacity
                  style={[styles.filterChip, !contractFilter && styles.filterChipActive]}
                  onPress={() => setContractFilter('')}
                >
                  <Text style={[styles.filterChipText, !contractFilter && styles.filterChipTextActive]}>Tous</Text>
                </TouchableOpacity>
                {contracts.map((contract, index) => (
                  <TouchableOpacity
                    key={`${contract}-${index}`}
                    style={[styles.filterChip, contractFilter === contract && styles.filterChipActive]}
                    onPress={() => setContractFilter((current) => (current === contract ? '' : contract))}
                  >
                    <Text style={[styles.filterChipText, contractFilter === contract && styles.filterChipTextActive]}>
                      {contract}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {locations.length > 0 && (
            <View style={styles.filterGroup}>
              <Text style={styles.filterTitle}>Localisation</Text>
              <View style={styles.filterChipsRow}>
                <TouchableOpacity
                  style={[styles.filterChip, !locationFilter && styles.filterChipActive]}
                  onPress={() => setLocationFilter('')}
                >
                  <Text style={[styles.filterChipText, !locationFilter && styles.filterChipTextActive]}>Toutes</Text>
                </TouchableOpacity>
                {locations.map((city, index) => (
                  <TouchableOpacity
                    key={`${city}-${index}`}
                    style={[styles.filterChip, locationFilter === city && styles.filterChipActive]}
                    onPress={() => setLocationFilter((current) => (current === city ? '' : city))}
                  >
                    <Text style={[styles.filterChipText, locationFilter === city && styles.filterChipTextActive]}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Impossible de charger les offres</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadJobs({ reset: true, fromScratch: true })}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!errorMessage && jobs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Aucune offre disponible</Text>
          <Text style={styles.emptyText}>Aucun résultat ne correspond à votre recherche.</Text>
        </View>
      ) : null}

      {!errorMessage && jobs.length > 0 ? (
        <FlatList
          data={jobs}
          renderItem={renderJob}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#00009e" />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasMore ? (
              <View style={styles.footerLoader}>
                {isLoadingMore ? <ActivityIndicator size="small" color="#00009e" /> : null}
              </View>
            ) : (
              <Text style={styles.endText}>Fin des résultats</Text>
            )
          }
        />
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
    fontSize: 14,
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
    marginTop: 6,
    color: '#4b5563',
    fontSize: 14,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dfe7f2',
    marginHorizontal: 20,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    paddingVertical: 12,
  },
  filterToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    backgroundColor: '#f3f4f6',
  },
  filterSection: {
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 10,
  },
  filterGroup: {
    gap: 8,
  },
  filterTitle: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dfe7f2',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: '#00009e',
    borderColor: '#00009e',
  },
  filterChipText: {
    color: '#1f2937',
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#ffffff',
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
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  companyBlock: {
    flex: 1,
  },
  cardActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cardCompany: {
    color: '#374151',
    fontSize: 14,
    marginBottom: 10,
  },
  cardDate: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
    color: '#1f2a8a',
    fontSize: 12,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: '600',
  },
  cardDescription: {
    color: '#4b5563',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  salary: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 12,
  },
  viewLink: {
    color: '#00009e',
    fontWeight: '700',
    fontSize: 12,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    color: '#4b5563',
    fontSize: 14,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  endText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 12,
    paddingVertical: 16,
  },
});
