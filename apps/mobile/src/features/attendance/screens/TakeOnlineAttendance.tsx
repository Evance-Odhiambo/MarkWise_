import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AttendanceStackParamList } from '../../../navigation/types';
import { useTheme } from '../../theme/context/ThemeContext';
import { useResponsive } from '../../theme/hooks/useResponsive';
import { useAttendance } from '../hooks/useAttendance';
import { AttendanceModeCard } from '../components/AttendanceModeCard';
import { QrCode, KeyRound, Globe } from 'lucide-react-native';

type Props = NativeStackScreenProps<AttendanceStackParamList, 'TakeOnline'>;

const TakeOnlineAttendance = ({ navigation }: Props) => {
  const { isDark } = useTheme();
  const { isTablet } = useResponsive();
  const { startSession } = useAttendance();
  const screenClasses = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const titleClasses = isDark ? 'text-white' : 'text-slate-900';
  const bodyTextClasses = isDark ? 'text-slate-300' : 'text-slate-600';

  const methods = [
    { id: 'pin' as const, title: 'PIN Entry', icon: <KeyRound size={28} color={isDark ? '#cbd5e1' : '#475569'} />, desc: 'Students enter a class PIN online' },
    { id: 'qr' as const, title: 'QR Code', icon: <QrCode size={28} color={isDark ? '#cbd5e1' : '#475569'} />, desc: 'Students scan a QR code link' },
    { id: 'link' as const, title: 'Shareable Link', icon: <Globe size={28} color={isDark ? '#cbd5e1' : '#475569'} />, desc: 'Share a link for attendance' },
  ];

  const handleStart = async (method: 'pin' | 'qr' | 'link') => {
    const session = await startSession('online', method === 'link' ? 'pin' : method);
    if (session.pin) {
      Alert.alert('Session Started', `PIN: ${session.pin}`, [
        { text: 'OK', onPress: () => navigation.replace('MarkOnline', { sessionId: session.id }) },
      ]);
    } else {
      navigation.replace('MarkOnline', { sessionId: session.id });
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${screenClasses}`}>
      <ScrollView className="flex-1">
        <View className={`px-${isTablet ? '8' : '5'} py-6`}>
          <Text className={`text-2xl font-bold ${titleClasses} mb-1`}>Online Attendance</Text>
          <Text className={`text-sm ${bodyTextClasses} mb-6`}>Select how students will join remotely</Text>

          <View className="gap-4">
            {methods.map((m) => (
              <AttendanceModeCard
                key={m.id}
                title={m.title}
                subtitle={m.desc}
                icon={m.icon}
                onPress={() => handleStart(m.id)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TakeOnlineAttendance;
