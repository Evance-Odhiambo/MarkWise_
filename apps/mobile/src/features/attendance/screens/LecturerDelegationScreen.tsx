import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AttendanceStackParamList } from '../../../navigation/types';
import { AttendanceBackHeader } from '../components/AttendanceBackHeader';
import { useTheme } from '../../theme/context/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { useUnitSelection } from '../../unit-selection/hooks/useUnitSelection';
import {
  getUnitStudents,
  type CachedStudent,
} from '../../../shared/storage/cachedUnitStudents';
import { createDelegation } from '../api/delegationApi';

type Props = NativeStackScreenProps<
  AttendanceStackParamList,
  'LecturerDelegation'
>;

export default function LecturerDelegationScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const { token } = useAuth();
  const { selectedUnits } = useUnitSelection('lecturer');
  const [unitCode, setUnitCode] = useState('');
  const [students, setStudents] = useState<CachedStudent[]>([]);
  const [sending, setSending] = useState<string | null>(null);
  const surface = isDark
    ? 'bg-slate-900 border-slate-800'
    : 'bg-white border-slate-200';
  const title = isDark ? 'text-white' : 'text-slate-900';
  const secondary = isDark ? 'text-slate-300' : 'text-slate-600';

  useEffect(() => {
    if (!unitCode) {
      setStudents([]);
      return;
    }
    void getUnitStudents(unitCode)
      .then(setStudents)
      .catch(() => setStudents([]));
  }, [unitCode]);

  const delegate = async (student: CachedStudent) => {
    if (!token || !unitCode) return;
    setSending(student.studentId);
    try {
      await createDelegation(token, student.studentId, unitCode);
      Alert.alert(
        'Authorization sent',
        `${student.studentName} can now accept the attendance delegation from Notifications.`,
      );
    } catch (error) {
      Alert.alert(
        'Unable to delegate attendance',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSending(null);
    }
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}
    >
      <AttendanceBackHeader
        title="Delegate Attendance"
        subtitle="Authorize a trusted enrolled student"
        isDark={isDark}
        onBack={() => navigation.goBack()}
      />
      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-5">
        <Text className={`text-sm ${secondary}`}>
          Choose a unit, then select one enrolled student. The authorization
          expires after 15 minutes.
        </Text>
        <View className={`rounded-2xl border p-4 ${surface}`}>
          <Text className={`mb-3 font-bold ${title}`}>Teaching unit</Text>
          {selectedUnits.map(unit => (
            <TouchableOpacity
              key={unit.code}
              onPress={() => setUnitCode(unit.code)}
              className={`mb-2 rounded-xl border p-4 ${
                unitCode === unit.code
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : isDark
                  ? 'border-slate-700'
                  : 'border-slate-200'
              }`}
            >
              <Text className={`font-bold ${title}`}>{unit.code}</Text>
              <Text className={`mt-1 text-sm ${secondary}`}>{unit.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {unitCode ? (
          <View className={`rounded-2xl border p-4 ${surface}`}>
            <Text className={`mb-3 font-bold ${title}`}>
              Trusted enrolled student
            </Text>
            {students.length ? (
              students.map(student => (
                <View
                  key={student.studentId}
                  className="mb-3 flex-row items-center"
                >
                  <View className="flex-1">
                    <Text className={`font-bold ${title}`}>
                      {student.studentName}
                    </Text>
                    <Text className={`text-sm ${secondary}`}>
                      {student.admissionNumber}
                    </Text>
                  </View>
                  <TouchableOpacity
                    disabled={sending !== null}
                    onPress={() => void delegate(student)}
                    className="rounded-xl bg-emerald-600 px-4 py-3"
                  >
                    <Text className="font-bold text-white">
                      {sending === student.studentId
                        ? 'Sending...'
                        : 'Authorize'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text className={secondary}>
                No cached roster is available. Sync this unit while online
                first.
              </Text>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
