import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../auth/context/AuthContext';
import { useTheme } from '../../../theme/context/ThemeContext';

export default function StudentHomeScreen() {
  const { isDark } = useTheme();
  const { session } = useAuth();
  const background = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const surface = isDark
    ? 'bg-slate-900 border-slate-800'
    : 'bg-white border-slate-200';
  const title = isDark ? 'text-white' : 'text-slate-900';
  const secondary = isDark ? 'text-slate-300' : 'text-slate-600';

  return (
    <SafeAreaView className={`flex-1 ${background}`}>
      <View className="px-5 pt-6">
        <Text className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
          MarkWise
        </Text>
        <Text className={`mt-2 text-3xl font-extrabold ${title}`}>
          Welcome back
        </Text>
        <Text className={`mt-2 text-base ${secondary}`}>
          {session?.name || 'Student'}
        </Text>
        <Text className={`mt-1 text-sm ${secondary}`}>
          {session?.course || 'Your student workspace'}
        </Text>
        <View className={`mt-8 rounded-3xl border p-5 ${surface}`}>
          <Text className={`text-lg font-bold ${title}`}>
            Your attendance progress
          </Text>
          <Text className={`mt-2 text-sm leading-5 ${secondary}`}>
            Open the Attendance tab to view your health, unit analysis, history,
            and marking options.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
