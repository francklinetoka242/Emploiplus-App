import { supabase } from './supabase';

export type NotificationRow = {
  id: string;
  user_id?: string | null;
  type?: string | null;
  title?: string | null;
  content?: string | null;
  body?: string | null;
  status?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
  link?: string | null;
  read_at?: string | null;
};

export async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Session expirée. Veuillez vous reconnecter.');
  }

  return user.id;
}

export async function fetchCandidateNotifications(limit = 50): Promise<NotificationRow[]> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, body, content, status, is_read, created_at, link, read_at')
    .eq('status', 'active')
    .in('type', ['admin', 'offre'])
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const result = (data ?? []) as NotificationRow[];
  return normalizeNotifications(result);
}

function normalizeNotifications(notifications: NotificationRow[]): NotificationRow[] {
  return notifications.map((notif) => ({
    ...notif,
    content: notif.content || notif.body,
  }));
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) {
    throw error;
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    throw error;
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    throw error;
  }
}

export async function subscribeToCandidateNotifications(
  onChange: (event: 'INSERT' | 'UPDATE' | 'DELETE', notification: NotificationRow) => void
) {
  const userId = await getCurrentUserId();

  const channel = supabase.channel(`candidate-notifications-${userId}`);

  channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      onChange('INSERT', payload.new as NotificationRow);
    }
  );

  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      onChange('UPDATE', payload.new as NotificationRow);
    }
  );

  channel.on(
    'postgres_changes',
    {
      event: 'DELETE',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      onChange('DELETE', payload.old as NotificationRow);
    }
  );

  await channel.subscribe();

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
