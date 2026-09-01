import React, { useEffect, useRef, useState } from 'react';
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
import {
  isPasskeySupported,
  markOnlineAttendanceWithPasskey,
  registerOnlineAttendancePasskey,
} from '../security/onlineAttendancePasskey';

type Props = NativeStackScreenProps<AttendanceStackParamList, 'MarkOnline'>;

const MarkOnlineAttendance = ({ navigation, route }: Props) => {
  const { isDark } = useTheme();
  const { isTablet } = useResponsive();
  const { token } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [offerPasskeyRegister, setOfferPasskeyRegister] = useState(false);
  const autoMarkTriggeredRef = useRef(false);
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

  const isDuplicateSubmissionError = (error: unknown) =>
    error instanceof Error &&
    ((error as Error & { duplicate?: boolean }).duplicate === true ||
      (error as Error & { status?: number }).status === 409);

  const showAlreadyMarkedAlert = () => {
    Alert.alert(
      'Attendance marked',
      route.params.autoMark
        ? 'You already marked attendance for this session. You can return to your meeting now.'
        : 'You already marked attendance for this session.',
      [{ text: 'Done', onPress: () => navigation.goBack() }],
    );
  };

  const submitWithDeviceId = async (authToken: string) => {
    const deviceId = await getOrCreateSecureDeviceId();
    try {
      await submitOnlineAttendance(
        route.params.sessionId,
        { deviceId },
        { token: authToken },
      );
      await removeQueuedOnlineSubmission(route.params.sessionId, deviceId);
      Alert.alert(
        'Attendance marked',
        route.params.autoMark
          ? 'Your attendance was recorded. You can return to your meeting now.'
          : 'Your attendance was recorded.',
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      if (isDuplicateSubmissionError(error)) {
        // Already have a record for this session on this device — not a
        // failure. Clear any stale queued entry so it doesn't keep retrying
        // a submission that already succeeded.
        await removeQueuedOnlineSubmission(route.params.sessionId, deviceId);
        showAlreadyMarkedAlert();
        return;
      }
      await queueOnlineSubmission({
        sessionId: route.params.sessionId,
        deviceId,
      });
      setMessage(
        'Connection unavailable. Your check-in is queued and will retry while this session is open.',
      );
    }
  };

  const handleJoin = async () => {
    if (!token || !session) return;
    setSubmitting(true);
    try {
      if (isPasskeySupported()) {
        try {
          const result = await markOnlineAttendanceWithPasskey(
            route.params.sessionId,
            token,
          );
          if ('noCredential' in result) {
            // No passkey registered on this device yet. Mark attendance now
            // via the existing deviceId path so the student isn't blocked,
            // and surface the option to register a passkey for next time.
            setOfferPasskeyRegister(true);
            await submitWithDeviceId(token);
            return;
          }
          Alert.alert(
            'Attendance marked',
            route.params.autoMark
              ? 'Your attendance was verified with your device passkey. You can return to your meeting now.'
              : 'Your attendance was verified with your device passkey.',
            [{ text: 'Done', onPress: () => navigation.goBack() }],
          );
          return;
        } catch (error) {
          if (isDuplicateSubmissionError(error)) {
            showAlreadyMarkedAlert();
            return;
          }
          // Passkey ceremony failed, was cancelled, or the device otherwise
          // couldn't complete it — fall back to the deviceId path rather
          // than stranding the student.
        }
      }
      await submitWithDeviceId(token);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterPasskey = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      await registerOnlineAttendancePasskey(token);
      setOfferPasskeyRegister(false);
      setMessage('Passkey registered for faster, more secure check-ins.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Passkey registration failed. You can try again later.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Opened via a lecturer's shared "markwise://attend?session=..." link
  // (RootNavigator's deep-link handling sets autoMark: true) — mark
  // attendance immediately instead of waiting for the button tap, using the
  // same passkey-first/deviceId-fallback path handleJoin already runs for a
  // manual tap. Only fires once per screen instance.
  useEffect(() => {
    if (
      route.params.autoMark &&
      session &&
      session.status === 'active' &&
      !autoMarkTriggeredRef.current
    ) {
      autoMarkTriggeredRef.current = true;
      handleJoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params.autoMark, session]);

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

          {offerPasskeyRegister && (
            <TouchableOpacity
              onPress={handleRegisterPasskey}
              disabled={submitting}
              className={`py-3 rounded-2xl items-center border mb-4 ${
                isDark ? 'border-slate-700' : 'border-slate-300'
              } ${submitting ? 'opacity-40' : ''}`}
            >
              <Text className={`font-semibold ${titleClasses}`}>
                Register device biometrics for faster check-in
              </Text>
            </TouchableOpacity>
          )}

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

          {session && message ? (
            <Text className={`text-sm ${bodyTextClasses} mt-4 text-center`}>
              {message}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MarkOnlineAttendance;
