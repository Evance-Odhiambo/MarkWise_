import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NotificationStackParamList } from '../../../navigation/types';
import { useTheme } from '../../theme/context/ThemeContext';
import { useResponsive } from '../../theme/hooks/useResponsive';
import { Notification, NotificationRole } from '../types/notification';
import NotificationList from '../components/NotificationList';
import { useNotifications } from '../hooks/useNotifications';

type Props = NativeStackScreenProps<NotificationStackParamList, 'NotificationList'> & {
  role?: NotificationRole;
};

const NotificationsScreen = ({ navigation, role }: Props) => {
  const { isDark } = useTheme();
  const { isTablet } = useResponsive();
  const { notifications, unreadCount, markAllAsRead, refetch } = useNotifications(role ?? undefined);
  const [refreshing, setRefreshing] = useState(false);

  const handlePress = useCallback((notification: Notification) => {
    navigation.navigate('NotificationDetail', { notificationId: notification.id });
  }, [navigation]);

  const handleMarkAllRead = useCallback(() => {
    void markAllAsRead();
  }, [markAllAsRead]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const screenClasses = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const headerClasses = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const titleClasses = isDark ? 'text-white' : 'text-slate-900';
  const secondaryTextClasses = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <SafeAreaView className={`flex-1 ${screenClasses}`}>
      <View className={`px-${isTablet ? '8' : '5'} py-6 border-b ${headerClasses}`}>
        <View className="flex-row items-center justify-between">
          <Text className={`text-2xl font-bold ${titleClasses}`}>Notifications</Text>
          {unreadCount > 0 && (
            <Text
              className="text-sm font-semibold text-emerald-600"
              onPress={handleMarkAllRead}
            >
              Mark all read
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <Text className={`text-sm mt-1 ${secondaryTextClasses}`}>
            {unreadCount} unread
          </Text>
        )}
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className={`px-${isTablet ? '8' : '5'} pt-4`}>
          <NotificationList
            notifications={notifications}
            onNotificationPress={handlePress}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationsScreen;
