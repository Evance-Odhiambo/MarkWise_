import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react-native';
import { NotificationStackParamList } from '../../../navigation/types';
import { useTheme } from '../../theme/context/ThemeContext';
import { useResponsive } from '../../theme/hooks/useResponsive';
import { formatTimestamp, getNotificationIcon } from '../utils/formatter';
import { useNotificationsBin } from '../hooks/useNotificationsBin';

type Props = NativeStackScreenProps<NotificationStackParamList, 'NotificationBin'>;

const NotificationBinScreen = ({ navigation }: Props) => {
  const { isDark } = useTheme();
  const { isTablet } = useResponsive();
  const { items, loading, restore, deleteForever } = useNotificationsBin();

  const screenClasses = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const headerClasses = isDark
    ? 'bg-slate-900 border-slate-800'
    : 'bg-white border-slate-200';
  const titleClasses = isDark ? 'text-white' : 'text-slate-900';
  const bodyClasses = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardClasses = isDark
    ? 'border-slate-800 bg-slate-900'
    : 'border-slate-200 bg-white';

  return (
    <SafeAreaView className={`flex-1 ${screenClasses}`}>
      <View
        className={`flex-row items-center px-${
          isTablet ? '8' : '5'
        } py-6 border-b ${headerClasses}`}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ArrowLeft size={22} color={isDark ? '#f1f5f9' : '#0f172a'} />
        </TouchableOpacity>
        <View>
          <Text className={`text-xl font-bold ${titleClasses}`}>Bin</Text>
          <Text className={`text-xs ${bodyClasses}`}>
            Deleted notifications are removed for good after 30 days
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: isTablet ? 32 : 20,
          paddingTop: 16,
          paddingBottom: 20,
          flexGrow: 1,
        }}
      >
        {loading ? (
          <View className="py-4">
            {[...Array(3)].map((_, i) => (
              <View
                key={i}
                className="mb-3 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse"
              />
            ))}
          </View>
        ) : items.length === 0 ? (
          <View className="items-center py-10">
            <Text className={`text-sm ${bodyClasses}`}>Bin is empty.</Text>
          </View>
        ) : (
          items.map(item => (
            <View
              key={item.id}
              className={`mb-3 flex-row items-start gap-3 rounded-2xl border p-4 ${cardClasses}`}
            >
              <Text className="text-xl">{getNotificationIcon(item.type)}</Text>
              <View className="flex-1">
                <Text
                  className={`text-sm font-semibold ${titleClasses}`}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text className={`mt-1 text-xs ${bodyClasses}`} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text className="mt-2 text-xs font-semibold text-amber-600">
                  {item.daysRemaining <= 0
                    ? 'Deletes today'
                    : `Deletes in ${item.daysRemaining}d`}
                  {' · '}
                  {formatTimestamp(item.timestamp)}
                </Text>
              </View>
              <View className="items-center gap-3">
                <TouchableOpacity
                  onPress={() => void restore(item.id)}
                  accessibilityLabel="Restore"
                >
                  <RotateCcw size={18} color="#10b981" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void deleteForever(item.id)}
                  accessibilityLabel="Delete forever"
                >
                  <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationBinScreen;
