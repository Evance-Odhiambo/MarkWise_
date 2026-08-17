import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AttendanceStackParamList } from '../../../navigation/types';
import { useTheme } from '../../theme/context/ThemeContext';
import { useResponsive } from '../../theme/hooks/useResponsive';
import { useAuth } from '../../auth/context/AuthContext';
import { AttendanceModeCard } from '../components/AttendanceModeCard';
import { CalendarClock, Scan } from 'lucide-react-native';

type Props = NativeStackScreenProps<AttendanceStackParamList, 'AttendanceMode'>;

const AttendanceModeScreen = ({ navigation }: Props) => {
  const { isDark } = useTheme();
  const { isTablet } = useResponsive();
  const { role } = useAuth();

  const screenClasses = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const titleClasses = isDark ? 'text-white' : 'text-slate-900';
  const bodyTextClasses = isDark ? 'text-slate-300' : 'text-slate-600';

  const modes = [
    {
      id: 'online' as const,
      title: 'Online Attendance',
      subtitle: 'Mark attendance remotely via QR or PIN',
      icon: <CalendarClock size={32} color={isDark ? '#10b981' : '#059669'} />,
      screen: role === 'lecturer' ? 'TakeOnline' : 'MarkOnline',
    },
    {
      id: 'in-person' as const,
      title: 'In-Person Attendance',
      subtitle: 'Mark attendance on-site via BLE or QR',
      icon: <Scan size={32} color={isDark ? '#3b82f6' : '#2563eb'} />,
      screen: role === 'lecturer' ? 'TakeInPerson' : 'MarkInPerson',
    },
  ];

  const handleModeSelect = (screen: string) => {
    navigation.navigate(screen as any);
  };

  return (
    <SafeAreaView className={`flex-1 ${screenClasses}`}>
      <ScrollView className="flex-1">
        <View className={`px-${isTablet ? '8' : '5'} py-6`}>
          <Text className={`text-2xl font-bold ${titleClasses} mb-1`}>
            {role === 'lecturer' ? 'Take Attendance' : 'Mark Attendance'}
          </Text>
          <Text className={`text-sm ${bodyTextClasses} mb-6`}>
            Select your attendance method
          </Text>

          <View className="gap-4">
            {modes.map((m) => (
              <AttendanceModeCard
                key={m.id}
                title={m.title}
                subtitle={m.subtitle}
                icon={m.icon}
                onPress={() => handleModeSelect(m.screen)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AttendanceModeScreen;
