export type NotificationType =
  | 'attendance'
  | 'unit'
  | 'system'
  | 'announcement';

export type NotificationPriority = 'low' | 'medium' | 'high';

export type NotificationRole = 'student' | 'lecturer' | 'both';

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  priority: NotificationPriority;
  role: NotificationRole;
  isRead: boolean;
  timestamp: string;
  unitId?: string;
  unitName?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
  hasMore: boolean;
}

export type NotificationFilter = 'all' | 'unread' | 'read';
