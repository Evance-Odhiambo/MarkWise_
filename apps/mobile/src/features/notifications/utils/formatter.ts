import { Notification } from '../types/notification';

export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const getNotificationIcon = (type: Notification['type']) => {
  const icons: Record<NonNullable<Notification['type']>, string> = {
    attendance: '✓',
    unit: '📚',
    system: '⚙️',
    announcement: '📢',
  };
  return icons[type];
};

export const getPriorityColor = (priority: Notification['priority']) => {
  const colors: Record<NonNullable<Notification['priority']>, string> = {
    low: '#94a3b8',
    medium: '#3b82f6',
    high: '#ef4444',
  };
  return colors[priority];
};
