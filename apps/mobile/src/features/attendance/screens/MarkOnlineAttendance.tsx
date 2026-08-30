import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AttendanceStackParamList } from '../../../navigation/types';
import { useTheme } from '../../theme/context/ThemeContext';
import { useResponsive } from '../../theme/hooks/useResponsive';
import { useAuth } from '../../auth/context/AuthContext';
import {
  getOnlineAttendanceSession,
  submitOnlineAttendance,
} from '../../../shared/api/attendanceApi';
import {
  getQueuedOnlineSubmission,
  queueOnlineSubmission,
  removeQueuedOnlineSubmission,
} from '../../../shared/storage/onlineAttendanceQueue';
import { getOrCreateSecureDeviceId } from '../../../shared/storage/secureDeviceId';
import { AttendanceBackHeader } from '../components/AttendanceBackHeader';

type Props = NativeStackScreenProps<AttendanceStackParamList, 'MarkOnline'>;

const MarkOnlineAttendance = ({ navigation, route }: Props) => {
  const { isDark } = useTheme();
  const { isTablet } = useResponsive();
  const { token } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const screenClasses = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const cardClasses = isDark
    ? 'bg-slate-900 border-slate-800'
    : 'bg-white border-slate-200';
  const titleClasses = isDark ? 'text-white' : 'text-slate-900';
  const bodyTextClasses = isDark ? 'text-slate-300' : 'text-slate-600';

  useEffect(() => {
    (async () => {
      if (!token) {
        setMessage('Sign in is required.');
        setLoading(false);
        return;
      }
      try {
        const response = await getOnlineAttendanceSession(
          route.params.sessionId,
          { token },
        );
        setSession(response.data);
        const queued = await getQueuedOnlineSubmission(route.params.sessionId);
        if (queued && response.data.status === 'active') {
          try {
            await submitOnlineAttendance(
              route.params.sessionId,
              { deviceId: queued.deviceId },
              { token },
            );
            await removeQueuedOnlineSubmission(
              route.params.sessionId,
              queued.deviceId,
            );
            setMessage('Queued attendance was submitted.');
          } catch {
            setMessage('A queued check-in is waiting for a connection.');
          }
        }
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : 'This session is unavailable.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [route.params.sessionId, token]);

  const handleJoin = async () => {
    if (!token || !session) return;
    setSubmitting(true);
    try {
      const deviceId = await getOrCreateSecureDeviceId();
      await submitOnlineAttendance(
        route.params.sessionId,
        { deviceId },
        { token },
      );
      await removeQueuedOnlineSubmission(route.params.sessionId, deviceId);
      Alert.alert('Attendance marked', 'Your attendance was recorded.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      const deviceId = await getOrCreateSecureDeviceId();
      await queueOnlineSubmission({
        sessionId: route.params.sessionId,
        deviceId,
      });
      setMessage(
        'Connection unavailable. Your check-in is queued and will retry while this session is open.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${screenClasses}`}>
      <AttendanceBackHeader
        title="Online Attendance"
        subtitle="Mark your attendance remotely"
        isDark={isDark}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: isTablet ? 32 : 20,
          paddingTop: 24,
          paddingBottom: 20,
          flexGrow: 1,
        }}
      >
        <View>
          <Text className={`text-2xl font-bold ${titleClasses} mb-1`}>
            Mark Online Attendance
          </Text>
          <Text className={`text-sm ${bodyTextClasses} mb-6`}>
            Enter the PIN provided by your lecturer
          </Text>

          {loading ? (
            <ActivityIndicator />
          ) : session ? (
            <View className={`p-5 rounded-2xl border ${cardClasses} mb-6`}>
              <Text className={`text-lg font-semibold ${titleClasses}`}>
                {route.params.unitName || session.unitCode || 'Active Session'}
              </Text>
              <Text className={`text-sm ${bodyTextClasses} mt-1`}>
                Unit: {route.params.unitCode || session.unitCode || 'Unknown'}
              </Text>
              <Text className={`text-sm ${bodyTextClasses} mt-1`}>
                Status: {session.status === 'active' ? 'Open' : 'Closed'}
              </Text>
              <Text className={`text-sm ${bodyTextClasses} mt-1`}>
                Closes: {new Date(session.expiresAt).toLocaleTimeString()}
              </Text>
            </View>
          ) : (
            <View
              className={`p-5 rounded-2xl border ${cardClasses} mb-6 items-center`}
            >
              <Text className={`text-center ${bodyTextClasses}`}>
                {message || 'No active attendance session.'}
              </Text>
            </View>
          )}

          <View className="mb-6">
            <Text className={`text-sm ${bodyTextClasses}`}>
              Attendance is linked to your signed-in account and this device.
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleJoin}
            disabled={!session || submitting || session.status !== 'active'}
            className={`py-4 rounded-2xl items-center ${
              !session || submitting || session.status !== 'active'
                ? 'opacity-40'
                : ''
            }`}
            style={{ backgroundColor: '#10b981' }}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">
                Mark Attendance
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MarkOnlineAttendance;
