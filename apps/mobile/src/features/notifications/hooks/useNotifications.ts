import { useState, useCallback, useEffect } from 'react';
import { Notification, NotificationRole } from '../types/notification';


const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Attendance marked for CS203',
    body: 'Your attendance was successfully marked for Object Oriented Programming (CS203) on 15 Aug 2026 at 10:00 AM. Current attendance: 92%.',
    type: 'attendance',
    priority: 'low',
    role: 'student',
    isRead: false,
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    unitName: 'Object Oriented Programming CS203',
  },
  {
    id: '2',
    title: 'New announcement: Holiday on Friday',
    body: 'The university has announced a holiday on Friday 18th August 2026. All scheduled classes are cancelled. Please check your email for official communication.',
    type: 'announcement',
    priority: 'high',
    role: 'both',
    isRead: false,
    timestamp: new Date(Date.now() - 5 * 60 * 60000).toISOString(),
  },
  {
    id: '3',
    title: 'Unit registration deadline approaching',
    body: 'The deadline for unit registration for the next semester is 31st August 2026. Ensure all your units are registered.',
    type: 'system',
    priority: 'medium',
    role: 'student',
    isRead: true,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60000).toISOString(),
  },
  {
    id: '4',
    title: 'Attendance below threshold for MA101',
    body: 'Your attendance for Mathematics I (MA101) has dropped below 75%. Please attend the next scheduled class to improve your attendance.',
    type: 'attendance',
    priority: 'high',
    role: 'student',
    isRead: false,
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60000).toISOString(),
    unitName: 'Mathematics I MA101',
  },
  {
    id: '5',
    title: 'Attendance session started: CS203',
    body: 'An attendance session has been started for Object Oriented Programming (CS203). 24 students have marked attendance so far.',
    type: 'attendance',
    priority: 'medium',
    role: 'lecturer',
    isRead: false,
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    unitName: 'Object Oriented Programming CS203',
  },
  {
    id: '6',
    title: 'Weekly attendance report ready',
    body: 'Your weekly attendance report is available. 87% average attendance across all units.',
    type: 'system',
    priority: 'medium',
    role: 'lecturer',
    isRead: true,
    timestamp: new Date(Date.now() - 6 * 60 * 60000).toISOString(),
  },
];

const getFilteredNotifications = (
  notifications: Notification[],
  role: NotificationRole
): Notification[] => {
  return notifications.filter((n) => n.role === role || n.role === 'both');
};

export const useNotifications = (role?: NotificationRole) => {
  const [roleFilter, setRoleFilter] = useState<NotificationRole | undefined>(role);

  useEffect(() => {
    if (role) {
      setRoleFilter(role);
    }
  }, [role]);

  const [allNotifications, setAllNotifications] = useState<Notification[]>(mockNotifications);
  const [loading, setLoading] = useState(false);

  const notifications = getFilteredNotifications(allNotifications, roleFilter ?? 'both');
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = useCallback(async (id: string) => {
    setAllNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    setAllNotifications((prev) =>
      prev.map((n) =>
        n.role === roleFilter || n.role === 'both'
          ? { ...n, isRead: true }
          : n
      )
    );
  }, [roleFilter]);

  const getNotificationById = useCallback(
    (id: string): Notification | undefined => {
      return allNotifications.find((n) => n.id === id);
    },
    [allNotifications]
  );

  const refetch = useCallback(async () => {
    setLoading(true);
    await new Promise<void>((r) => setTimeout(() => r(), 800));
    setAllNotifications(mockNotifications);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    getNotificationById,
    refetch,
  };
};
