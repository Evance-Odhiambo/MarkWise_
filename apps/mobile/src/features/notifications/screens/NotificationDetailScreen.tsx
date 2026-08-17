import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NotificationStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../features/theme/context/ThemeContext';
import { useResponsive } from '../../../features/theme/hooks/useResponsive';
import { useNotifications } from '../hooks/useNotifications';
import { formatTimestamp, getNotificationIcon, getPriorityColor } from '../utils/formatter';

type Props = NativeStackScreenProps<NotificationStackParamList, 'NotificationDetail'>;

const NotificationDetailScreen = ({ route, navigation }: Props) => {
  const { notificationId } = route.params;
  const { isDark } = useTheme();
  const { isTablet } = useResponsive();
  const { getNotificationById, markAsRead } = useNotifications();
  const notification = getNotificationById(notificationId);

  useEffect(() => {
    if (notification && !notification.isRead) {
      void markAsRead(notification.id);
    }
  }, [notification, markAsRead]);

  if (!notification) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-slate-950' : 'bg-slate-50'} items-center justify-center`}>
        <Text className="text-slate-500">Notification not found</Text>
      </SafeAreaView>
    );
  }

  const { title, body, type, priority, timestamp, unitName } = notification;
  const priorityColor = getPriorityColor(priority);
  const icon = getNotificationIcon(type);

  const screenClasses = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const cardClasses = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const titleClasses = isDark ? 'text-white' : 'text-slate-900';
  const bodyTextClasses = isDark ? 'text-slate-300' : 'text-slate-600';
  const metaTextClasses = isDark ? 'text-slate-400' : 'text-slate-400';

  return (
    <SafeAreaView className={`flex-1 ${screenClasses}`}>
      <View className={`px-${isTablet ? '8' : '5'} py-6 border-b ${cardClasses}`}>
        <Text className={`text-xl font-bold ${titleClasses}`}>Details</Text>
      </View>

      <ScrollView className="flex-1">
        <View className={`px-${isTablet ? '8' : '5'} py-6`}>
          <View className="flex-row items-start gap-4 mb-6">
            <View
              className="w-12 h-12 rounded-xl items-center justify-center flex-none"
              style={{ backgroundColor: `${priorityColor}20` }}
            >
              <Text className="text-2xl">{icon}</Text>
            </View>
            <View className="flex-1">
              <Text className={`text-2xl font-bold ${titleClasses} mb-2`}>
                {title}
              </Text>
              <Text className={`text-sm ${metaTextClasses}`}>
                {formatTimestamp(timestamp)}
              </Text>
              {unitName && (
                <Text className={`text-sm ${metaTextClasses} mt-1`}>
                  Unit: {unitName}
                </Text>
              )}
            </View>
          </View>

          <View className={`p-5 rounded-2xl ${cardClasses} shadow-sm`}>
            <Text className={`text-base leading-relaxed ${bodyTextClasses}`}>
              {body}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationDetailScreen;
