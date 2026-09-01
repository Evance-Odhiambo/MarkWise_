import { useCallback, useEffect, useState } from 'react';
import { Notification, NotificationRole } from '../types/notification';
import { useAuth } from '../../auth/context/AuthContext';
import { API_BASE_URL } from '../../../shared/constants';
import { onNotificationsChanged } from '../notificationEvents';

export interface BinNotification extends Notification {
  daysRemaining: number;
}

const mapBinNotification = (
  item: unknown,
  fallbackRole: NotificationRole,
): BinNotification => {
  const notification = item as {
    id: string;
    title: string;
    message?: string;
    type?: Notification['type'];
    userType?: NotificationRole;
    read?: boolean;
    createdAt: string;
    data?: Record<string, unknown>;
    daysRemaining?: number;
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
    daysRemaining: notification.daysRemaining ?? 0,
  };
};

/**
 * Deleted notifications — a separate, low-traffic dataset from the main
 * useNotifications() list, so a plain per-instance fetch (no shared cache)
 * is fine here. Still listens for onNotificationsChanged so a delete made
 * from the main list screen shows up here without a manual pull-to-refresh.
 */
export const useNotificationsBin = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<BinNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/bin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok)
        throw new Error(`Bin request failed (${response.status})`);
      const body = (await response.json()) as { notifications?: unknown[] };
      setItems(
        (body.notifications || []).map(item =>
          mapBinNotification(item, 'both'),
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load the bin',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    const subscription = onNotificationsChanged(() => void refetch());
    return () => subscription.remove();
  }, [refetch]);

  const restore = useCallback(
    async (id: string) => {
      setItems(prev => prev.filter(n => n.id !== id));
      if (token)
        await fetch(
          `${API_BASE_URL}/notifications/${encodeURIComponent(id)}/restore`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
        ).catch(() => undefined);
    },
    [token],
  );

  const deleteForever = useCallback(
    async (id: string) => {
      setItems(prev => prev.filter(n => n.id !== id));
      if (token)
        await fetch(
          `${API_BASE_URL}/notifications/${encodeURIComponent(id)}/delete-permanent`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
        ).catch(() => undefined);
    },
    [token],
  );

  return { items, loading, error, refetch, restore, deleteForever };
};
