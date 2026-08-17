import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, BellDot } from 'lucide-react-native';
import { useTheme } from '../../../theme/context/ThemeContext';

const StudentHomeScreen = () => {
  const { isDark } = useTheme();
  const studentName = 'Evance Odhiambo';
  const course = 'BSc Computer Science';
  const admissionNumber = 'CS211-0455/2025';

  const screenClasses = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const heroClasses = isDark ? 'bg-slate-900 border-slate-800' : 'bg-emerald-50 border-emerald-100';
  const titleClasses = isDark ? 'text-white' : 'text-slate-900';
  const secondaryTextClasses = isDark ? 'text-slate-300' : 'text-slate-600';
  const accentTextClasses = isDark ? 'text-emerald-300' : 'text-emerald-700';

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
              {studentName}
            </Text>
            <Text
              className={`mt-1 text-sm ${secondaryTextClasses}`}
              numberOfLines={1}
            >
              {course}-{admissionNumber}
            </Text>            
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default StudentHomeScreen;
