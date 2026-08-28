import { useState, useCallback, useEffect } from 'react';
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

  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const notifications = getFilteredNotifications(
    allNotifications,
    roleFilter ?? 'both',
  );
  const unreadCount = notifications.filter(n => !n.isRead).length;

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
    setLoading(true);
    setError(null);
    try {
      if (!token) {
        setAllNotifications([]);
        return;
      }
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok)
        throw new Error(`Notifications request failed (${response.status})`);
      const body = (await response.json()) as { notifications?: unknown[] };
      setAllNotifications(
        (body.notifications || []).map(item => {
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
            priority:
              notification.data?.outcome === 'rejected' ? 'high' : 'low',
            role: notification.userType || roleFilter || 'both',
            isRead: Boolean(notification.read),
            timestamp: notification.createdAt,
            metadata: notification.data,
          };
        }),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load notifications',
      );
    } finally {
      setLoading(false);
    }
  }, [roleFilter, token]);

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
