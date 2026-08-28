import React from 'react';
import { View, Text } from 'react-native';
import { Bell } from 'lucide-react-native';

const EmptyState: React.FC = () => {
  return (
    <View className="items-center py-12 px-6">
      <View className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mb-4">
        <Bell size={24} color="#94a3b8" />
      </View>
      <Text className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">
        All caught up
      </Text>
      <Text className="text-sm text-slate-500 dark:text-slate-400 text-center">
        You have no unread notifications. Check back later for updates.
      </Text>
    </View>
  );
};

export default EmptyState;
