import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Bluetooth, KeyRound, QrCode, UserPlus } from 'lucide-react-native';
import type { InPersonSession } from '../../types/inPerson';
import { QRCodeDisplay } from './QRCodeDisplay';
import { getLecturerUnitRoster } from '../../api/inPersonAttendanceApi';
import {
  getUnitStudents,
  saveUnitStudents,
  type CachedStudent,
} from '../../../../shared/storage/cachedUnitStudents';

type Props = {
  session: InPersonSession;
  qrPayload: string | null;
  qrRemainingSeconds?: number;
  pin: string | null;
  pinRemainingSeconds?: number;
  unitName?: string;
  bleActive: boolean;
  bleStartError?: string | null;
  remainingSeconds: number;
  bluetoothEnabled: boolean;
  bleAdvertisingSupported: boolean;
  bleSupportChecked: boolean;
  onEnableBluetooth: () => Promise<void>;
  onManualMark: (studentId: string) => Promise<void>;
  token: string | null;
  isDark?: boolean;
};

const card = (dark: boolean, border: string) =>
  `rounded-2xl border ${border} p-5 shadow-sm ${
    dark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
  }`;

export const LecturerSessionOverview = ({
  session,
  qrPayload,
  qrRemainingSeconds = 0,
  pin,
  pinRemainingSeconds = 0,
  unitName,
  bleActive,
  bleStartError,
  remainingSeconds,
  bluetoothEnabled,
  bleAdvertisingSupported,
  bleSupportChecked,
  onEnableBluetooth,
  onManualMark,
  token,
  isDark = false,
}: Props) => (
  <View className="gap-4">
    <View
      className={`rounded-3xl border p-5 shadow-sm ${
        isDark
          ? 'border-emerald-400/30 bg-emerald-400/10'
          : 'border-emerald-500/30 bg-emerald-500/10'
      }`}
    >
      <Text
        className={`text-lg font-extrabold ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}
      >
        Session live for {session.unitCode}
        {unitName ? ` - ${unitName}` : ''}.
      </Text>
      <Text
        className={`mt-2 text-sm font-bold ${
          isDark ? 'text-emerald-200' : 'text-emerald-700'
        }`}
      >
        Time remaining: {Math.floor(remainingSeconds / 60)}:
        {String(remainingSeconds % 60).padStart(2, '0')}
      </Text>
    </View>

    <View
      className={card(
        isDark,
        bleActive
          ? 'border-emerald-500/40'
          : bluetoothEnabled && !bleAdvertisingSupported
          ? 'border-amber-500/40'
          : 'border-sky-500/30',
      )}
    >
      <View className="mb-3 flex-row items-center">
        <Bluetooth
          size={20}
          color={
            bleActive
              ? '#059669'
              : bluetoothEnabled && !bleAdvertisingSupported
              ? '#d97706'
              : '#0284c7'
          }
        />
        <Text
          className={`ml-2 text-lg font-extrabold ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          Bluetooth
        </Text>
      </View>
      <Text
        className={`text-sm font-semibold ${
          bleActive
            ? 'text-emerald-600'
            : bluetoothEnabled && !bleAdvertisingSupported
            ? 'text-amber-600'
            : isDark
            ? 'text-slate-300'
            : 'text-slate-600'
        }`}
      >
        {!bleSupportChecked
          ? 'Checking BLE advertising support...'
          : bluetoothEnabled && !bleAdvertisingSupported
          ? 'BLE advertising not supported on this device'
          : !bluetoothEnabled
          ? 'Enable Bluetooth for faster attendance'
          : bleStartError
          ? bleStartError
          : bleActive
          ? `Broadcasting attendance signals for ${session.unitCode}`
          : 'Starting Bluetooth attendance...'}
      </Text>
      {bleSupportChecked && !bluetoothEnabled && (
        <View className="mt-3 flex-row items-center justify-between">
          <Text className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            Enable Bluetooth
          </Text>
          <Switch
            value={bluetoothEnabled}
            onValueChange={value => {
              if (value) void onEnableBluetooth();
            }}
            trackColor={{ false: '#cbd5e1', true: '#6ee7b7' }}
            thumbColor={bluetoothEnabled ? '#059669' : '#94a3b8'}
          />
        </View>
      )}
    </View>

    <View className={card(isDark, 'border-emerald-500/30')}>
      <View className="mb-4 flex-row items-center">
        <QrCode size={20} color="#059669" />
        <Text
          className={`ml-2 text-lg font-extrabold ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          QR Code
        </Text>
      </View>
      {qrPayload ? (
        <View className="items-center">
          <View className="rounded-2xl bg-white p-3">
            <QRCodeDisplay value={qrPayload} size={230} />
          </View>
          <View className="mt-4 rounded-full bg-emerald-500/10 px-4 py-2">
            <Text
              className={`text-xs font-bold ${
                isDark ? 'text-emerald-300' : 'text-emerald-700'
              }`}
            >
              {qrPayload
                ? `New QR code in ${qrRemainingSeconds}s`
                : 'Preparing QR code...'}
            </Text>
          </View>
        </View>
      ) : (
        <View className="items-center py-8">
          <ActivityIndicator color="#059669" />
          <Text className="mt-3 text-xs text-slate-500">
            Preparing QR code...
          </Text>
        </View>
      )}
    </View>

    <View className={card(isDark, 'border-amber-500/30')}>
      <View className="mb-4 flex-row items-center">
        <KeyRound size={20} color="#d97706" />
        <Text
          className={`ml-2 text-lg font-extrabold ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          PIN Fallback
        </Text>
      </View>
      <Text
        className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
      >
        Students can enter this PIN if QR or BLE is unavailable.
      </Text>
      <View
        className={`items-center rounded-2xl border border-dashed py-6 ${
          isDark
            ? 'border-amber-500/40 bg-slate-800'
            : 'border-amber-300 bg-amber-50'
        }`}
      >
        <Text className="text-4xl font-extrabold tracking-[8px] text-amber-600">
          {pin || '------'}
        </Text>
        <Text
          className={`mt-3 text-xs font-bold ${
            isDark ? 'text-amber-300' : 'text-amber-700'
          }`}
        >
          {pin
            ? `New PIN in ${pinRemainingSeconds}s`
            : 'Preparing rotating PIN...'}
        </Text>
      </View>
    </View>

    <ManualMarkCard
      onSubmit={onManualMark}
      unitCode={session.unitCode}
      token={token}
      isDark={isDark}
    />
  </View>
);

const ManualMarkCard = ({
  onSubmit,
  unitCode,
  token,
  isDark,
}: {
  onSubmit: (studentId: string) => Promise<void>;
  unitCode: string;
  token: string | null;
  isDark: boolean;
}) => {
  const [visible, setVisible] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState<CachedStudent[]>([]);
  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    const loadRoster = async () => {
      const cached = await getUnitStudents(unitCode).catch(() => []);
      if (mounted) setStudents(cached);
      if (!token) return;
      try {
        const response = await getLecturerUnitRoster(unitCode, token);
        const remote = response.students.map(student => ({
          studentId: student.studentId,
          studentName: student.studentName,
          admissionNumber: student.admissionNumber,
        }));
        await saveUnitStudents(unitCode, remote);
        if (mounted)
          setStudents(
            remote.map(student => ({
              ...student,
              unitCode,
              syncedAt: Date.now(),
            })),
          );
      } catch {
        // The cached roster remains available for offline marking.
      }
    };
    void loadRoster();
    return () => {
      mounted = false;
    };
  }, [token, unitCode, visible]);
  const close = () => {
    if (!submitting) {
      setVisible(false);
      setStudentId('');
      setSearchQuery('');
    }
  };
  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return students;
    return students.filter(
      student =>
        student.studentName.toLowerCase().includes(query) ||
        student.admissionNumber.toLowerCase().includes(query),
    );
  }, [searchQuery, students]);
  const submit = async () => {
    const value = studentId.trim();
    if (!value) return;
    setSubmitting(true);
    try {
      await onSubmit(value);
      close();
    } catch (error) {
      Alert.alert(
        'Manual mark failed',
        error instanceof Error ? error.message : 'Unable to mark this student.',
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <View
        className={`rounded-2xl border border-amber-500/30 p-5 shadow-sm ${
          isDark ? 'bg-slate-900' : 'bg-white'
        }`}
      >
        <View className="flex-row items-center">
          <UserPlus size={20} color="#d97706" />
          <Text className="ml-2 text-lg font-extrabold text-amber-600">
            Manual mark
          </Text>
        </View>
        <Text
          className={`mt-1 text-sm ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          Mark a student who cannot use QR, PIN, or BLE.
        </Text>
        <Text className="mt-2 text-xs font-semibold text-emerald-600">
          {students.length
            ? `${students.length} enrolled students cached for offline use`
            : 'Roster will be available after the next sync'}
        </Text>
        <TouchableOpacity
          onPress={() => setVisible(true)}
          className="mt-4 rounded-xl bg-amber-600 py-3"
        >
          <Text className="text-center font-bold text-white">
            Mark student present
          </Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={close}
      >
        <View className="flex-1 justify-start bg-black/60">
          <View
            className={`h-[86%] rounded-b-3xl p-6 ${
              isDark ? 'bg-slate-900' : 'bg-white'
            }`}
          >
            <View className="mb-5 flex-row items-center justify-between">
              <View className="flex-1">
                <Text
                  className={`text-xl font-extrabold ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Mark student present
                </Text>
                <Text
                  className={`mt-1 text-xs ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  Enter the student ID or admission number.
                </Text>
              </View>
              <TouchableOpacity onPress={close} disabled={submitting}>
                <Text className="text-2xl text-slate-400">×</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={value => {
                setSearchQuery(value);
                setStudentId('');
              }}
              placeholder="Search by name or admission number"
              placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
              autoCapitalize="none"
              autoCorrect={false}
              className={`rounded-xl border p-4 ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-white'
                  : 'border-slate-300 bg-slate-50 text-slate-900'
              }`}
            />
            {studentId ? (
              <Text className="mt-2 text-xs font-semibold text-emerald-600">
                Student selected and ready to mark
              </Text>
            ) : null}
            {students.length > 0 && (
              <ScrollView
                className="mt-3 max-h-[55%]"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View className="rounded-xl border border-slate-200">
                  <Text className="p-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {filteredStudents.length} matching student
                    {filteredStudents.length === 1 ? '' : 's'}
                  </Text>
                  {filteredStudents.slice(0, 50).map(student => (
                    <TouchableOpacity
                      key={student.studentId}
                      onPress={() => {
                        setStudentId(student.studentId);
                        setSearchQuery(student.admissionNumber);
                      }}
                      className="flex-row items-center justify-between border-t border-slate-100 px-3 py-2"
                    >
                      <View className="flex-1">
                        <Text
                          className={`font-semibold ${
                            isDark ? 'text-white' : 'text-slate-900'
                          }`}
                          numberOfLines={1}
                        >
                          {student.studentName}
                        </Text>
                        <Text className="text-xs text-slate-500">
                          {student.admissionNumber}
                        </Text>
                      </View>
                      <Text className="text-xs font-bold text-amber-600">
                        Select
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
            <TouchableOpacity
              onPress={() => void submit()}
              disabled={!studentId.trim() || submitting}
              className={`mt-4 rounded-xl bg-amber-600 py-4 ${
                !studentId.trim() || submitting ? 'opacity-50' : ''
              }`}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-center font-bold text-white">
                  Confirm manual mark
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};
