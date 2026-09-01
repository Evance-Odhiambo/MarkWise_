import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Notification } from '../types/notification';
import {
  formatTimestamp,
  getNotificationIcon,
  getPriorityColor,
  truncateWords,
} from '../utils/formatter';
import { useTheme } from '../../theme/context/ThemeContext';

interface NotificationItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
}) => {
  const { isDark } = useTheme();
  const { title, body, type, priority, isRead, timestamp } = notification;

  const borderColor = isRead ? 'border-transparent' : 'border-emerald-500';
  const bgColor = isDark ? 'bg-slate-900' : 'bg-white';
  const titleColor = isDark ? 'text-slate-100' : 'text-slate-900';
  const bodyColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const priorityColor = getPriorityColor(priority);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(notification)}
      className={`mb-3 p-4 rounded-2xl border-l-4 shadow-sm ${bgColor} ${borderColor}`}
    >
      <View className="flex-row items-start gap-3">
        <View
          className="w-10 h-10 rounded-xl items-center justify-center flex-none"
          style={{ backgroundColor: `${priorityColor}20` }}
        >
          <Text className="text-xl">{getNotificationIcon(type)}</Text>
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text
              className={`text-sm font-semibold ${titleColor}`}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              className={`text-xs ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              {formatTimestamp(timestamp)}
            </Text>
          </View>

          <Text
            className={`text-sm font-extrabold mt-1 ${bodyColor}`}
            numberOfLines={2}
          >
            {/* A shorter cap than the default deliberately cuts off before
                the reason clause (see notifyAttendanceOutcome, which puts it
                last) — the preview says what unit this is about, not why it
                was accepted or rejected; that's worth opening for. */}
            {truncateWords(body, 6)}
          </Text>
        </View>

        {!isRead && (
          <View className="w-2 h-2 rounded-full bg-emerald-500 flex-none" />
        )}
      </View>
    </TouchableOpacity>
  );
};

export default NotificationItem;
