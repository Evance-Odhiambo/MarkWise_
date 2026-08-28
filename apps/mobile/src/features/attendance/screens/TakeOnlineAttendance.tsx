import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AttendanceStackParamList } from '../../../navigation/types';
import { useTheme } from '../../theme/context/ThemeContext';
import { useResponsive } from '../../theme/hooks/useResponsive';
import { useAuth } from '../../auth/context/AuthContext';
import {
  createOnlineAttendanceSession,
  endOnlineAttendanceSession,
  getOnlineAttendanceAttendees,
} from '../../../shared/api/attendanceApi';
import { WEB_APP_URL } from '../../../shared/constants';
import { AttendanceBackHeader } from '../components/AttendanceBackHeader';

type Props = NativeStackScreenProps<AttendanceStackParamList, 'TakeOnline'>;

const TakeOnlineAttendance = ({ navigation, route }: Props) => {
  const { isDark } = useTheme();
  const { isTablet } = useResponsive();
  const { token } = useAuth();
  const [session, setSession] = useState<{
    id: string;
    expiresAt: string;
  } | null>(null);
  const [attendees, setAttendees] = useState(0);
  const [loading, setLoading] = useState(false);
  const [ended, setEnded] = useState(false);
  const screenClasses = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const titleClasses = isDark ? 'text-white' : 'text-slate-900';
  const bodyTextClasses = isDark ? 'text-slate-300' : 'text-slate-600';

  const handleStart = async () => {
    if (!token)
      return Alert.alert(
        'Sign in required',
        'Please sign in before starting attendance.',
      );
    setLoading(true);
    try {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const response = await createOnlineAttendanceSession(
        { unitCode: route.params.unitCode, expiresAt },
        { token },
      );
      setSession(response.data);
    } catch (error) {
      Alert.alert(
        'Could not start session',
        error instanceof Error ? error.message : 'Try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session || !token || ended) return;
    const timer = setInterval(async () => {
      try {
        const response = await getOnlineAttendanceAttendees(session.id, {
          token,
        });
        setAttendees(response.data.length);
      } catch {
        /* transient refresh error */
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [session, token, ended]);

  const shareSession = async () => {
    if (!session) return;
    await Share.share({
      message: `MarkWise attendance for ${route.params.unitCode}: ${WEB_APP_URL}/attend?session=${session.id}`,
    });
  };

  const endSession = async () => {
    if (!session || !token) return;
    try {
      await endOnlineAttendanceSession(session.id, { token });
      setEnded(true);
      Alert.alert('Session ended', 'No further attendance can be submitted.');
    } catch (error) {
      Alert.alert(
        'Could not end session',
        error instanceof Error ? error.message : 'Try again.',
      );
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${screenClasses}`}>
      <AttendanceBackHeader
        title="Online Attendance"
        subtitle="Create a session for your selected unit"
        isDark={isDark}
        onBack={() => navigation.goBack()}
      />
      <ScrollView className="flex-1">
        <View className={`px-${isTablet ? '8' : '5'} py-6`}>
          <Text className={`text-2xl font-bold ${titleClasses} mb-1`}>
            Online Attendance
          </Text>
          <Text className={`text-sm ${bodyTextClasses} mb-6`}>
            Create a short-lived link students can open to take attendance.
          </Text>
          <View
            className={`p-5 rounded-2xl border ${
              isDark
                ? 'bg-slate-900 border-slate-800'
                : 'bg-white border-slate-200'
            }`}
          >
            <Text className={`text-lg font-semibold ${titleClasses}`}>
              {route.params.unitName || route.params.unitCode}
            </Text>
            <Text className={`text-sm ${bodyTextClasses} mt-1`}>
              Unit code: {route.params.unitCode}
            </Text>
            {session ? (
              <>
                <Text className={`mt-5 text-sm ${bodyTextClasses}`}>
                  Students marked: {attendees}
                </Text>
                <TouchableOpacity
                  onPress={shareSession}
                  className="mt-4 items-center rounded-2xl bg-emerald-600 py-4"
                >
                  <Text className="font-bold text-white">
                    Share attendance link
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={endSession}
                  disabled={ended}
                  className="mt-3 items-center rounded-2xl border border-red-200 py-4"
                >
                  <Text className="font-bold text-red-600">
                    {ended ? 'Session ended' : 'End session'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={handleStart}
                disabled={loading}
                className="mt-5 items-center rounded-2xl bg-emerald-600 py-4"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="font-bold text-white">
                    Start online session
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TakeOnlineAttendance;
