import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/context/ThemeContext';
import { useResponsive } from '../../theme/hooks/useResponsive';

type AttendanceModeCardProps = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
};

export const AttendanceModeCard = ({
  title,
  subtitle,
  icon,
  onPress,
}: AttendanceModeCardProps) => {
  const { isDark } = useTheme();
  const { isTablet } = useResponsive();
  const cardClasses = isDark
    ? 'bg-slate-900 border-slate-800'
    : 'bg-white border-slate-200';
  const titleClasses = isDark ? 'text-white' : 'text-slate-900';
  const subtitleClasses = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`p-5 rounded-2xl border ${cardClasses} flex-row items-center gap-4`}
    >
      <View
        className={`w-${isTablet ? '14' : '12'} h-${
          isTablet ? '14' : '12'
        } items-center justify-center flex-none`}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text className={`text-lg font-semibold ${titleClasses}`}>{title}</Text>
        <Text className={`text-sm ${subtitleClasses} mt-0.5`}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
};
