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
import type { InPersonSession } from '../types/inPerson';
import { createAttendancePin } from '../security/attendancePin';
import {
  PIN_ROTATION_SECONDS,
  QR_ROTATION_SECONDS,
} from '../security/attendanceProtocol';
import { nowEpochMs } from '../security/serverClock';
import {
  createSignedPayload,
  encodeAttendancePayload,
  createCompactBlePayload,
} from '../security/attendancePayload';
import { getAttendanceSessionSecret } from '../../../shared/security/secureKeyStorage';
import { adaptiveConfig } from '../../../shared/utils/adaptiveAttendanceConfig';
import { normalizeUnitCode } from '../../../shared/utils/unitCodes';
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
import { loadUnitMappings } from '../../../shared/storage/unitMappings';
import { getCachedInPersonSessionById } from '../../../shared/storage/inPersonSessionCache';
import { useUnitSelection } from '../../unit-selection/hooks/useUnitSelection';
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
  const blePermissionsGrantedRef = useRef<boolean | null>(null);
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

  const checkBlePermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || Number(Platform.Version) < 31) return true;
    
    // Check cached result first
    if (blePermissionsGrantedRef.current !== null) {
      return blePermissionsGrantedRef.current;
    }
    
    try {
      // Check current permission status without requesting
      const [connectStatus, advertiseStatus] = await Promise.all([
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT),
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE),
      ]);
      const granted = connectStatus && advertiseStatus;
      blePermissionsGrantedRef.current = granted;
      return granted;
    } catch (error) {
      console.warn('Failed to check Bluetooth permissions:', error);
      return false;
    }
  };

  const ensureBlePermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || Number(Platform.Version) < 31) return true;
    
    try {
      // Request permissions (shows dialog if not granted)
      const permissions = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      ]);
      const granted = Object.values(permissions).every(
        value => value === PermissionsAndroid.RESULTS.GRANTED,
      );
      blePermissionsGrantedRef.current = granted;
      return granted;
    } catch (error) {
      console.warn('Failed to request Bluetooth permissions:', error);
      blePermissionsGrantedRef.current = false;
      return false;
    }
  };

  const enableBluetooth = async () => {
    try {
      // First, ensure Bluetooth hardware is enabled
      await NativeBLEAdvertiser.requestEnableBluetooth();
      await refreshBluetooth();
      
      // Then request app permissions (only on Android 12+)
      if (Platform.OS === 'android' && Number(Platform.Version) >= 31) {
        const permissionsGranted = await ensureBlePermissions();
        if (!permissionsGranted) {
          Alert.alert(
            'Bluetooth Permissions Required',
            'Please grant Bluetooth permissions in Settings to use BLE attendance.',
          );
        }
      }
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

  // Proactively check permissions when Bluetooth is ready and session starts
  useEffect(() => {
    if (!session || !bluetoothEnabled || !bleAdvertisingSupported) return;
    if (Platform.OS !== 'android' || Number(Platform.Version) < 31) return;
    
    let mounted = true;
    const checkPermissions = async () => {
      // Only check, don't request yet - let the user see the state first
      const hasPermissions = await checkBlePermissions();
      if (!mounted) return;
      
      if (!hasPermissions) {
        // Show error message prompting user to tap to grant
        setBleStartError('Bluetooth permissions required. Tap to grant permissions.');
      }
    };
    
    void checkPermissions();
    return () => { mounted = false; };
  }, [session, bluetoothEnabled, bleAdvertisingSupported]);

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
      // Prefer the local WatermelonDB-backed unit-mapping cache
      // (adaptiveConfig, already populated in-memory by useUnitSelection on
      // this screen — no API call) over session.bleUnitId for the BLE
      // payload specifically. session.bleUnitId briefly holds whatever the
      // claim happened to resolve at claim time; adaptiveConfig, once
      // learned (including by that same claim — see useInPersonSession's
      // saveUnitMappings call), is durable and doesn't depend on session's
      // object identity or claim timing, so BLE availability stops
      // depending on the claim/session lifecycle at all.
      const localBleUnitId =
        adaptiveConfig.getUnitId(session.unitCode) ?? session.bleUnitId;
      const bleSession =
        localBleUnitId !== session.bleUnitId
          ? { ...session, bleUnitId: localBleUnitId }
          : session;
      const [qr, currentPin, ble] = await Promise.all([
        createSignedPayload(session, secret),
        createAttendancePin(session, secret),
        createCompactBlePayload(bleSession, secret).catch(() => null),
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
            // Check permissions without requesting (non-intrusive)
            const permissionsGranted = await checkBlePermissions();
            if (!permissionsGranted) {
              advertisedPayloadRef.current = null;
              setBleActive(false);
              setBleStartError(
                'Bluetooth permissions required. Tap to grant permissions.',
              );
              return;
            }
            
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
            setBleStartError(null); // Clear any previous errors on success
          } catch (error) {
            advertisedPayloadRef.current = null;
            setBleActive(false);
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('permission')) {
              // Permission was revoked, clear cache
              blePermissionsGrantedRef.current = false;
              setBleStartError(
                'Bluetooth permissions denied. Grant permissions in Settings.',
              );
            } else if (errorMessage.includes('timeout') || errorMessage.includes('not respond')) {
              setBleStartError(
                'BLE advertising timed out. Restart Bluetooth and try again.',
              );
            } else {
              setBleStartError(
                'Unable to start BLE advertising. Check Bluetooth is enabled.',
              );
            }
          }
        } else {
          // Already advertising the correct payload, keep status active
          if (!bleActive) {
            setBleActive(true);
            setBleStartError(null);
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
        Math.floor(nowEpochMs() / 1_000) % QR_ROTATION_SECONDS;
      setQrRemainingSeconds(QR_ROTATION_SECONDS - currentWindow);
    };
    const updatePinTimer = () => {
      setPinRemainingSeconds(
        PIN_ROTATION_SECONDS -
          (Math.floor(nowEpochMs() / 1_000) % PIN_ROTATION_SECONDS),
      );
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
        Math.max(0, Math.ceil((session.expiresAt - nowEpochMs()) / 1_000)),
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
      Math.max(0, session.expiresAt - nowEpochMs()) + 100,
    );
    return () => clearTimeout(timeout);
  }, [end, session]);

  // Resets the unit picker back to its initial "Tap to choose a teaching
  // unit" state once a session genuinely ends (session goes from set to
  // null) — not on the initial mount (already null) or the brief gap
  // between picking a unit and the session actually being created (also
  // null, but selectedUnitCode is deliberately shown there already), which
  // is why this tracks the previous value instead of just checking !session.
  const previousSessionRef = useRef<InPersonSession | null>(null);
  useEffect(() => {
    if (previousSessionRef.current && !session) {
      setSelectedUnitCode('');
      setSelectedUnitName('');
    }
    previousSessionRef.current = session;
  }, [session]);

  const startSession = async (unitCode = selectedUnitCode) => {
    if (!unitCode || session || sessionStartingRef.current) return;
    sessionStartingRef.current = true;
    try {
      // Try to get BLE unit ID from multiple sources (offline-first)
      const cachedBleUnitId = adaptiveConfig.getUnitId(unitCode);
      const storedMappings = userId
        ? await loadUnitMappings({
            userId,
            role: 'lecturer',
            institutionId,
          }).catch(() => [])
        : [];
      const normalizedUnitCode = unitCode.trim().toUpperCase().replace(/\s+/g, '');
      const storedMapping = storedMappings.find(
        mapping =>
          mapping.unitCode.trim().toUpperCase().replace(/\s+/g, '') ===
          normalizedUnitCode,
      );
      const storedBleUnitId = storedMapping?.bleId
        ? Number(storedMapping.bleId)
        : null;
      let bleUnitId = cachedBleUnitId ?? storedBleUnitId;

      // Start session regardless of BLE availability
      // Session will work with QR code and PIN even without BLE
      //
      // useInPersonSession.start() generates the full session identity
      // locally and begins broadcasting instantly, online or not, then
      // claims it server-side in the background (retrying until it
      // succeeds) so a signed manifest becomes available as soon as
      // connectivity allows — that's the only thing a student device can
      // verify fully offline.
      await start({
        unitCode,
        durationMinutes: 10,
        bleUnitId,
      });
      
      // Show warning if BLE is not available (but don't block)
      if (bleUnitId == null) {
        setBleStartError('BLE unit mapping unavailable. QR and PIN methods will still work.');
      }
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
        contentContainerStyle={{
          paddingHorizontal: isTablet ? 32 : 20,
          paddingTop: 24,
          paddingBottom: 32,
          flexGrow: 1,
        }}
      >
        <View>
          <View className="mb-6 items-center">
            <Text className={`mt-2 text-center text-sm ${bodyClasses}`}>
              Select unit to start attendance session. Enable Bluetooth for faster checkins. Students can also check in using the QR code or PIN.
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
                onRequestBlePermissions={async () => {
                  const granted = await ensureBlePermissions();
                  if (granted) {
                    setBleStartError(null);
                    await refreshBluetooth();
                  } else {
                    Alert.alert(
                      'Permissions Required',
                      'Bluetooth permissions are required for BLE attendance. Please grant them in Settings.',
                    );
                  }
                }}
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
        <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-black/40">
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
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default TakeInPersonAttendance;
