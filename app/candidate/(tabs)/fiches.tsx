import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchLocalGuides, type LocalGuideRecord } from '../../../lib/fiches';
import { readPageCache, writePageCache } from '../../../lib/session-page-cache';
import { debugDuplicateKeys, debugExactUuidInList } from '../../../lib/debug-duplicate-keys';

const normalizeGuides = (items: LocalGuideRecord[]) => {
  const unique = new Map<string, LocalGuideRecord>();

  for (const item of items) {
    if (!item?.id) {
      continue;
    }

    if (!unique.has(item.id)) {
      unique.set(item.id, item);
    }
  }

  return Array.from(unique.values());
};

const CATEGORY_COLORS: Record<string, string> = {
  Salaires: '#DCFCE7',
  'Droit du travail': '#DBEAFE',
  Entretien: '#FEF3C7',
  default: '#E2E8F0',
};

const FICHES_CACHE_KEY = 'fiches';
const FICHES_CACHE_TTL = 5 * 60 * 1000;

export default function CandidateFichesScreen() {
  const [guides, setGuides] = useState<LocalGuideRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGuides = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      setError(null);

      const { value: cachedGuides } = await readPageCache<LocalGuideRecord[]>(FICHES_CACHE_KEY, FICHES_CACHE_TTL);
      const normalizedCached = cachedGuides ? normalizeGuides(cachedGuides) : [];

      if (normalizedCached.length > 0 && !silent) {
        setGuides(normalizedCached);
        setLoading(false);
      }

      const data = normalizeGuides(await fetchLocalGuides({ visibleOnly: true }));
      setGuides(data);
      await writePageCache(FICHES_CACHE_KEY, data, FICHES_CACHE_TTL);
    } catch (loadError: any) {
      if (guides.length === 0) {
        setError('Impossible de charger les fiches pour le moment.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [guides.length]);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      const { value: cachedGuides } = await readPageCache<LocalGuideRecord[]>(FICHES_CACHE_KEY, FICHES_CACHE_TTL);
      const normalizedCached = cachedGuides ? normalizeGuides(cachedGuides) : [];

      if (active) {
        if (normalizedCached.length > 0) {
          setGuides(normalizedCached);
          setLoading(false);
        }
      }

      await loadGuides({ silent: true });
    };

    initialize();

    return () => {
      active = false;
    };
  }, [loadGuides]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGuides({ silent: true });
  };

  debugDuplicateKeys('CandidateFichesScreen', 'guides', guides, (guide) => guide?.id);
  debugExactUuidInList('CandidateFichesScreen', 'guides', guides, (guide) => guide?.id, 'f4f29e28-f276-40e4-bbfa-553acd7cdf94');

  if (loading && guides.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E8A900" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyTitle}>Impossible de charger les fiches.</Text>
        <Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadGuides()}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#E8A900" />}
      >
        <View style={styles.introCard}>
          <View style={styles.introHeader}>
            <View style={styles.introIconWrap}>
              <Ionicons name="book-outline" size={28} color="#00009e" />
            </View>
            <View style={styles.introContent}>
              <Text style={styles.introTitle}>Fiches conseils locales</Text>
              <Text style={styles.introSubtitle}>Retrouvez des ressources pratiques pour mieux préparer vos démarches.</Text>
            </View>
          </View>
        </View>

        {guides.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyTitle}>Aucune fiche n’est disponible pour le moment.</Text>
          </View>
        ) : (
          guides.map((guide) => {
            const category = guide.category ?? 'default';
            const badgeColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default;

            return (
              <View key={guide.id} style={styles.listItem}>
                <View style={styles.listIconWrap}>
                  <View style={[styles.listIcon, { backgroundColor: badgeColor }]}>
                    <Text style={styles.listIconText}>{(guide.category ?? 'G').slice(0, 1).toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>{guide.title ?? 'Fiche sans titre'}</Text>
                  <Text style={styles.listMeta} numberOfLines={2}>
                    {guide.description ?? 'Aucune description disponible.'}
                  </Text>
                  <View style={styles.listFooter}>
                    <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                      <Text style={styles.badgeText}>{guide.category ?? 'Général'}</Text>
                    </View>

                    <View style={styles.actionRow}>
                      {guide.document_url ? (
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => Linking.openURL(guide.document_url as string)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="eye-outline" size={18} color="#00009e" />
                        </TouchableOpacity>
                      ) : null}

                      {guide.document_url ? (
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => Linking.openURL(guide.document_url as string)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="download-outline" size={18} color="#111827" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            );
          })
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 16,
  },
  introCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 8,
  },
  introHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  introIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  introContent: {
    flex: 1,
    minWidth: 0,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  introSubtitle: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
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
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  emptyStateCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    color: '#4b5563',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#E8A900',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: '#111827',
    fontWeight: '700',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    gap: 12,
  },
  listIconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  listMeta: {
    color: '#4b5563',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  listFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1f2937',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
