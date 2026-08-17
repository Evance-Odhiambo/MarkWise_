import React from 'react';
import { View, Text } from 'react-native';
import { Notification } from '../types/notification';
import NotificationItem from './NotificationItem';

interface NotificationListProps {
  notifications: Notification[];
  onNotificationPress: (notification: Notification) => void;
  loading?: boolean;
}

const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onNotificationPress,
  loading = false,
}) => {
  if (loading) {
    return (
      <View className="py-4">
        {[...Array(3)].map((_, i) => (
          <View
            key={i}
            className="mb-3 h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"
          />
        ))}
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View className="py-4 items-center">
        <Text className="text-slate-500 dark:text-slate-400 text-sm">
          No notifications yet.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onPress={onNotificationPress}
        />
      ))}
    </View>
  );
};

export default NotificationList;
