import React, { useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Swipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Trash2, CheckCircle2, Circle } from 'lucide-react-native';
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
  onDelete: (id: string) => void;
  onLongPress: (id: string) => void;
  selectionMode?: boolean;
  selected?: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onDelete,
  onLongPress,
  selectionMode = false,
  selected = false,
}) => {
  const { isDark } = useTheme();
  const { title, body, type, priority, isRead, timestamp } = notification;
  const swipeableRef = useRef<SwipeableMethods>(null);

  const borderColor = isRead ? 'border-transparent' : 'border-emerald-500';
  const bgColor = selected
    ? isDark
      ? 'bg-emerald-500/10'
      : 'bg-emerald-50'
    : isDark
    ? 'bg-slate-900'
    : 'bg-white';
  const titleColor = isDark ? 'text-slate-100' : 'text-slate-900';
  const bodyColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const priorityColor = getPriorityColor(priority);

  const renderRightActions = () => (
    <TouchableOpacity
      onPress={() => {
        swipeableRef.current?.close();
        onDelete(notification.id);
      }}
      activeOpacity={0.8}
      className="mb-3 ml-2 w-20 items-center justify-center rounded-2xl bg-red-500"
    >
      <Trash2 size={20} color="#ffffff" />
      <Text className="mt-1 text-xs font-bold text-white">Delete</Text>
    </TouchableOpacity>
  );

  const row = (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() =>
        selectionMode ? onLongPress(notification.id) : onPress(notification)
      }
      onLongPress={() => onLongPress(notification.id)}
      className={`mb-3 p-4 rounded-2xl border-l-4 shadow-sm ${bgColor} ${borderColor}`}
    >
      <View className="flex-row items-start gap-3">
        {selectionMode ? (
          <View className="h-10 w-10 items-center justify-center flex-none">
            {selected ? (
              <CheckCircle2 size={24} color="#10b981" />
            ) : (
              <Circle size={24} color={isDark ? '#475569' : '#cbd5e1'} />
            )}
          </View>
        ) : (
          <View
            className="w-10 h-10 rounded-xl items-center justify-center flex-none"
            style={{ backgroundColor: `${priorityColor}20` }}
          >
            <Text className="text-xl">{getNotificationIcon(type)}</Text>
          </View>
        )}

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

        {!selectionMode && !isRead && (
          <View className="w-2 h-2 rounded-full bg-emerald-500 flex-none" />
        )}
      </View>
    </TouchableOpacity>
  );

  // Swipe is disabled in selection mode — a horizontal swipe gesture would
  // otherwise fight with tapping a row to toggle its checkbox.
  if (selectionMode) return row;

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      {row}
    </Swipeable>
  );
};

export default NotificationItem;
