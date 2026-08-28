import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, ArrowRight, CheckCircle2, BellDot } from 'lucide-react-native';
import { useTheme } from '../../../theme/context/ThemeContext';
import { useAuth } from '../../../auth/context/AuthContext';

const LecturerHomeScreen = () => {
  const { isDark } = useTheme();
  const { session } = useAuth();

  const screenClasses = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const heroClasses = isDark
    ? 'bg-slate-900 border-slate-800'
    : 'bg-emerald-50 border-emerald-100';
  const cardClasses = isDark
    ? 'bg-slate-800 border-slate-700'
    : 'bg-white border-emerald-100';
  const titleClasses = isDark ? 'text-white' : 'text-slate-900';
  const accentTextClasses = isDark ? 'text-emerald-300' : 'text-emerald-700';

  return (
    <SafeAreaView className={`flex-1 ${screenClasses}`}>
      <View
        className={`px-5 pb-8 pt-5 rounded-b-[32px] border-b ${heroClasses}`}
      >
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1 min-w-0">
            <Text
              className={`text-xs font-semibold uppercase tracking-[0.2em] ${accentTextClasses}`}
              numberOfLines={1}
            >
              Welcome back
            </Text>
            <Text
              className={`mt-1 text-xl font-bold ${titleClasses}`}
              numberOfLines={1}
            >
              {session?.name || 'Lecturer'}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LecturerHomeScreen;
