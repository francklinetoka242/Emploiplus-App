import { useCallback, useEffect, useState } from 'react';
import {
    deleteNotification,
    fetchCandidateNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    subscribeToCandidateNotifications,
    type NotificationRow,
} from '../lib/notifications';

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchCandidateNotifications(50);
      setNotifications(data);
      const unread = data.filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (loadError: any) {
      setError('Impossible de charger les notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    let subscription: ReturnType<typeof subscribeToCandidateNotifications> | null = null;

    const setupSubscription = async () => {
      try {
        subscription = await subscribeToCandidateNotifications((event, notification) => {
          if (event === 'INSERT') {
            setNotifications((prev) => [notification, ...prev]);
            if (!notification.is_read) {
              setUnreadCount((prev) => prev + 1);
            }
          } else if (event === 'UPDATE') {
            setNotifications((prev) =>
              prev.map((n) => (n.id === notification.id ? notification : n))
            );
            if (notification.is_read) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          } else if (event === 'DELETE') {
            setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
            if (!notification.is_read) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          }
        });
      } catch (_err) {
        // Subscription failed, but we already have data loaded
      }
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [loadNotifications]);

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await markNotificationAsRead(notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (_err) {
        // Silently fail to keep UI stable
      }
    },
    []
  );

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    } catch (_err) {
      // Silently fail to keep UI stable
    }
  }, []);

  const handleDelete = useCallback(async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      setNotifications((prev) => {
        const notification = prev.find((n) => n.id === notificationId);
        if (notification && !notification.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        return prev.filter((n) => n.id !== notificationId);
      });
    } catch (_err) {
      // Silently fail to keep UI stable
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchCandidateNotifications(50);
      setNotifications(data);
      const unread = data.filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (refreshError: any) {
      setError('Impossible de rafraîchir les notifications.');
    }
  }, []);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    delete: handleDelete,
    refresh: handleRefresh,
  };
}
