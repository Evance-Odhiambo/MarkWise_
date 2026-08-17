import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, ArrowRight, CheckCircle2, BellDot } from 'lucide-react-native';
import { useTheme } from '../../../theme/context/ThemeContext';

const LecturerHomeScreen = () => {
  const { isDark } = useTheme();

  const screenClasses = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const heroClasses = isDark ? 'bg-slate-900 border-slate-800' : 'bg-emerald-50 border-emerald-100';
  const cardClasses = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100';
  const titleClasses = isDark ? 'text-white' : 'text-slate-900';
  const secondaryTextClasses = isDark ? 'text-slate-300' : 'text-slate-600';
  const subduedTextClasses = isDark ? 'text-slate-400' : 'text-slate-500';
  const accentTextClasses = isDark ? 'text-emerald-300' : 'text-emerald-700';
  const dividerClasses = isDark ? 'border-slate-700' : 'border-slate-200';

  return (
    <SafeAreaView className={`flex-1 ${screenClasses}`}>
      <View className={`px-5 pb-8 pt-5 rounded-b-[32px] border-b ${heroClasses}`}>
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
              Dr. Felix Orati
            </Text>
          </View>

          <View className="flex-row items-center gap-3 flex-none ml-3">
            <BellDot size={20} color={isDark ? '#94a3b8' : '#64748b'} />
          </View>
        </View>

        <View className={`rounded-2xl p-4 shadow-sm border ${cardClasses}`}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className={`text-xs uppercase tracking-[0.18em] ${subduedTextClasses}`}>
                Active units
              </Text>
              <Text className={`mt-1 text-base font-semibold ${titleClasses}`}>
                6 Units
              </Text>
            </View>

            <View className="items-end">
              <Text className={`text-xs uppercase tracking-[0.18em] ${subduedTextClasses}`}>
                Attendance
              </Text>
              <Text className={`mt-1 text-base font-semibold ${accentTextClasses}`}>
                96%
              </Text>
            </View>
          </View>

          <View className={`mt-4 flex-row items-center justify-between border-t pt-4 ${dividerClasses}`}>
            <View className="flex-row items-center gap-2">
              <CheckCircle2 size={18} color="#10b981" />
              <Text className={`text-sm ${secondaryTextClasses}`}>Classes today</Text>
            </View>

            <View className="flex-row items-center gap-2">
              <Text className={`text-lg font-bold ${titleClasses}`}>4</Text>
              <ArrowRight size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LecturerHomeScreen;
