import { useCallback, useEffect, useMemo, useState } from 'react';
import { Notification, NotificationRole } from '../types/notification';
import { useAuth } from '../../auth/context/AuthContext';
import { API_BASE_URL } from '../../../shared/constants';
import {
  emitNotificationsChanged,
  onNotificationReceived,
  onNotificationsChanged,
} from '../notificationEvents';

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

  // Shared by both delete paths below — removes ids from this instance's
  // own state and from the shared cache so a newly-mounted instance (or one
  // that hasn't refetched yet) doesn't briefly show an already-deleted item.
  const removeLocally = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setAllNotifications(prev => prev.filter(n => !idSet.has(n.id)));
    if (sharedCache)
      sharedCache = {
        ...sharedCache,
        notifications: sharedCache.notifications.filter(n => !idSet.has(n.id)),
      };
  }, []);

  const deleteNotification = useCallback(
    async (id: string) => {
      removeLocally([id]);
      if (token)
        await fetch(
          `${API_BASE_URL}/notifications/${encodeURIComponent(id)}/delete`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
        ).catch(() => undefined);
      emitNotificationsChanged();
    },
    [removeLocally, token],
  );

  const deleteNotifications = useCallback(
    async (ids?: string[]) => {
      // Omitting ids deletes everything currently loaded in this instance —
      // the "select all" / "delete all" path.
      const targetIds = ids ?? allNotifications.map(n => n.id);
      removeLocally(targetIds);
      if (token)
        await fetch(`${API_BASE_URL}/notifications/delete-bulk`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(ids ? { ids } : {}),
        }).catch(() => undefined);
      emitNotificationsChanged();
    },
    [allNotifications, removeLocally, token],
  );

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

  useEffect(() => {
    // A delete/restore from another mounted instance (e.g. the list screen,
    // while this instance is the tab badge) already updated sharedCache —
    // sync straight from it instead of firing a redundant network refetch.
    const subscription = onNotificationsChanged(() => {
      if (token && sharedCache?.token === token)
        setAllNotifications(sharedCache.notifications);
    });
    return () => subscription.remove();
  }, [token]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteNotifications,
    getNotificationById,
    refetch,
  };
};
