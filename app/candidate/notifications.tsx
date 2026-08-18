import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useNotifications } from '../../hooks/useNotifications';
import { debugDuplicateKeys, debugExactUuidInList } from '../../lib/debug-duplicate-keys';
import { formatDate } from '../../lib/jobs';

export default function CandidateNotificationsScreen() {
  const { notifications, loading, error, unreadCount, markAsRead, markAllAsRead, delete: deleteNotification, refresh } = useNotifications();

  debugDuplicateKeys('CandidateNotificationsScreen', 'notifications', notifications, (notification) => notification?.id);
  debugExactUuidInList('CandidateNotificationsScreen', 'notifications', notifications, (notification) => notification?.id, 'f4f29e28-f276-40e4-bbfa-553acd7cdf94');

  const getNotificationIcon = (type?: string | null) => {
    switch (type) {
      case 'admin':
        return 'megaphone-outline';
      case 'offre':
        return 'briefcase-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getTypeColor = (type?: string | null) => {
    switch (type) {
      case 'admin':
        return { bg: '#fef3c7', border: '#fbbf24', text: '#92400e' };
      case 'offre':
        return { bg: '#dbeafe', border: '#0284c7', text: '#0c4a6e' };
      default:
        return { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' };
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
        <TouchableOpacity style={styles.retryButton} onPress={() => refresh()}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllButton} onPress={() => markAllAsRead()}>
              <Ionicons name="checkmark-done" size={16} color="#ffffff" />
              <Text style={styles.markAllText}>Marquer</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subtitle}>Les actualités et messages liés à votre compte.</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor="#00009e" />}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptyText}>Vous êtes à jour.</Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map((notification, index) => {
              const typeColor = getTypeColor(notification.type);
              return (
                <View key={notification.id}>
                  <TouchableOpacity
                    style={[
                      styles.notificationListItem,
                      notification.is_read ? styles.notificationListItemRead : styles.notificationListItemUnread,
                    ]}
                    onPress={() => !notification.is_read && markAsRead(notification.id)}
                    activeOpacity={0.6}
                  >
                    <View style={styles.listItemContent}>
                      <View style={[styles.listIcon, { backgroundColor: typeColor.bg, borderColor: typeColor.border }]}>
                        <Ionicons name={getNotificationIcon(notification.type)} size={16} color={typeColor.text} />
                      </View>
                      <View style={styles.listItemText}>
                        <View style={styles.listItemTop}>
                          <Text style={styles.listItemTitle} numberOfLines={1}>
                            {notification.title ?? 'Notification'}
                          </Text>
                          {!notification.is_read && <View style={styles.unreadDot} />}
                        </View>
                        <Text style={styles.listItemBody} numberOfLines={1}>
                          {notification.content ?? 'Aucun détail disponible.'}
                        </Text>
                        <Text style={styles.listItemDate}>{formatDate(notification.created_at ?? '')}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.listDeleteButton}
                      onPress={() => deleteNotification(notification.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={16} color="#64748b" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  {index < notifications.length - 1 && <View style={styles.listDivider} />}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  markAllButton: {
    backgroundColor: '#00009e',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  markAllText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 0,
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingVertical: 0,
    paddingBottom: 28,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4f8',
  },
  loadingText: {
    marginTop: 12,
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4f8',
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
    color: '#6b7280',
    textAlign: 'center',
    fontSize: 14,
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: '#00009e',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  emptyContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  notificationsList: {
    backgroundColor: '#ffffff',
    marginHorizontal: 0,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  notificationListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  notificationListItemUnread: {
    backgroundColor: '#f0f9ff',
  },
  notificationListItemRead: {
    backgroundColor: '#ffffff',
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  listItemText: {
    flex: 1,
    justifyContent: 'center',
  },
  listItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  listItemTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  listItemBody: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 4,
  },
  listItemDate: {
    color: '#9ca3af',
    fontSize: 11,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
    flexShrink: 0,
  },
  listDeleteButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  listDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
});
