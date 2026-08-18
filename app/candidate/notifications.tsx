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
import { fetchCandidateNotifications, markNotificationAsRead, type NotificationRow } from '../../lib/notifications';
import { debugDuplicateKeys, debugExactUuidInList } from '../../lib/debug-duplicate-keys';

export default function CandidateNotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchCandidateNotifications(50);
      setNotifications(data);
    } catch (loadError: any) {
      setError('Impossible de charger les notifications pour le moment.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
  };

  debugDuplicateKeys('CandidateNotificationsScreen', 'notifications', notifications, (notification) => notification?.id);
  debugExactUuidInList('CandidateNotificationsScreen', 'notifications', notifications, (notification) => notification?.id, 'f4f29e28-f276-40e4-bbfa-553acd7cdf94');

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) => (item.id === notificationId ? { ...item, is_read: true, status: 'masked' } : item))
      );
    } catch (_error) {
      // no-op: keep UI stable and retry later
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00009e" />
        <Text style={styles.loadingText}>Chargement des notifications...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyTitle}>Notifications indisponibles</Text>
        <Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadNotifications()}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>Les actualités et messages liés à votre compte.</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00009e" />}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptyText}>Vous êtes à jour.</Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[styles.notificationCard, notification.is_read ? styles.notificationRead : styles.notificationUnread]}
              onPress={() => handleMarkAsRead(notification.id)}
              activeOpacity={0.9}
            >
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>{notification.title ?? 'Notification'}</Text>
                {!notification.is_read ? <View style={styles.dot} /> : null}
              </View>
              <Text style={styles.notificationBody}>{notification.content ?? 'Aucun détail disponible.'}</Text>
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
  notificationCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  notificationUnread: {
    borderColor: '#dbeafe',
    backgroundColor: '#eff6ff',
  },
  notificationRead: {
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  notificationTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  notificationBody: {
    color: '#475569',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
});
