import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

type Props = {
  title: string;
  subtitle?: string;
  isDark: boolean;
  onBack: () => void;
};

export const AttendanceBackHeader = ({
  title,
  subtitle,
  isDark,
  onBack,
}: Props) => (
  <View
    className={`flex-row items-center border-b px-5 py-3 ${
      isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
    }`}
  >
    <TouchableOpacity
      accessibilityLabel={`Go back from ${title}`}
      accessibilityRole="button"
      onPress={onBack}
      className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10"
      hitSlop={8}
    >
      <ArrowLeft size={22} color={isDark ? '#6ee7b7' : '#047857'} />
    </TouchableOpacity>
    <View className="flex-1">
      <Text
        className={`text-lg font-extrabold ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          className={`mt-0.5 text-xs ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {subtitle}
        </Text>
      )}
    </View>
  </View>
);
