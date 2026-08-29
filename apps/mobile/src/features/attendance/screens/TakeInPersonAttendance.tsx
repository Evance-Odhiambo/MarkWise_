import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AttendanceStackParamList } from '../../../navigation/types';
import { useTheme } from '../../theme/context/ThemeContext';
import { useResponsive } from '../../theme/hooks/useResponsive';
import { useAuth } from '../../auth/context/AuthContext';
import { useInPersonSession } from '../hooks/useInPersonSession';
import { createAttendancePin } from '../security/attendancePin';
import {
  PIN_ROTATION_SECONDS,
  QR_ROTATION_SECONDS,
} from '../security/attendanceProtocol';
import {
  createSignedPayload,
  encodeAttendancePayload,
  createCompactBlePayload,
} from '../security/attendancePayload';
import { getAttendanceSessionSecret } from '../../../shared/security/secureKeyStorage';
import { adaptiveConfig } from '../../../shared/utils/adaptiveAttendanceConfig';
import NativeBLEAdvertiser from '../../native/NativeBLEAdvertiser';
import { LecturerSessionOverview } from '../components/in-person/LecturerSessionOverview';
import { AttendanceBackHeader } from '../components/AttendanceBackHeader';
import {
  getInPersonSession,
  submitLecturerAssistedMark,
} from '../api/inPersonAttendanceApi';
import { submitDelegatedAssistedMark } from '../api/delegationApi';
import { findCachedDelegationBySessionId } from '../storage/delegationStorage';
import { getUnitStudents } from '../../../shared/storage/cachedUnitStudents';
import {
  loadUnitMappings,
  saveUnitMappings,
} from '../../../shared/storage/unitMappings';
import { getCachedInPersonSessionById } from '../../../shared/storage/inPersonSessionCache';
import { useUnitSelection } from '../../unit-selection/hooks/useUnitSelection';
import {
  cacheBleMappings,
  fetchBleMappingsFromApi,
} from '../../../shared/storage/bleCache';
import { ChevronDown, QrCode, Radio, Search, X } from 'lucide-react-native';
import { FadeSlideIn } from '../components/in-person/AnimatedAttendance';
import {
  enqueueLecturerMark,
  removeLecturerMark,
} from '../../../shared/storage/lecturerManualMarkQueue';

type Props = NativeStackScreenProps<AttendanceStackParamList, 'TakeInPerson'>;

const TakeInPersonAttendance = ({ navigation, route }: Props) => {
  const { isDark } = useTheme();
  const { isTablet } = useResponsive();
  const { token, userId, institutionId } = useAuth();
  const { session, start, end, adopt } = useInPersonSession(token);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [bleActive, setBleActive] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [bleAdvertisingSupported, setBleAdvertisingSupported] = useState(false);
  const [bleSupportChecked, setBleSupportChecked] = useState(false);
  const [bleStartError, setBleStartError] = useState<string | null>(null);
  const [qrRemainingSeconds, setQrRemainingSeconds] = useState(0);
  const [pinRemainingSeconds, setPinRemainingSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [selectedUnitCode, setSelectedUnitCode] = useState('');
  const [selectedUnitName, setSelectedUnitName] = useState('');
  const sessionStartingRef = useRef(false);
  const advertisedPayloadRef = useRef<string | null>(null);
  const displayedQrCounterRef = useRef<number | null>(null);
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [unitQuery, setUnitQuery] = useState('');
  const [debouncedUnitQuery, setDebouncedUnitQuery] = useState('');
  const { availableUnits, loading: unitsLoading } = useUnitSelection(
    'lecturer',
    debouncedUnitQuery,
  );
  const screenClasses = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const titleClasses = isDark ? 'text-white' : 'text-slate-900';
  const bodyClasses = isDark ? 'text-slate-300' : 'text-slate-600';

  useEffect(() => {
    const delegatedSessionId = route.params?.delegatedSessionId;
    if (!delegatedSessionId || session) return;
    let mounted = true;
    void (async () => {
      const cached = await getCachedInPersonSessionById(
        delegatedSessionId,
      ).catch(() => null);
      if (cached?.status === 'active') {
        if (mounted) void adopt(cached);
        return;
      }
      if (!token) return;
      await getInPersonSession(delegatedSessionId, token)
        .then(result => {
          if (mounted && result.data.status === 'active')
            void adopt(result.data);
        })
        .catch(() => undefined);
    })();
    return () => {
      mounted = false;
    };
  }, [adopt, route.params?.delegatedSessionId, session, token]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUnitQuery(unitQuery), 300);
    return () => clearTimeout(timer);
  }, [unitQuery]);

  const refreshBluetooth = async () => {
    try {
      const [enabled, supported] = await Promise.all([
        NativeBLEAdvertiser.isBluetoothEnabled(),
        NativeBLEAdvertiser.isAdvertisingSupported(),
      ]);
      setBluetoothEnabled(enabled);
      setBleAdvertisingSupported(supported);
      setBleSupportChecked(true);
    } catch {
      setBluetoothEnabled(false);
      setBleAdvertisingSupported(false);
      setBleSupportChecked(true);
    }
  };

  const ensureBlePermissions = async () => {
    if (Platform.OS !== 'android' || Number(Platform.Version) < 31) return;
    const permissions = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
    ]);
    const granted = Object.values(permissions).every(
      value => value === PermissionsAndroid.RESULTS.GRANTED,
    );
    if (!granted)
      throw new Error('Bluetooth advertising permission is required.');
  };

  const enableBluetooth = async () => {
    try {
      await ensureBlePermissions();
      await NativeBLEAdvertiser.requestEnableBluetooth();
      await refreshBluetooth();
    } catch (error) {
      Alert.alert(
        'Bluetooth unavailable',
        error instanceof Error
          ? error.message
          : 'Enable Bluetooth in device settings and try again.',
      );
    }
  };

  useEffect(() => {
    void refreshBluetooth();
    const interval = setInterval(() => {
      void refreshBluetooth();
    }, 2_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    const refresh = async () => {
      const secret = await getAttendanceSessionSecret(session.id);
      if (!active) return;
      if (!secret) {
        setBleStartError('Preparing secure BLE payload...');
        return;
      }
      const [qr, currentPin, ble] = await Promise.all([
        createSignedPayload(session, secret),
        createAttendancePin(session, secret),
        createCompactBlePayload(session, secret).catch(() => null),
      ]);
      if (!active) return;
      if (displayedQrCounterRef.current !== qr.counter) {
        displayedQrCounterRef.current = qr.counter;
        setQrPayload(encodeAttendancePayload(qr));
      }
      setPin(currentPin);
      if (ble && bluetoothEnabled && bleAdvertisingSupported) {
        const needsAdvertiserStart = advertisedPayloadRef.current !== ble;
        if (needsAdvertiserStart) {
          try {
            setBleStartError(null);
            await ensureBlePermissions();
            if (Platform.OS === 'android')
              await NativeBLEAdvertiser.stopBackgroundAdvertising().catch(
                () => undefined,
              );
            // Keep the lecturer path in the foreground and wait for the
            // native advertiser callback. This gives the UI a real success
            // or failure result instead of leaving it stuck in a pending
            // state while a background service silently fails.
            await NativeBLEAdvertiser.startAdvertising(ble.slice(7));
            advertisedPayloadRef.current = ble;
            setBleActive(true);
          } catch {
            advertisedPayloadRef.current = null;
            setBleActive(false);
            setBleStartError(
              'Unable to start BLE advertising. Check Bluetooth permission.',
            );
          }
        }
      } else if (bluetoothEnabled && bleAdvertisingSupported && !ble) {
        setBleActive(false);
        setBleStartError('BLE unit mapping is unavailable for this unit.');
      } else {
        advertisedPayloadRef.current = null;
        setBleStartError(null);
        await NativeBLEAdvertiser.stopAdvertising().catch(() => undefined);
        setBleActive(false);
      }
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = async () => {
      await refresh();
      if (!active) return;
      const nextRotation =
        QR_ROTATION_SECONDS * 1_000 -
        (Date.now() % (QR_ROTATION_SECONDS * 1_000));
      timer = setTimeout(() => void scheduleRefresh(), nextRotation);
    };
    void scheduleRefresh();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      advertisedPayloadRef.current = null;
      displayedQrCounterRef.current = null;
      void NativeBLEAdvertiser.stopAdvertising().catch(() => undefined);
      void NativeBLEAdvertiser.stopBackgroundAdvertising().catch(
        () => undefined,
      );
      setBleActive(false);
    };
  }, [bleAdvertisingSupported, bluetoothEnabled, session]);

  useEffect(() => {
    if (!session) {
      setQrPayload(null);
      setPin(null);
      setQrRemainingSeconds(0);
      setPinRemainingSeconds(0);
      setRemainingSeconds(0);
      return;
    }
    const updateQrTimer = () => {
      const currentWindow =
        Math.floor(Date.now() / 1_000) % QR_ROTATION_SECONDS;
      setQrRemainingSeconds(QR_ROTATION_SECONDS - currentWindow);
    };
    const updatePinTimer = () => {
      const currentWindow =
        Math.floor(Date.now() / 1_000) % PIN_ROTATION_SECONDS;
      setPinRemainingSeconds(PIN_ROTATION_SECONDS - currentWindow);
    };
    updateQrTimer();
    updatePinTimer();
    const timer = setInterval(() => {
      updateQrTimer();
      updatePinTimer();
    }, 1_000);
    return () => clearInterval(timer);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const updateRemaining = () => {
      setRemainingSeconds(
        Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 1_000)),
      );
    };
    updateRemaining();
    const timer = setInterval(updateRemaining, 1_000);
    return () => clearInterval(timer);
  }, [session]);

  useEffect(() => {
    if (!session || session.status !== 'active') return;
    const timeout = setTimeout(
      () => void end(),
      Math.max(0, session.expiresAt - Date.now()) + 100,
    );
    return () => clearTimeout(timeout);
  }, [end, session]);

  const refreshLecturerBleMapping = async (unitCode: string) => {
    if (!token || !userId) return null;
    const normalizedCode = unitCode.trim().toUpperCase();
    const synced = await fetchBleMappingsFromApi('lecturer', token);
    if (!synced) return null;
    const match = synced.mappings.find(
      mapping => mapping.unitCode.trim().toUpperCase() === normalizedCode,
    );
    if (!match?.bleId) return null;
    await saveUnitMappings(
      { userId, role: 'lecturer', institutionId },
      synced.mappings,
    );
    await cacheBleMappings('lecturer', synced.mappings, synced.version);
    await adaptiveConfig.initialize(
      'lecturer',
      [normalizedCode],
      institutionId,
      userId,
    );
    return Number(match.bleId);
  };

  const startSession = async (unitCode = selectedUnitCode) => {
    if (!unitCode || session || sessionStartingRef.current) return;
    sessionStartingRef.current = true;
    try {
      const cachedBleUnitId = adaptiveConfig.getUnitId(unitCode);
      const storedMappings = userId
        ? await loadUnitMappings({
            userId,
            role: 'lecturer',
            institutionId,
          }).catch(() => [])
        : [];
      const storedMapping = storedMappings.find(
        mapping => mapping.unitCode === unitCode,
      );
      const storedBleUnitId = storedMapping?.bleId
        ? Number(storedMapping.bleId)
        : null;
      let bleUnitId = cachedBleUnitId ?? storedBleUnitId;

      if (bleUnitId == null) {
        setBleStartError('Refreshing BLE unit mapping...');
        const refreshedBleUnitId = await refreshLecturerBleMapping(unitCode);
        bleUnitId = refreshedBleUnitId ?? null;
      }

      if (bleUnitId == null) {
        setBleStartError('BLE unit mapping is unavailable for this unit.');
        Alert.alert(
          'BLE mapping unavailable',
          'This teaching unit does not have a BLE mapping yet. Sync the unit list and try again.',
        );
        return;
      }
      await start({
        unitCode,
        durationMinutes: 10,
        bleUnitId,
      });
    } catch (error) {
      Alert.alert(
        'Unable to start session',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      sessionStartingRef.current = false;
    }
  };

  const formatRemaining = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  const manualMark = async (studentId: string) => {
    if (!session || !token || !qrPayload) {
      throw new Error(
        'The attendance proof is still being prepared. Try again.',
      );
    }
    const roster = await getUnitStudents(session.unitCode).catch(() => []);
    const normalized = studentId.trim().toLowerCase();
    const student = roster.find(
      item =>
        item.studentId.toLowerCase() === normalized ||
        item.admissionNumber.toLowerCase() === normalized,
    );
    if (!student)
      throw new Error('Student was not found in the cached unit roster.');
    const delegation = route.params?.delegatedSessionId
      ? await findCachedDelegationBySessionId(route.params.delegatedSessionId)
      : null;
    if (route.params?.delegatedSessionId && !delegation)
      throw new Error(
        'This delegated authorization is no longer available on this device.',
      );
    const mark = await enqueueLecturerMark({
      sessionId: session.id,
      studentId: student.studentId,
      rawPayload: qrPayload,
      scannedAt: Date.now(),
      delegationId: delegation?.id,
    });
    try {
      const result = delegation
        ? await submitDelegatedAssistedMark(
            {
              ...mark,
              delegationId: delegation.id,
              grantToken: delegation.grantToken,
            },
            token,
          )
        : await submitLecturerAssistedMark(mark, token);
      await removeLecturerMark(mark.id);
      Alert.alert(
        result.data.status === 'duplicate'
          ? 'Already marked'
          : 'Student marked',
        result.data.status === 'duplicate'
          ? 'This student is already marked for the session.'
          : 'The student was marked present successfully.',
      );
    } catch (error) {
      if (
        error instanceof Error &&
        'status' in error &&
        Number((error as { status?: number }).status) >= 400 &&
        Number((error as { status?: number }).status) < 500
      ) {
        await removeLecturerMark(mark.id);
        throw error;
      }
      Alert.alert(
        'Saved offline',
        'The manual mark was saved on this device and will sync automatically when connectivity returns.',
      );
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${screenClasses}`}>
      <AttendanceBackHeader
        title="Take In-Person Attendance"
        subtitle="Run a secure session for your selected unit"
        isDark={isDark}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className={`px-${isTablet ? '8' : '5'} py-6`}>
          <View className="mb-6 items-center">
            <Text className={`mt-2 text-center text-sm ${bodyClasses}`}>
              Share secure QR, PIN, and Bluetooth attendance with your class.
            </Text>
          </View>
          {!session && (
            <FadeSlideIn>
              <View
                className={`mb-4 rounded-2xl border p-4 ${
                  isDark
                    ? 'border-slate-700 bg-slate-900'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <Text className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  Select Unit
                </Text>
                <TouchableOpacity
                  disabled={unitsLoading}
                  onPress={() => setUnitPickerOpen(true)}
                  className={`mt-3 flex-row items-center rounded-2xl border px-4 py-4 ${
                    isDark
                      ? 'border-slate-700 bg-slate-800'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <View className="flex-1">
                    <Text
                      className={`text-lg font-extrabold ${
                        selectedUnitCode ? titleClasses : bodyClasses
                      }`}
                    >
                      {selectedUnitCode || 'Tap to choose a teaching unit'}
                    </Text>
                    {selectedUnitName ? (
                      <Text className={`mt-1 text-sm ${bodyClasses}`}>
                        {selectedUnitName}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronDown size={20} color="#10b981" />
                </TouchableOpacity>
              </View>
            </FadeSlideIn>
          )}
          <Text className={`mb-4 text-sm ${bodyClasses}`}>
            {session
              ? 'Students can check in automatically while this session is live.'
              : 'Select a unit to start a ten-minute attendance session.'}
          </Text>
          {session ? (
            <FadeSlideIn>
              <LecturerSessionOverview
                session={session}
                unitName={selectedUnitName}
                bleActive={bleActive}
                bluetoothEnabled={bluetoothEnabled}
                bleAdvertisingSupported={bleAdvertisingSupported}
                bleStartError={bleStartError}
                bleSupportChecked={bleSupportChecked}
                onEnableBluetooth={enableBluetooth}
                remainingSeconds={remainingSeconds}
                qrPayload={qrPayload}
                qrRemainingSeconds={qrRemainingSeconds}
                pin={pin}
                pinRemainingSeconds={pinRemainingSeconds}
                onManualMark={manualMark}
                token={token}
                isDark={isDark}
              />
            </FadeSlideIn>
          ) : (
            <View
              className={`rounded-3xl border p-6 shadow-sm ${
                isDark
                  ? 'border-slate-700 bg-slate-900'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <View className="mb-4 flex-row items-center">
                <QrCode size={21} color="#059669" />
                <Text className={`ml-2 text-lg font-extrabold ${titleClasses}`}>
                  QR Code
                </Text>
              </View>
              <View
                className={`items-center rounded-2xl border border-dashed py-10 ${
                  isDark
                    ? 'border-slate-600 bg-slate-800'
                    : 'border-slate-300 bg-slate-50'
                }`}
              >
                <QrCode size={64} color={isDark ? '#64748b' : '#94a3b8'} />
                <Text
                  className={`mt-4 text-center text-xl font-extrabold ${titleClasses}`}
                >
                  QR code ready to generate
                </Text>
                <Text className={`mt-2 px-6 text-center ${bodyClasses}`}>
                  Select a teaching unit to automatically start and display a
                  rotating QR code for students to scan.
                </Text>
              </View>
            </View>
          )}
          {!session && (
            <View
              className={`mt-5 rounded-2xl border border-emerald-500/30 p-5 shadow-sm ${
                isDark ? 'bg-slate-900' : 'bg-white'
              }`}
            >
              <View className="flex-row items-center">
                <Radio
                  size={21}
                  color={bluetoothEnabled ? '#059669' : '#d97706'}
                />
                <Text className={`ml-2 text-lg font-extrabold ${titleClasses}`}>
                  Auto Attendance
                </Text>
              </View>
              <Text
                className={`mt-2 text-sm ${
                  !bleSupportChecked || !bleAdvertisingSupported
                    ? 'text-amber-600'
                    : bluetoothEnabled
                    ? 'text-emerald-600'
                    : 'text-amber-600'
                }`}
              >
                {!bleSupportChecked
                  ? 'Checking Bluetooth support...'
                  : !bleAdvertisingSupported
                  ? 'BLE advertising is not supported on this device'
                  : bluetoothEnabled
                  ? bleActive
                    ? 'Automatic detection is active'
                    : 'Bluetooth is on and ready for automatic attendance'
                  : 'Enable Bluetooth for automatic attendance'}
              </Text>
              {bleSupportChecked && !bleAdvertisingSupported ? (
                <Text className="mt-3 text-xs font-semibold text-amber-600">
                  Use QR or PIN attendance on devices without BLE advertising.
                </Text>
              ) : !bluetoothEnabled ? (
                <View className="mt-3 flex-row items-center justify-between">
                  <Text
                    className={isDark ? 'text-slate-400' : 'text-slate-500'}
                  >
                    Enable Bluetooth
                  </Text>
                  <Switch
                    value={bluetoothEnabled}
                    onValueChange={value => {
                      if (value) void enableBluetooth();
                    }}
                    trackColor={{ false: '#cbd5e1', true: '#6ee7b7' }}
                    thumbColor={bluetoothEnabled ? '#059669' : '#94a3b8'}
                  />
                </View>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
      <Modal
        visible={unitPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setUnitPickerOpen(false)}
      >
        <View className="flex-1 justify-start bg-black/40">
          <View
            className={`h-[88%] rounded-b-3xl p-5 ${
              isDark ? 'bg-slate-900' : 'bg-white'
            }`}
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className={`text-xl font-extrabold ${titleClasses}`}>
                  Select Unit
                </Text>
                <Text className={`mt-1 text-sm ${bodyClasses}`}>
                  Choose from your institution&apos;s units
                </Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close unit selector"
                onPress={() => setUnitPickerOpen(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10"
              >
                <X size={20} color={isDark ? '#6ee7b7' : '#047857'} />
              </TouchableOpacity>
            </View>
            <View
              className={`mt-4 flex-row items-center rounded-xl border px-3 ${
                isDark
                  ? 'border-slate-700 bg-slate-800'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <Search size={18} color={isDark ? '#94a3b8' : '#64748b'} />
              <TextInput
                value={unitQuery}
                onChangeText={setUnitQuery}
                placeholder="Search by code or name"
                placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                className={`h-12 flex-1 px-3 ${titleClasses}`}
                autoCapitalize="none"
              />
            </View>
            <ScrollView
              className="mt-4 flex-1"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              {unitsLoading ? (
                <ActivityIndicator color="#10b981" />
              ) : availableUnits.length ? (
                availableUnits.map(unit => (
                  <Pressable
                    key={unit.code}
                    onPress={() => {
                      setSelectedUnitCode(unit.code);
                      setSelectedUnitName(unit.name);
                      setUnitPickerOpen(false);
                      setUnitQuery('');
                      void startSession(unit.code);
                    }}
                    className={`mb-2 rounded-xl border p-4 ${
                      unit.code === selectedUnitCode
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : isDark
                        ? 'border-slate-700 bg-slate-800'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <Text className={`font-bold ${titleClasses}`}>
                      {unit.code}
                    </Text>
                    <Text className={`mt-1 text-sm ${bodyClasses}`}>
                      {unit.name}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text className={`py-8 text-center ${bodyClasses}`}>
                  No teaching units found.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default TakeInPersonAttendance;
