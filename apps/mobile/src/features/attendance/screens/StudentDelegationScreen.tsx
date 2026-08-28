import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AttendanceStackParamList } from '../../../navigation/types';
import { AttendanceBackHeader } from '../components/AttendanceBackHeader';
import { useTheme } from '../../theme/context/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { useNotifications } from '../../notifications/hooks/useNotifications';
import { acceptDelegation } from '../api/delegationApi';
import {
  loadCachedDelegations,
  saveCachedDelegation,
} from '../storage/delegationStorage';
import { getCachedInPersonSessionById } from '../../../shared/storage/inPersonSessionCache';
import { storeAttendanceSessionSecret } from '../../../shared/security/secureKeyStorage';
import { cacheInPersonSession } from '../../../shared/storage/inPersonSessionCache';

type Props = NativeStackScreenProps<
  AttendanceStackParamList,
  'StudentDelegation'
>;

export default function StudentDelegationScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const { token } = useAuth();
  const { notifications, refetch } = useNotifications('student');
  const [accepting, setAccepting] = useState<string | null>(null);
  const [cached, setCached] = useState<
    Awaited<ReturnType<typeof loadCachedDelegations>>
  >([]);
  const grants = useMemo(
    () =>
      notifications.filter(
        item => item.metadata?.action === 'accept-attendance-delegation',
      ),
    [notifications],
  );
  useEffect(() => {
    void loadCachedDelegations()
      .then(setCached)
      .catch(() => setCached([]));
  }, [notifications]);
  const title = isDark ? 'text-white' : 'text-slate-900';
  const secondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const accept = async (
    notificationId: string,
    delegationId: string,
    grantToken: string,
  ) => {
    if (!token) return;
    setAccepting(notificationId);
    try {
      const accepted = await acceptDelegation(token, delegationId, grantToken);
      await saveCachedDelegation({
        ...accepted.data,
        sessionId: accepted.data.session.id,
      });
      await cacheInPersonSession(accepted.data.session);
      await storeAttendanceSessionSecret(
        accepted.data.session.id,
        accepted.data.session.sessionSecret,
      );
      navigation.navigate('TakeInPerson', {
        delegatedSessionId: accepted.data.session.id,
        unitCode: accepted.data.session.unitCode,
        unitName: accepted.data.unitName,
      });
      setCached(current => [
        ...current.filter(item => item.id !== accepted.data.id),
        { ...accepted.data, sessionId: accepted.data.session.id },
      ]);
    } catch (error) {
      Alert.alert(
        'Unable to accept authorization',
        error instanceof Error
          ? error.message
          : 'The authorization may have expired.',
      );
    } finally {
      setAccepting(null);
    }
  };
  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}
    >
      <AttendanceBackHeader
        title="Authorized Attendance"
        subtitle="Attendance sessions shared with you"
        isDark={isDark}
        onBack={() => navigation.goBack()}
      />
      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-5">
        {!grants.length ? (
          <Text className={`text-center ${secondary}`}>
            No attendance authorizations available.
          </Text>
        ) : (
          grants.map(item => {
            const data = item.metadata || {};
            return (
              <View
                key={item.id}
                className={`rounded-2xl border p-5 ${
                  isDark
                    ? 'border-slate-800 bg-slate-900'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <Text className={`text-lg font-extrabold ${title}`}>
                  {item.title}
                </Text>
                <Text className={`mt-2 ${secondary}`}>{item.body}</Text>
                <TouchableOpacity
                  disabled={accepting !== null}
                  onPress={() =>
                    void accept(
                      item.id,
                      String(data.delegationId || ''),
                      String(data.grantToken || ''),
                    )
                  }
                  className="mt-4 rounded-xl bg-emerald-600 py-3"
                >
                  <Text className="text-center font-bold text-white">
                    {accepting === item.id
                      ? 'Accepting...'
                      : 'Accept authorization'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
        {cached.map(item => (
          <View
            key={`cached-${item.id}`}
            className={`rounded-2xl border p-5 ${
              isDark
                ? 'border-emerald-900 bg-emerald-950/40'
                : 'border-emerald-200 bg-emerald-50'
            }`}
          >
            <Text className={`text-lg font-extrabold ${title}`}>
              {item.unitCode} authorization saved
            </Text>
            <Text className={`mt-2 ${secondary}`}>
              This authorization is available offline on this device.
            </Text>
            {item.sessionId ? (
              <TouchableOpacity
                className="mt-4 rounded-xl bg-emerald-600 py-3"
                onPress={() =>
                  void getCachedInPersonSessionById(item.sessionId!).then(
                    session => {
                      if (!session || session.status !== 'active') {
                        Alert.alert(
                          'Session ended',
                          'This attendance session is no longer active.',
                        );
                        return;
                      }
                      navigation.navigate('TakeInPerson', {
                        delegatedSessionId: session.id,
                        unitCode: session.unitCode,
                        unitName: item.unitName,
                      });
                    },
                  )
                }
              >
                <Text className="text-center font-bold text-white">
                  Resume attendance
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
