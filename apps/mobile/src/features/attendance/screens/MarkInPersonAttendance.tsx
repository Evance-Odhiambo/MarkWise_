import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AttendanceStackParamList } from '../../../navigation/types';
import { useTheme } from '../../theme/context/ThemeContext';
import { useResponsive } from '../../theme/hooks/useResponsive';
import { useAuth } from '../../auth/context/AuthContext';
import {
  getInPersonSession,
  getInPersonSessionByBleNonce,
} from '../api/inPersonAttendanceApi';
import { createSubmittedPinPayload } from '../security/attendancePin';
import { PinInput } from '../components/PinInput';
import { useInPersonCapture } from '../hooks/useInPersonCapture';
import { useAttendanceSync } from '../hooks/useAttendanceSync';
import type { InPersonSession } from '../types/inPerson';
import {
  decodeAttendancePayload,
  decodeCompactBlePayload,
} from '../security/attendancePayload';
import {
  createRelayPayload,
  decodeRelayPayload,
} from '../security/attendanceRelay';
import { QRCodeDisplay } from '../components/in-person/QRCodeDisplay';
import { AttendanceBackHeader } from '../components/AttendanceBackHeader';
import { StudentAttendanceSurface } from '../components/in-person/StudentAttendanceSurface';
import NativeBLEScanner from '../../native/NativeBLEScanner';
import NativeBLEAdvertiser from '../../native/NativeBLEAdvertiser';
import NativeAccelerometer from '../../native/NativeAccelerometer';
import {
  cacheInPersonSession,
  getCachedInPersonSession,
  getCachedInPersonSessionById,
} from '../../../shared/storage/inPersonSessionCache';
import {
  FadeSlideIn,
  PulseView,
  SpinView,
} from '../components/in-person/AnimatedAttendance';
import {
  HelpCircle,
  Info,
  BookOpen,
  Clock,
  Radio,
  WifiOff,
  QrCode,
  KeyRound,
  PersonStanding,
} from 'lucide-react-native';

type Props = NativeStackScreenProps<AttendanceStackParamList, 'MarkInPerson'>;

const MarkInPersonAttendance = ({ navigation, route }: Props) => {
  const MOTION_WINDOW_MS = 8_000;
  const MOTION_DELTA_THRESHOLD = 0.45;
  const { isDark } = useTheme();
  const { isTablet } = useResponsive();
  const { token, userId } = useAuth();
  const [session, setSession] = useState<InPersonSession | null>(null);
  const [rawPayload, setRawPayload] = useState('');
  const [method, setMethod] = useState<'qr' | 'ble'>('qr');
  const [loading, setLoading] = useState(Boolean(route.params.sessionId));
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [relayPayload, setRelayPayload] = useState<string | null>(null);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [motionVerified, setMotionVerified] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinRemainingSeconds, setPinRemainingSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const autoMarkedSessions = useRef(new Set<string>());
  const lastAcceleration = useRef<{ x: number; y: number; z: number } | null>(
    null,
  );
  const lastMotionAt = useRef(0);
  const pendingBleJoin = useRef<{
    session: InPersonSession;
    evidence: string;
    method: 'ble';
    rssi: number;
  } | null>(null);
  const pendingQrJoin = useRef<{
    session: InPersonSession;
    evidence: string;
    method: 'qr';
  } | null>(null);
  const { capture } = useInPersonCapture(session);
  const { sync } = useAttendanceSync(token);
  const screenClasses = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const titleClasses = isDark ? 'text-white' : 'text-slate-900';
  const bodyClasses = isDark ? 'text-slate-300' : 'text-slate-600';

  const refreshBluetooth = async () => {
    try {
      setBluetoothEnabled(await NativeBLEAdvertiser.isBluetoothEnabled());
    } catch {
      setBluetoothEnabled(false);
    }
  };

  const enableBluetooth = async () => {
    try {
      await NativeBLEAdvertiser.requestEnableBluetooth();
      const enabled = await NativeBLEAdvertiser.isBluetoothEnabled();
      setBluetoothEnabled(enabled);
      if (enabled) await NativeBLEScanner.startScanNoFilter();
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
    const update = () => {
      if (!session || session.status !== 'active') {
        setRemainingSeconds(0);
        return;
      }
      setRemainingSeconds(
        Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 1000)),
      );
    };
    update();
    const timer = setInterval(update, 1_000);
    return () => clearInterval(timer);
  }, [session]);

  useEffect(() => {
    const update = () => {
      setPinRemainingSeconds(
        30 - (Math.floor(Date.now() / 1000) % 30),
      );
    };
    update();
    const timer = setInterval(update, 1_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const listener = NativeAccelerometer.addListener(data => {
      const previous = lastAcceleration.current;
      lastAcceleration.current = data;
      if (!previous) return;

      const delta = Math.sqrt(
        (data.x - previous.x) ** 2 +
          (data.y - previous.y) ** 2 +
          (data.z - previous.z) ** 2,
      );
      if (delta >= MOTION_DELTA_THRESHOLD) {
        lastMotionAt.current = Date.now();
        setMotionVerified(true);
      }
    });
    NativeAccelerometer.start();
    const expiryTimer = setInterval(() => {
      const recent = Date.now() - lastMotionAt.current <= MOTION_WINDOW_MS;
      setMotionVerified(recent);
    }, 1_000);
    return () => {
      listener.remove();
      clearInterval(expiryTimer);
      NativeAccelerometer.stop();
    };
  }, []);

  const scheduleRelay = useCallback(
    async (attendanceSession: InPersonSession, evidence: string) => {
      if (!userId || evidence.trim().startsWith('MWIR1:')) return;
      const relayQr = await createRelayPayload(
        evidence,
        attendanceSession.id,
        userId,
      );
      setRelayPayload(relayQr);
    },
    [userId],
  );

  const handleJoin = useCallback(
    async (override?: {
      session: InPersonSession;
      evidence: string;
      method: 'qr' | 'ble' | 'pin';
      rssi?: number;
    }) => {
      const attendanceSession = override?.session ?? session;
      if (!attendanceSession || !token) return;
      setSubmitting(true);
      try {
        const attendanceMethod = override?.method ?? method;
        const evidence = override?.evidence ?? rawPayload.trim();
        const record = await capture(
          evidence,
          attendanceMethod,
          attendanceSession,
        );
        const result = await sync(record);
        if (
          result.data.status === 'verified' ||
          result.data.status === 'duplicate'
        )
          await scheduleRelay(attendanceSession, evidence);
        setSuccess(
          result.data.status === 'verified' ||
            result.data.status === 'duplicate' ||
            result.data.status === 'queued',
        );
      } catch (error) {
        if (override) autoMarkedSessions.current.delete(override.session.id);
        Alert.alert(
          'Attendance not verified',
          error instanceof Error
            ? error.message
            : 'The server rejected this attendance proof.',
        );
      } finally {
        setSubmitting(false);
      }
    },
    [capture, method, rawPayload, scheduleRelay, session, sync, token],
  );

  const submitPin = async () => {
    if (!session || session.status !== 'active') {
      Alert.alert(
        'Session not detected',
        'Scan the lecturer QR code or wait for Bluetooth detection first.',
      );
      return;
    }
    if (session.expiresAt <= Date.now()) {
      Alert.alert('Session ended', 'This attendance session is no longer active.');
      return;
    }
    try {
      const payload = createSubmittedPinPayload(session, pinValue);
      setShowPin(false);
      setPinValue('');
      await handleJoin({ session, evidence: payload, method: 'pin' });
    } catch (error) {
      Alert.alert(
        'PIN not submitted',
        error instanceof Error
          ? error.message
          : 'Enter the current six-digit PIN.',
      );
    }
  };

  const autoMarkBle = useCallback(
    (attendanceSession: InPersonSession, evidence: string, rssi: number) => {
      if (autoMarkedSessions.current.has(attendanceSession.id)) return;
      if (Date.now() - lastMotionAt.current > MOTION_WINDOW_MS) {
        pendingBleJoin.current = {
          session: attendanceSession,
          evidence,
          method: 'ble',
          rssi,
        };
        return;
      }
      autoMarkedSessions.current.add(attendanceSession.id);
      void handleJoin({
        session: attendanceSession,
        evidence,
        method: 'ble',
        rssi,
      });
    },
    [handleJoin],
  );

  useEffect(() => {
    if (!motionVerified) return;
    if (pendingBleJoin.current) {
      const pending = pendingBleJoin.current;
      pendingBleJoin.current = null;
      autoMarkBle(pending.session, pending.evidence, pending.rssi);
      return;
    }
    if (pendingQrJoin.current) {
      const pending = pendingQrJoin.current;
      pendingQrJoin.current = null;
      void handleJoin(pending);
    }
  }, [autoMarkBle, handleJoin, motionVerified]);

  useEffect(() => {
    const sessionId = route.params.sessionId;
    if (!sessionId) {
      setLoading(false);
      return;
    }
    let mounted = true;
    const loadSession = async () => {
      const cached = await getCachedInPersonSessionById(sessionId).catch(
        () => null,
      );
      if (cached && mounted) {
        setSession(cached);
        setLoading(false);
      }
      if (!token) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const response = await getInPersonSession(sessionId, token);
        await cacheInPersonSession(response.data);
        if (mounted) setSession(response.data);
      } catch (error) {
        if (!cached && mounted) {
          Alert.alert(
            'Unable to load session',
            error instanceof Error ? error.message : 'Please try again.',
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadSession();
    return () => {
      mounted = false;
    };
  }, [route.params.sessionId, token]);

  useEffect(() => {
    if (!token) return;
    const listener = NativeBLEScanner.addDeviceListener(device => {
      if (!device.payload) return;
      const value = `MWBLE1:${device.payload}`;
      try {
        const beacon = decodeCompactBlePayload(value);
        getInPersonSessionByBleNonce(beacon.nonce, token)
          .then(async response => {
            await cacheInPersonSession(response.data);
            setRawPayload(value);
            setSession(response.data);
            setMethod('ble');
            autoMarkBle(response.data, value, device.rssi);
          })
          .catch(async () => {
            const cached = await getCachedInPersonSession(beacon.nonce);
            if (cached) {
              setRawPayload(value);
              setSession(cached);
              setMethod('ble');
              autoMarkBle(cached, value, device.rssi);
            }
          });
      } catch {
        /* ignore unrelated beacons */
      }
    });
    void NativeBLEScanner.startScanNoFilter().catch(() => undefined);
    return () => {
      listener.remove();
      void NativeBLEScanner.stopScan().catch(() => undefined);
    };
  }, [autoMarkBle, token]);

  const loadQrSession = async (value: string) => {
    setScanCount(current => Math.min(2, current + 1));
    setRawPayload(value);
    try {
      if (value.trim().startsWith('MWIR1:')) {
        const relay = decodeRelayPayload(value.trim());
        if (!token) return;
        const parent = relay.parentPayload.startsWith('MWBLE1:')
          ? decodeCompactBlePayload(relay.parentPayload)
          : decodeAttendancePayload(relay.parentPayload);
        const parentNonce =
          'nonce' in parent ? parent.nonce : parent.sessionNonce;
        const cached = await getCachedInPersonSession(parentNonce);
        let resolvedSession = cached;
        if (!resolvedSession) {
          const response = await getInPersonSession(relay.sessionId, token);
          await cacheInPersonSession(response.data);
          resolvedSession = response.data;
        }
        if (!resolvedSession)
          throw new Error('Unable to identify this session');
        setSession(resolvedSession);
        setRawPayload(value.trim());
        setMethod('qr');
        const qrJoin = {
          session: resolvedSession,
          evidence: value.trim(),
          method: 'qr',
        } as const;
        if (Date.now() - lastMotionAt.current > MOTION_WINDOW_MS)
          pendingQrJoin.current = qrJoin;
        else void handleJoin(qrJoin);
        return;
      }
      const payload = decodeAttendancePayload(value.trim());
      const cached = await getCachedInPersonSession(payload.sessionNonce);
      let resolvedSession = cached;
      if (!resolvedSession) {
        if (!token) return;
        setLoading(true);
        const response = await getInPersonSession(payload.sessionId, token);
        await cacheInPersonSession(response.data);
        resolvedSession = response.data;
      }
      setSession(resolvedSession);
      setMethod('qr');
      const qrJoin = {
        session: resolvedSession,
        evidence: value.trim(),
        method: 'qr',
      } as const;
      if (Date.now() - lastMotionAt.current > MOTION_WINDOW_MS)
        pendingQrJoin.current = qrJoin;
      else void handleJoin(qrJoin);
    } catch (error) {
      Alert.alert(
        'Invalid QR payload',
        error instanceof Error
          ? error.message
          : 'Unable to identify this session.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${screenClasses}`}>
      <Modal
        visible={showPin}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPin(false)}
      >
        <SafeAreaView className="flex-1 bg-black/50">
          <Pressable
            className="flex-1 justify-start px-4 pt-4"
            onPress={() => setShowPin(false)}
          >
            <Pressable
              className={`rounded-3xl p-6 ${isDark ? 'bg-slate-900' : 'bg-white'}`}
              onPress={event => event.stopPropagation()}
            >
              <Text className={`text-xl font-extrabold ${titleClasses}`}>
                Enter attendance PIN
              </Text>
              <Text className={`mt-2 ${bodyClasses}`}>
                Enter the current PIN displayed by your lecturer.
              </Text>
              <Text className="mt-4 text-center font-bold text-emerald-600">
                PIN rotates in {pinRemainingSeconds}s
              </Text>
              <View className="mt-5">
                <PinInput value={pinValue} onChangeText={setPinValue} />
              </View>
              <TouchableOpacity
                disabled={submitting || pinValue.length !== 6}
                onPress={() => void submitPin()}
                className={`mt-6 rounded-xl py-4 ${
                  submitting || pinValue.length !== 6
                    ? 'bg-slate-300'
                    : 'bg-emerald-600'
                }`}
              >
                <Text className="text-center font-bold text-white">
                  {submitting ? 'Submitting...' : 'Submit PIN'}
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={showHelp}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHelp(false)}
      >
        <Pressable
          onPress={() => setShowHelp(false)}
          className="flex-1 items-center justify-center bg-black/60 px-5"
        >
          <View
            className={`w-full rounded-3xl p-6 ${
              isDark ? 'bg-slate-900' : 'bg-white'
            }`}
          >
            <Text className={`text-xl font-extrabold ${titleClasses}`}>
              About auto attendance
            </Text>
            <Text className={`mt-3 leading-6 ${bodyClasses}`}>
              Keep Bluetooth enabled and stay near the lecturer. MarkWise can
              verify attendance automatically, with QR and PIN available as
              fallbacks.
            </Text>
            <TouchableOpacity
              onPress={() => setShowHelp(false)}
              className="mt-5 rounded-xl bg-emerald-600 py-3"
            >
              <Text className="text-center font-bold text-white">Got it</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      <Modal
        visible={showInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfo(false)}
      >
        <Pressable
          onPress={() => setShowInfo(false)}
          className="flex-1 items-center justify-center bg-black/60 px-5"
        >
          <View
            className={`w-full rounded-3xl p-6 ${
              isDark ? 'bg-slate-900' : 'bg-white'
            }`}
          >
            <Text className={`text-xl font-extrabold ${titleClasses}`}>
              Why Bluetooth?
            </Text>
            <Text className={`mt-3 leading-6 ${bodyClasses}`}>
              Bluetooth detects nearby attendance signals without requiring a
              visible QR Code scan or PIN entry.
            </Text>
            <TouchableOpacity
              onPress={() => setShowInfo(false)}
              className="mt-5 rounded-xl bg-emerald-600 py-3"
            >
              <Text className="text-center font-bold text-white">Got it</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      <AttendanceBackHeader
        title="In Person Attendance"
        subtitle="Mark your attendance on site"
        isDark={isDark}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <FadeSlideIn>
          <View
            className={`mx-auto w-full max-w-3xl px-${
              isTablet ? '8' : '5'
            } py-6`}
          >
            <View className="mb-5 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600">
                  <Radio size={22} color="white" />
                </View>
                <View>
                  <Text className={`text-2xl font-extrabold ${titleClasses}`}>
                    Mark Attendance
                  </Text>
                  <Text className={`mt-1 text-xs ${bodyClasses}`}>
                    In-person attendance
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={() => setShowHelp(true)}
                  className="mr-3"
                >
                  <HelpCircle
                    size={23}
                    color={isDark ? '#cbd5e1' : '#64748b'}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowInfo(true)}>
                  <Info size={23} color={isDark ? '#cbd5e1' : '#64748b'} />
                </TouchableOpacity>
              </View>
            </View>
            <View className="mb-4 flex-row items-center rounded-xl border border-sky-500/20 bg-sky-500/10 p-3">
              <WifiOff size={17} color="#0284c7" />
              <Text className="ml-2 flex-1 text-xs font-semibold text-sky-700">
                Offline-ready: attendance is saved locally and syncs when
                online.
              </Text>
            </View>
            {loading ? (
              <View className="items-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8">
                <SpinView>
                  <ActivityIndicator size="large" color="#10b981" />
                </SpinView>
                <Text className={`mt-4 ${bodyClasses}`}>
                  Loading attendance session...
                </Text>
              </View>
            ) : success ? (
              <View className="gap-4">
                <PulseView>
                  <View className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                    <Text className="text-center text-2xl font-bold text-emerald-700">
                      Attendance verified
                    </Text>
                    <Text className={`mt-2 text-center ${bodyClasses}`}>
                      Your attendance was accepted by the server. You can now
                      help nearby classmates.
                    </Text>
                  </View>
                </PulseView>
                {relayPayload && (
                  <View className="items-center rounded-2xl border border-slate-200 bg-white p-5">
                    <Text className="mb-4 text-lg font-bold text-slate-900">
                      Secure relay QR
                    </Text>
                    <QRCodeDisplay value={relayPayload} size={230} />
                    <Text className={`mt-3 text-center text-xs ${bodyClasses}`}>
                      This relay proof is bound to your verified attendance and
                      device key.
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  className="items-center rounded-2xl bg-emerald-600 py-4"
                >
                  <Text className="font-bold text-white">Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <StudentAttendanceSurface
                  onQrScan={value => void loadQrSession(value)}
                />
                <View
                  className={`mt-4 rounded-2xl border p-4 ${
                    isDark
                      ? 'border-slate-700 bg-slate-900'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text className={`font-extrabold ${titleClasses}`}>
                      Scan progress
                    </Text>
                    <Text className="font-extrabold text-emerald-600">
                      {scanCount}/2
                    </Text>
                  </View>
                  <View className="h-2 flex-row gap-2">
                    <View
                      className={`flex-1 rounded-full ${
                        scanCount >= 1 ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                    <View
                      className={`flex-1 rounded-full ${
                        scanCount >= 2 ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                  </View>
                  <Text className={`mt-3 text-xs ${bodyClasses}`}>
                    {method === 'ble'
                      ? 'Waiting for a nearby lecturer beacon.'
                      : scanCount
                      ? 'Session detected. Attendance will be submitted automatically.'
                      : 'Scan the lecturer QR code to submit automatically.'}
                  </Text>
                </View>
                <View
                  className={`mt-4 flex-row rounded-2xl border p-4 ${
                    isDark
                      ? 'border-slate-700 bg-slate-900'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <View className="flex-1 items-center">
                    <BookOpen size={17} color="#059669" />
                    <Text className={`mt-1 text-[11px] ${bodyClasses}`}>
                      Unit
                    </Text>
                    <Text className={`mt-1 font-extrabold ${titleClasses}`}>
                      {session?.unitCode ?? '—'}
                    </Text>
                  </View>
                  <View className="mx-3 w-px bg-slate-200" />
                  <View className="flex-1 items-center">
                    <Radio size={17} color="#2563eb" />
                    <Text className={`mt-1 text-[11px] ${bodyClasses}`}>
                      Mode
                    </Text>
                    <Text className={`mt-1 font-extrabold ${titleClasses}`}>
                      {method.toUpperCase()}
                    </Text>
                  </View>
                  <View className="mx-3 w-px bg-slate-200" />
                  <View className="flex-1 items-center">
                    <Clock size={17} color="#d97706" />
                    <Text className={`mt-1 text-[11px] ${bodyClasses}`}>
                      Status
                    </Text>
                    <Text className="mt-1 font-extrabold text-emerald-600">
                      {success ? 'Done' : 'Ready'}
                    </Text>
                  </View>
                </View>
                <View
                  className={`mt-4 rounded-2xl border border-emerald-500/30 p-5 ${
                    isDark ? 'bg-slate-900' : 'bg-white'
                  }`}
                >
                  <View className="flex-row items-center">
                    <Radio
                      size={21}
                      color={bluetoothEnabled ? '#059669' : '#d97706'}
                    />
                    <Text
                      className={`ml-2 text-lg font-extrabold ${titleClasses}`}
                    >
                      Auto Attendance
                    </Text>
                  </View>
                  <Text
                    className={`mt-2 text-sm ${
                      bluetoothEnabled ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {bluetoothEnabled
                      ? 'Automatic detection is active'
                      : 'Enable Bluetooth for automatic attendance'}
                  </Text>
                  {!bluetoothEnabled && (
                    <TouchableOpacity
                      onPress={() => void enableBluetooth()}
                      className="mt-3 rounded-xl bg-amber-600 py-3"
                    >
                      <Text className="text-center font-bold text-white">
                        Enable Bluetooth
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View
                  className={`mt-4 rounded-2xl border p-4 ${
                    motionVerified
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : isDark
                      ? 'border-slate-700 bg-slate-900'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className={`font-extrabold ${titleClasses}`}>
                      Motion check
                    </Text>
                    <Text
                      className={`font-bold ${
                        motionVerified ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {motionVerified ? 'Verified' : 'Pending'}
                    </Text>
                  </View>
                  <Text className={`mt-2 text-sm ${bodyClasses}`}>
                    {motionVerified
                      ? 'Recent movement confirmed. BLE attendance can be submitted.'
                      : 'Move your phone slightly to confirm that the device is with you.'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </FadeSlideIn>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MarkInPersonAttendance;
