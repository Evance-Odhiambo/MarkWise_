import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AttendanceStackParamList } from '../../../navigation/types';
import { useTheme } from '../../theme/context/ThemeContext';
import { useResponsive } from '../../theme/hooks/useResponsive';
import { useAuth } from '../../auth/context/AuthContext';
import { AttendanceModeCard } from '../components/AttendanceModeCard';
import {
  BarChart3,
  CalendarClock,
  Scan,
  Settings2,
  UserCheck,
} from 'lucide-react-native';
import { useUnitSelection } from '../../unit-selection/hooks/useUnitSelection';

type Props = NativeStackScreenProps<AttendanceStackParamList, 'AttendanceMode'>;

const AttendanceModeScreen = ({ navigation }: Props) => {
  const { isDark } = useTheme();
  const { isTablet } = useResponsive();
  const { role } = useAuth();
  const { selectedUnit, loading: unitsLoading } = useUnitSelection(
    role === 'lecturer' ? 'lecturer' : 'student',
  );

  const screenClasses = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const titleClasses = isDark ? 'text-white' : 'text-slate-900';
  const bodyTextClasses = isDark ? 'text-slate-300' : 'text-slate-600';

  const modes = [
    {
      id: 'online' as const,
      title: 'Online Attendance',
      subtitle:
        role === 'lecturer'
          ? 'Take attendance remotely via attendance link'
          : 'Mark attendance remotely via attendance link',
      icon: <CalendarClock size={32} color={isDark ? '#10b981' : '#059669'} />,
      screen: role === 'lecturer' ? 'TakeOnline' : 'MarkOnline',
    },
    {
      id: 'in-person' as const,
      title: 'In-Person Attendance',
      subtitle:
        role === 'lecturer'
          ? 'Take attendance on-site via BLE, QR or PIN'
          : 'Mark attendance on-site via BLE, QR or PIN',
      icon: <Scan size={32} color={isDark ? '#3b82f6' : '#2563eb'} />,
      screen: role === 'lecturer' ? 'TakeInPerson' : 'MarkInPerson',
    },
  ];

  const utilities: Array<{
    id: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    onPress: () => void;
  }> = [
    {
      id: 'units',
      title: 'Manage Units',
      subtitle:
        role === 'lecturer'
          ? 'Update the teaching units used for attendance'
          : 'Enroll in or update the units used for attendance',
      icon: <Settings2 size={32} color={isDark ? '#a78bfa' : '#7c3aed'} />,
      onPress: () =>
        navigation.navigate(
          role === 'lecturer'
            ? 'LecturerUnitSelection'
            : 'StudentUnitSelection',
          {},
        ),
    },
    ...(role === 'student'
      ? [
          {
            id: 'progress',
            title: 'Attendance Progress',
            subtitle: 'Review your attendance health and unit progress',
            icon: (
              <BarChart3 size={32} color={isDark ? '#fbbf24' : '#d97706'} />
            ),
            onPress: () => navigation.navigate('StudentProgress'),
          },
          {
            id: 'delegation',
            title: 'Authorized Attendance',
            subtitle: 'Accept attendance sessions shared by a lecturer',
            icon: (
              <UserCheck size={32} color={isDark ? '#34d399' : '#059669'} />
            ),
            onPress: () => navigation.navigate('StudentDelegation'),
          },
        ]
      : [
          {
            id: 'progress',
            title: 'Unit Progress',
            subtitle: 'Review attendance activity across your teaching units',
            icon: (
              <BarChart3 size={32} color={isDark ? '#fbbf24' : '#d97706'} />
            ),
            onPress: () => navigation.navigate('LecturerProgress'),
          },
          {
            id: 'delegation',
            title: 'Delegate Attendance',
            subtitle: 'Authorize a trusted enrolled student to lead a session',
            icon: (
              <UserCheck size={32} color={isDark ? '#34d399' : '#059669'} />
            ),
            onPress: () => navigation.navigate('LecturerDelegation'),
          },
        ]),
  ];

  const handleModeSelect = (screen: string) => {
    // In-person attendance owns its unit picker so it can read the lecturer's
    // cached units while offline. Do not route lecturers through unit setup.
    if (screen === 'TakeInPerson' && role === 'lecturer') {
      navigation.navigate('TakeInPerson', {});
      return;
    }
    // Selected units are restored from local storage before remote loading
    // completes, so do not force returning students through enrollment just
    // because the catalogue request is still in progress.
    if (selectedUnit) {
      const unit = {
        unitCode: selectedUnit.code,
        unitName: selectedUnit.name,
      };
      if (screen === 'TakeInPerson') navigation.navigate('TakeInPerson', unit);
      else if (screen === 'TakeOnline') navigation.navigate('TakeOnline', unit);
      else if (screen === 'MarkInPerson')
        navigation.navigate('MarkInPerson', { sessionId: '', ...unit });
      else navigation.navigate('MarkOnline', { sessionId: '', ...unit });
      return;
    }
    if (unitsLoading) return;
    if (role === 'lecturer') {
      navigation.navigate('LecturerUnitSelection', {
        next: screen as 'TakeInPerson' | 'TakeOnline',
      });
      return;
    }
    navigation.navigate('StudentUnitSelection', {
      next: screen as 'MarkInPerson' | 'MarkOnline',
    });
  };

  return (
    <SafeAreaView className={`flex-1 ${screenClasses}`}>
      <ScrollView className="flex-1">
        <View className={`px-${isTablet ? '8' : '5'} py-6`}>
          <Text className={`text-2xl font-bold ${titleClasses} mb-1`}>
            Attendance
          </Text>
          <Text className={`text-sm ${bodyTextClasses} mb-6`}>
            Choose an attendance action
          </Text>

          <View className="gap-4">
            {modes.map(m => (
              <AttendanceModeCard
                key={m.id}
                title={m.title}
                subtitle={m.subtitle}
                icon={m.icon}
                onPress={() => handleModeSelect(m.screen)}
              />
            ))}
            {utilities.map(item => (
              <AttendanceModeCard
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                icon={item.icon}
                onPress={item.onPress}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AttendanceModeScreen;
