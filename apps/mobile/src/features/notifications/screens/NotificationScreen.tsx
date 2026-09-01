import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Trash2, X } from 'lucide-react-native';
import { NotificationStackParamList } from '../../../navigation/types';
import { useTheme } from '../../theme/context/ThemeContext';
import { useResponsive } from '../../theme/hooks/useResponsive';
import { Notification, NotificationRole } from '../types/notification';
import NotificationList from '../components/NotificationList';
import { useNotifications } from '../hooks/useNotifications';

type Props = NativeStackScreenProps<
  NotificationStackParamList,
  'NotificationList'
> & {
  role?: NotificationRole;
};

const NotificationsScreen = ({ navigation, role }: Props) => {
  const { isDark } = useTheme();
  const { isTablet } = useResponsive();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAllAsRead,
    deleteNotification,
    deleteNotifications,
    refetch,
  } = useNotifications(role ?? undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const handlePress = useCallback(
    (notification: Notification) => {
      navigation.navigate('NotificationDetail', {
        notificationId: notification.id,
      });
    },
    [navigation],
  );

  const handleMarkAllRead = useCallback(() => {
    void markAllAsRead();
  }, [markAllAsRead]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Doubles as the long-press "start selecting" handler and the
  // tap-while-selecting "toggle this one" handler — both just mean "flip
  // this id's selection," entering/leaving selection mode based on whether
  // anything ends up selected.
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectionMode(next.size > 0);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(notifications.map(n => n.id)));
  }, [notifications]);

  const cancelSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    void deleteNotifications(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [deleteNotifications, selectedIds]);

  const handleDeleteOne = useCallback(
    (id: string) => {
      void deleteNotification(id);
    },
    [deleteNotification],
  );

  const screenClasses = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const headerClasses = isDark
    ? 'bg-slate-900 border-slate-800'
    : 'bg-white border-slate-200';
  const titleClasses = isDark ? 'text-white' : 'text-slate-900';
  const secondaryTextClasses = isDark ? 'text-slate-400' : 'text-slate-500';
  const allSelected =
    selectedIds.size > 0 && selectedIds.size === notifications.length;

  return (
    <SafeAreaView className={`flex-1 ${screenClasses}`}>
      <View
        className={`px-${isTablet ? '8' : '5'} py-6 border-b ${headerClasses}`}
      >
        {selectionMode ? (
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={cancelSelection}
              className="flex-row items-center gap-2"
            >
              <X size={20} color={isDark ? '#f1f5f9' : '#0f172a'} />
              <Text className={`text-lg font-bold ${titleClasses}`}>
                {selectedIds.size} selected
              </Text>
            </TouchableOpacity>
            <View className="flex-row items-center gap-4">
              <Text
                className="text-sm font-semibold text-emerald-600"
                onPress={allSelected ? cancelSelection : selectAll}
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </Text>
              <TouchableOpacity onPress={handleDeleteSelected}>
                <Trash2 size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View className="flex-row items-center justify-between">
              <Text className={`text-2xl font-bold ${titleClasses}`}>
                Notifications
              </Text>
              <View className="flex-row items-center gap-4">
                {unreadCount > 0 && (
                  <Text
                    className="text-sm font-semibold text-emerald-600"
                    onPress={handleMarkAllRead}
                  >
                    Mark all read
                  </Text>
                )}
                <TouchableOpacity
                  onPress={() => navigation.navigate('NotificationBin')}
                  accessibilityLabel="Bin"
                >
                  <Trash2 size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                </TouchableOpacity>
              </View>
            </View>
            {unreadCount > 0 && (
              <Text className={`text-sm mt-1 ${secondaryTextClasses}`}>
                {unreadCount} unread
              </Text>
            )}
          </>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: isTablet ? 32 : 20,
          paddingTop: 16,
          paddingBottom: 20,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View>
          {error && (
            <Text className="mb-3 text-center text-sm text-red-600">
              {error}
            </Text>
          )}
          <NotificationList
            notifications={notifications}
            onNotificationPress={handlePress}
            onDelete={handleDeleteOne}
            onLongPress={toggleSelect}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            loading={loading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationsScreen;
