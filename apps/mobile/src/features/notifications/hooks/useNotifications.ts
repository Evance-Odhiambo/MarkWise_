import { useCallback, useEffect, useMemo, useState } from 'react';
import { Notification, NotificationRole } from '../types/notification';
import { useAuth } from '../../auth/context/AuthContext';
import { API_BASE_URL } from '../../../shared/constants';
import { onNotificationReceived } from '../notificationEvents';

const getFilteredNotifications = (
  notifications: Notification[],
  role: NotificationRole,
): Notification[] => {
  return notifications.filter(n => n.role === role || n.role === 'both');
};

// useNotifications is mounted more than once at a time by design (the tab
// bar's unread badge and the notification list screen each hold their own
// instance) — without sharing state, each one independently fetches
// /notifications on mount, so a single screen visit could trigger it twice
// or more. A module-level cache lets every instance render the last-known
// list immediately (no loading flash on remount) while a fresh fetch runs in
// the background, and an in-flight-request lock means concurrent instances
// (or a push notification waking several at once) share one network call
// instead of firing one each — the same pattern already used for BLE
// mappings and session refresh elsewhere in this app.
let sharedCache: { token: string; notifications: Notification[] } | null =
  null;
let inflightFetch: Promise<Notification[]> | null = null;

const mapNotification = (
  item: unknown,
  fallbackRole: NotificationRole,
): Notification => {
  const notification = item as {
    id: string;
    title: string;
    message?: string;
    type?: Notification['type'];
    userType?: NotificationRole;
    read?: boolean;
    createdAt: string;
    data?: Record<string, unknown>;
  };
  return {
    id: notification.id,
    title: notification.title,
    body: notification.message || '',
    type: notification.type || 'system',
    priority: notification.data?.outcome === 'rejected' ? 'high' : 'low',
    role: notification.userType || fallbackRole,
    isRead: Boolean(notification.read),
    timestamp: notification.createdAt,
    metadata: notification.data,
  };
};

const fetchNotifications = async (
  token: string,
  fallbackRole: NotificationRole,
): Promise<Notification[]> => {
  if (inflightFetch) return inflightFetch;
  inflightFetch = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok)
        throw new Error(`Notifications request failed (${response.status})`);
      const body = (await response.json()) as { notifications?: unknown[] };
      const mapped = (body.notifications || []).map(item =>
        mapNotification(item, fallbackRole),
      );
      sharedCache = { token, notifications: mapped };
      return mapped;
    } finally {
      inflightFetch = null;
    }
  })();
  return inflightFetch;
};

export const useNotifications = (role?: NotificationRole) => {
  const { token } = useAuth();
  const [roleFilter, setRoleFilter] = useState<NotificationRole | undefined>(
    role,
  );

  useEffect(() => {
    if (role) {
      setRoleFilter(role);
    }
  }, [role]);

  const [allNotifications, setAllNotifications] = useState<Notification[]>(
    () => (token && sharedCache?.token === token ? sharedCache.notifications : []),
  );
  const [loading, setLoading] = useState(
    () => !(token && sharedCache?.token === token),
  );
  const [error, setError] = useState<string | null>(null);

  const notifications = useMemo(
    () => getFilteredNotifications(allNotifications, roleFilter ?? 'both'),
    [allNotifications, roleFilter],
  );
  const unreadCount = useMemo(
    () => notifications.filter(n => !n.isRead).length,
    [notifications],
  );

  const markAsRead = useCallback(
    async (id: string) => {
      if (token)
        await fetch(
          `${API_BASE_URL}/notifications/${encodeURIComponent(id)}/read`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
        ).catch(() => undefined);
      setAllNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n)),
      );
    },
    [token],
  );

  const markAllAsRead = useCallback(async () => {
    if (token)
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    setAllNotifications(prev =>
      prev.map(n =>
        n.role === roleFilter || n.role === 'both' ? { ...n, isRead: true } : n,
      ),
    );
  }, [roleFilter, token]);

  const getNotificationById = useCallback(
    (id: string): Notification | undefined => {
      return allNotifications.find(n => n.id === id);
    },
    [allNotifications],
  );

  const refetch = useCallback(async () => {
    if (!token) {
      setAllNotifications([]);
      setLoading(false);
      return;
    }
    // Only show the loading state if this instance has nothing cached to
    // show in the meantime — a background refresh (e.g. triggered by a push
    // notification arriving) shouldn't blank the list while it runs.
    if (allNotifications.length === 0) setLoading(true);
    setError(null);
    try {
      const mapped = await fetchNotifications(token, roleFilter ?? 'both');
      setAllNotifications(mapped);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load notifications',
      );
    } finally {
      setLoading(false);
    }
  }, [allNotifications.length, roleFilter, token]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    const subscription = onNotificationReceived(() => void refetch());
    return () => subscription.remove();
  }, [refetch]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    getNotificationById,
    refetch,
  };
};
