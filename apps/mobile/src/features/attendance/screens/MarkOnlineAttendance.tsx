import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AttendanceStackParamList } from '../../../navigation/types';
import { useTheme } from '../../theme/context/ThemeContext';
import { useResponsive } from '../../theme/hooks/useResponsive';
import { useAttendance } from '../hooks/useAttendance';
import { PinInput } from '../components/PinInput';

type Props = NativeStackScreenProps<AttendanceStackParamList, 'MarkOnline'>;

const MarkOnlineAttendance = ({ navigation, route }: Props) => {
  const { isDark } = useTheme();
  const { isTablet } = useResponsive();
  const { activeSession, joinSession } = useAttendance();
  const [pin, setPin] = useState('');
  const screenClasses = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const cardClasses = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const titleClasses = isDark ? 'text-white' : 'text-slate-900';
  const bodyTextClasses = isDark ? 'text-slate-300' : 'text-slate-600';

  const handleJoin = async () => {
    if (!activeSession) {
      Alert.alert('No Active Session', 'There is no active attendance session right now.');
      return;
    }
    const success = await joinSession(activeSession.id, pin);
    if (success) {
      Alert.alert('Success', 'Attendance marked!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Failed', 'Failed to join session. Check the PIN or try again.');
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${screenClasses}`}>
      <ScrollView className="flex-1">
        <View className={`px-${isTablet ? '8' : '5'} py-6`}>
          <Text className={`text-2xl font-bold ${titleClasses} mb-1`}>Mark Online Attendance</Text>
          <Text className={`text-sm ${bodyTextClasses} mb-6`}>Enter the PIN provided by your lecturer</Text>

          {activeSession ? (
            <View className={`p-5 rounded-2xl border ${cardClasses} mb-6`}>
              <Text className={`text-lg font-semibold ${titleClasses}`}>
                {activeSession.unitName || 'Active Session'}
              </Text>
              <Text className={`text-sm ${bodyTextClasses} mt-1`}>
                Lecturer: {activeSession.lecturerName || 'N/A'}
              </Text>
              <Text className={`text-sm ${bodyTextClasses} mt-1`}>
                Method: {activeSession.method}
              </Text>
            </View>
          ) : (
            <View className={`p-5 rounded-2xl border ${cardClasses} mb-6 items-center`}>
              <Text className={`text-center ${bodyTextClasses}`}>
                No active session. Enter the PIN when your lecturer starts one.
              </Text>
            </View>
          )}

          <View className="mb-6">
            <Text className={`text-sm font-medium ${titleClasses} mb-2`}>Enter PIN</Text>
            <PinInput value={pin} onChangeText={setPin} length={4} />
          </View>

          <TouchableOpacity
            onPress={handleJoin}
            disabled={!activeSession || !pin}
            className={`py-4 rounded-2xl items-center ${!activeSession || !pin ? 'opacity-40' : ''}`}
            style={{ backgroundColor: '#10b981' }}
          >
            <Text className="text-white font-bold text-lg">Mark Attendance</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MarkOnlineAttendance;
