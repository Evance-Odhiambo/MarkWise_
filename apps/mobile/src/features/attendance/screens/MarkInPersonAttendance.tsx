import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
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
  getInPersonSessionByRelayToken,
  getActiveInPersonSessionByUnit,
  submitPinByUnit,
  ApiRequestError,
} from '../api/inPersonAttendanceApi';
import { createSubmittedPinPayload } from '../security/attendancePin';
import { RELAY_ROTATION_SECONDS } from '../security/attendanceProtocol';
import { shouldElectRelay } from '../security/relayElection';
import { PinInput } from '../components/PinInput';
import { useUnitSelection } from '../../unit-selection/hooks/useUnitSelection';
import { enqueuePendingPin } from '../../../shared/storage/pendingPinQueue';
import { getOrCreateSecureDeviceId } from '../../../shared/storage/secureDeviceId';
import { useInPersonCapture } from '../hooks/useInPersonCapture';
import { useAttendanceSync } from '../hooks/useAttendanceSync';
import type { InPersonSession } from '../types/inPerson';
import {
  decodeAttendancePayload,
  decodeCompactBlePayload,
  createCompactBlePayload,
} from '../security/attendancePayload';
import {
  createRelayPayload,
  decodeRelayPayload,
  decodeOpaqueRelayPayload,
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
  getCachedActiveInPersonSessionByUnit,
} from '../../../shared/storage/inPersonSessionCache';
import {
  FadeSlideIn,
  PulseView,
  SpinView,
} from '../components/in-person/AnimatedAttendance';
import {
  Clock,
  Radio,
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
  const [relayBlePayload, setRelayBlePayload] = useState<string | null>(null);
  const [relayBleActive, setRelayBleActive] = useState(false);
  const [relayError, setRelayError] = useState<string | null>(null);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [bleAdvertisingSupported, setBleAdvertisingSupported] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [motionVerified, setMotionVerified] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinUnitCode, setPinUnitCode] = useState('');
  const [pinRemainingSeconds, setPinRemainingSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const pinWindowRef = useRef<number | null>(null);
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
  const relayParentRef = useRef<{
    session: InPersonSession;
    evidence: string;
  } | null>(null);
  const relayNeighborsRef = useRef(
    new Map<string, { nonce: number; seenAt: number }>(),
  );
  const { capture } = useInPersonCapture(session);
  const { sync } = useAttendanceSync(token);
  const screenClasses = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const titleClasses = isDark ? 'text-white' : 'text-slate-900';
  const bodyClasses = isDark ? 'text-slate-300' : 'text-slate-600';
  const { selectedUnits: enrolledUnits } = useUnitSelection('student');

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

  // Some Android devices expose the advertiser a moment after Bluetooth is
  // enabled. Retry briefly instead of showing a false unsupported state.
  useEffect(() => {
    let cancelled = false;
    if (!bluetoothEnabled) {
      setBleAdvertisingSupported(false);
      return;
    }
    const check = async (attempt = 1) => {
      try {
        const supported = await NativeBLEAdvertiser.isAdvertisingSupported();
        if (cancelled) return;
        if (!supported && attempt < 4) {
          setTimeout(() => void check(attempt + 1), 500);
          return;
        }
        setBleAdvertisingSupported(Boolean(supported));
      } catch {
        if (!cancelled) setBleAdvertisingSupported(false);
      }
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, [bluetoothEnabled]);

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
      const currentWindow = Math.floor(Date.now() / 1000 / 30);
      if (
        pinWindowRef.current !== null &&
        pinWindowRef.current !== currentWindow
      ) {
        setPinValue('');
      }
      pinWindowRef.current = currentWindow;
      setPinRemainingSeconds(30 - (Math.floor(Date.now() / 1000) % 30));
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
    async (
      attendanceSession: InPersonSession,
      evidence: string,
      attendanceMethod: 'qr' | 'ble' | 'pin',
      verificationStatus: 'verified' | 'duplicate' | 'queued' = 'verified',
      rssi?: number,
    ) => {
      if (
        !userId ||
        (attendanceMethod === 'pin' &&
          verificationStatus !== 'verified' &&
          verificationStatus !== 'duplicate') ||
        evidence.trim().startsWith('MWIR1:')
      )
        return;
      if (attendanceMethod === 'ble') {
        const now = Date.now();
        for (const [id, neighbor] of relayNeighborsRef.current) {
          if (now - neighbor.seenAt > RELAY_ROTATION_SECONDS * 3_000)
            relayNeighborsRef.current.delete(id);
        }
        const neighborCount = Array.from(relayNeighborsRef.current.values()).filter(
          neighbor =>
            neighbor.nonce === attendanceSession.sessionNonce &&
            now - neighbor.seenAt <= RELAY_ROTATION_SECONDS * 3_000,
        ).length;
        if (!shouldElectRelay({ rssi, neighborCount })) return;
      }
      relayParentRef.current = { session: attendanceSession, evidence };
      setRelayError(null);
      try {
        setRelayBlePayload(
          // BLE is a compact discovery signal. The signed relay QR carries
          // the relayer identity and proof; BLE rebroadcasts the 9-byte v1
          // session beacon for maximum room coverage.
          await createCompactBlePayload(attendanceSession, ''),
        );
      } catch {
        setRelayError(
          'Offline BLE relay is unavailable for this unit. The relay QR remains available.',
        );
      }

      // QR and BLE relay proofs are generated locally. The backend verifies
      // the relayer key and parent attendance when queued records sync.
    },
    [userId],
  );

  useEffect(() => {
    const parent = relayParentRef.current;
    if (!parent) return;
    let active = true;
    const updateQr = async () => {
      if (parent.session.expiresAt <= Date.now()) {
        if (active) setRelayPayload(null);
        return;
      }
      try {
        const value = await createRelayPayload(
          parent.evidence,
          parent.session.id,
          userId || '',
        );
        if (active) setRelayPayload(value);
      } catch {
        if (active) setRelayError('Unable to prepare the relay QR code.');
      }
    };
    void updateQr();
    const timer = setInterval(() => void updateQr(), 3_000);
    return () => {
      active = false;
      clearInterval(timer);
      relayParentRef.current = null;
    };
  }, [success, userId]);

  useEffect(() => {
    const stop = async () => {
      await NativeBLEAdvertiser.stopBackgroundAdvertising().catch(
        () => undefined,
      );
      setRelayBleActive(false);
    };
    if (
      !success ||
      !bluetoothEnabled ||
      !bleAdvertisingSupported ||
      !session ||
      session.expiresAt <= Date.now()
    ) {
      void stop();
      return;
    }
    let active = true;
    const advertiseCurrent = async () => {
      if (session.expiresAt <= Date.now()) {
        await stop();
        return;
      }
      try {
        const nextPayload = await createCompactBlePayload(session, '');
        const base64Payload = nextPayload.slice(7);
        if (Platform.OS === 'android')
          await NativeBLEAdvertiser.startBackgroundAdvertising(
            base64Payload,
            Math.ceil((session.expiresAt - Date.now()) / 1_000),
          );
        else await NativeBLEAdvertiser.startAdvertising(base64Payload);
        if (active) {
          setRelayBlePayload(nextPayload);
          setRelayBleActive(true);
        }
      } catch {
        if (active) {
          setRelayBleActive(false);
          setRelayError(
            'BLE relay could not start. Keep the relay QR visible instead.',
          );
        }
      }
    };
    void advertiseCurrent();
    const rotationTimer = setInterval(
      () => void advertiseCurrent(),
      RELAY_ROTATION_SECONDS * 1_000,
    );
    return () => {
      active = false;
      clearInterval(rotationTimer);
      void stop();
    };
  }, [bleAdvertisingSupported, bluetoothEnabled, session, success]);

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
        await scheduleRelay(
          attendanceSession,
          evidence,
          attendanceMethod,
          result.data.status,
          override?.rssi,
        );
        setSuccess(
          result.data.status === 'verified' ||
            result.data.status === 'duplicate' ||
            result.data.status === 'queued',
        );
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404) {
          Alert.alert(
            'Session not found',
            'There is no active attendance session for this unit.',
          );
          return;
        }
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
    const pinScannedAt = Date.now();
    if (!pinUnitCode) {
      Alert.alert(
        'Select a unit',
        'Choose the enrolled unit for this attendance PIN.',
      );
      return;
    }
    let pinSession = session;
    if (!pinSession || pinSession.unitCode !== pinUnitCode) {
      pinSession = await getCachedActiveInPersonSessionByUnit(pinUnitCode);
    }
    if (!pinSession || pinSession.unitCode !== pinUnitCode) {
      if (!token) return;
      try {
        const result = await submitPinByUnit(
          {
            unitCode: pinUnitCode,
            pin: pinValue,
            scannedAt: pinScannedAt,
            deviceId: await getOrCreateSecureDeviceId(),
          },
          token,
        );
        setShowPin(false);
        setPinValue('');
        if (result.data.status === 'queued') {
          await enqueuePendingPin({
            unitCode: pinUnitCode,
            pin: pinValue,
            scannedAt: pinScannedAt,
            deviceId: await getOrCreateSecureDeviceId(),
          });
          Alert.alert(
            'PIN saved for validation',
            'The lecturer session is not available yet. We will retry validation for 24 hours.',
          );
          return;
        }
        if (
          result.data.status === 'verified' ||
          result.data.status === 'duplicate'
        ) {
          try {
            const activeResponse = await getActiveInPersonSessionByUnit(
              pinUnitCode,
              token,
            );
            const activeSession = activeResponse.data;
            await cacheInPersonSession(activeSession);
            setSession(activeSession);
            await scheduleRelay(
              activeSession,
              createSubmittedPinPayload(activeSession, pinValue, pinScannedAt),
              'pin',
              result.data.status,
            );
          } catch {
            // Attendance is already accepted; relay setup is best effort.
          }
        }
        setSuccess(
          result.data.status === 'verified' ||
            result.data.status === 'duplicate',
        );
        return;
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404) {
          Alert.alert(
            'Session not found',
            'There is no active attendance session for this unit.',
          );
          return;
        }
        try {
          const pending = await enqueuePendingPin({
            unitCode: pinUnitCode,
            pin: pinValue,
            scannedAt: Date.now(),
            deviceId: await getOrCreateSecureDeviceId(),
          });
          setShowPin(false);
          setPinValue('');
          Alert.alert(
            'PIN saved offline',
            `PIN ${pending.unitCode} will be sent for validation when connectivity returns.`,
          );
        } catch {
          Alert.alert(
            'PIN not submitted',
            'The PIN could not be saved locally.',
          );
        }
        return;
      }
    }
    if (!pinSession || pinSession.status !== 'active') {
      Alert.alert(
        'Session not detected',
        'Scan the lecturer QR code or wait for Bluetooth detection first.',
      );
      return;
    }
    if (pinSession.expiresAt <= Date.now()) {
      Alert.alert(
        'Session ended',
        'This attendance session is no longer active.',
      );
      return;
    }
    try {
      const payload = createSubmittedPinPayload(pinSession, pinValue);
      setShowPin(false);
      setPinValue('');
      await handleJoin({
        session: pinSession,
        evidence: payload,
        method: 'pin',
      });
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
    const listener = NativeBLEScanner.addDeviceListener(async device => {
      if (!device.payload) return;
      const opaqueValue = `MWR1:${device.payload}`;
      try {
        const relayToken = decodeOpaqueRelayPayload(opaqueValue);
        if (!token) return;
        getInPersonSessionByRelayToken(relayToken, token)
          .then(async response => {
            await cacheInPersonSession(response.data);
            setRawPayload(opaqueValue);
            setSession(response.data);
            setMethod('ble');
            autoMarkBle(response.data, opaqueValue, device.rssi);
          })
          .catch(() => undefined);
        return;
      } catch {
        // This is a normal compact lecturer beacon or unrelated BLE device.
      }
      const value = `MWBLE1:${device.payload}`;
      try {
        const beacon = decodeCompactBlePayload(value);
        relayNeighborsRef.current.set(device.deviceId || device.payload, {
          nonce: beacon.nonce,
          seenAt: Date.now(),
        });
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
      if (value.trim().startsWith('MWR1:')) {
        if (!token) return;
        const relayToken = decodeOpaqueRelayPayload(value.trim());
        const response = await getInPersonSessionByRelayToken(
          relayToken,
          token,
        );
        await cacheInPersonSession(response.data);
        setSession(response.data);
        setMethod('qr');
        await handleJoin({
          session: response.data,
          evidence: value.trim(),
          method: 'qr',
        });
        return;
      }
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
          try {
            const response = await getInPersonSession(relay.sessionId, token);
            await cacheInPersonSession(response.data);
            resolvedSession = response.data;
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error('Failed to fetch relay session:', {
              sessionId: relay.sessionId,
              error: errorMsg,
            });
            
            if (relay.sessionId.startsWith('offline-')) {
              throw new Error(
                'This attendance relay was created from an offline session. The lecturer must be online.',
              );
            }
            
            throw new Error(`Could not find the session. ${errorMsg}`);
          }
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
        try {
          const response = await getInPersonSession(payload.sessionId, token);
          await cacheInPersonSession(response.data);
          resolvedSession = response.data;
        } catch (error) {
          // Provide more specific error for debugging
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error('Failed to fetch session:', {
            sessionId: payload.sessionId,
            error: errorMsg,
          });
          
          // Check if this is an offline session
          if (payload.sessionId.startsWith('offline-')) {
            throw new Error(
              'This session was created offline and is not available on the server. The lecturer needs to be online to create valid sessions.',
            );
          }
          
          throw new Error(`Could not find the session. ${errorMsg}`);
        }
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
        <View className="flex-1 bg-black/50">
          <Pressable
            className="flex-1 justify-start px-4 pt-4"
            onPress={() => setShowPin(false)}
          >
            <Pressable
              className={`rounded-3xl p-6 ${
                isDark ? 'bg-slate-900' : 'bg-white'
              }`}
              onPress={event => event.stopPropagation()}
            >
              <Text className={`text-xl font-extrabold ${titleClasses}`}>
                Enter attendance PIN
              </Text>
              <Text className={`mt-2 ${bodyClasses}`}>
                Get the current PIN from your lecturer or from a student who has
                already been marked through the secure relay.
              </Text>
              <View className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
                <Text className="text-sm font-semibold leading-5 text-amber-800">
                  Enter the PIN carefully. It rotates frequently, and an
                  incorrect or expired PIN will be rejected.
                </Text>
              </View>
              <Text className={`mt-5 mb-2 font-bold ${titleClasses}`}>
                Select enrolled unit
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {enrolledUnits.map(unit => (
                  <TouchableOpacity
                    key={unit.code}
                    onPress={() => setPinUnitCode(unit.code)}
                    className={`rounded-xl border px-4 py-3 ${
                      pinUnitCode === unit.code
                        ? 'border-emerald-500 bg-emerald-500/15'
                        : isDark
                        ? 'border-slate-700 bg-slate-800'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <Text className={`font-bold ${titleClasses}`}>
                      {unit.code}
                    </Text>
                    <Text className={`mt-1 text-xs ${bodyClasses}`}>
                      {unit.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {!enrolledUnits.length && (
                <Text className={`mt-3 text-sm ${bodyClasses}`}>
                  No enrolled units are available on this device.
                </Text>
              )}
              <Text className="mt-4 text-center font-bold text-emerald-600">
                PIN rotates in {pinRemainingSeconds}s
              </Text>
              <View className="mt-5">
                <PinInput value={pinValue} onChangeText={setPinValue} />
              </View>
              <TouchableOpacity
                disabled={submitting || pinValue.length !== 6 || !pinUnitCode}
                onPress={() => void submitPin()}
                className={`mt-6 rounded-xl py-4 ${
                  submitting || pinValue.length !== 6 || !pinUnitCode
                    ? 'bg-slate-300'
                    : 'bg-emerald-600'
                }`}
              >
                <Text className="text-center font-bold text-white">
                  {submitting ? 'Submitting...' : 'Submit PIN'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={submitting}
                onPress={() => {
                  setPinValue('');
                  setPinUnitCode('');
                  setShowPin(false);
                }}
                className={`mt-3 rounded-xl border py-4 ${
                  isDark ? 'border-slate-700' : 'border-slate-300'
                }`}
              >
                <Text
                  className={`text-center font-bold ${
                    isDark ? 'text-slate-200' : 'text-slate-700'
                  }`}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </View>
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
                      Rotating relay QR
                    </Text>
                    <QRCodeDisplay value={relayPayload} size={230} />
                    <Text className={`mt-3 text-center text-xs ${bodyClasses}`}>
                      Keep this code visible so nearby students can check in. It
                      refreshes automatically every few seconds.
                    </Text>
                  </View>
                )}
                <View
                  className={`rounded-2xl border p-4 ${
                    relayBleActive
                      ? 'border-emerald-300 bg-emerald-50'
                      : isDark
                      ? 'border-slate-700 bg-slate-900'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className={`font-extrabold ${titleClasses}`}>
                      Bluetooth relay
                    </Text>
                    <Text
                      className={`font-bold ${
                        relayBleActive ? 'text-emerald-700' : 'text-amber-600'
                      }`}
                    >
                      {relayBleActive ? 'Broadcasting' : 'QR relay active'}
                    </Text>
                  </View>
                  <Text className={`mt-2 text-sm ${bodyClasses}`}>
                    {relayBleActive
                      ? 'Nearby students can detect this secure attendance relay automatically.'
                      : relayError ||
                        'Bluetooth relay starts after the server confirms your attendance. The QR relay remains available.'}
                  </Text>
                </View>
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
                  className={`mt-4 flex-row rounded-2xl border p-3 ${
                    isDark
                      ? 'border-slate-700 bg-slate-900'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <View className="flex-1 items-center">
                    <QrCode size={18} color="#059669" />
                    <Text className={`mt-1 text-[11px] ${bodyClasses}`}>
                      QR
                    </Text>
                    <Text className={`mt-1 font-extrabold ${titleClasses}`}>
                      Active
                    </Text>
                  </View>
                  <View className="mx-1 w-px bg-slate-200" />
                  <TouchableOpacity
                    className={`mx-1 flex-1 items-center rounded-xl border p-2 ${
                      isDark
                        ? 'border-blue-400/50 bg-blue-500/15'
                        : 'border-blue-200 bg-blue-50'
                    }`}
                    onPress={() => setShowPin(true)}
                    activeOpacity={0.7}
                  >
                    <KeyRound size={18} color="#2563eb" />
                    <Text className={`mt-1 text-[11px] ${bodyClasses}`}>
                      PIN
                    </Text>
                    <Text className={`mt-1 font-extrabold ${titleClasses}`}>
                      Enter
                    </Text>
                  </TouchableOpacity>
                  <View className="mx-1 w-px bg-slate-200" />
                  <View className="flex-1 items-center">
                    <PersonStanding
                      size={18}
                      color={motionVerified ? '#059669' : '#d97706'}
                    />
                    <Text className={`mt-1 text-[11px] ${bodyClasses}`}>
                      Motion
                    </Text>
                    <Text
                      className={`mt-1 font-extrabold ${
                        motionVerified ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {motionVerified ? 'Active' : 'Pending'}
                    </Text>
                  </View>
                  <View className="mx-1 w-px bg-slate-200" />
                  <View className="flex-1 items-center">
                    <Clock size={17} color="#d97706" />
                    <Text className={`mt-1 text-[11px] ${bodyClasses}`}>
                      Status
                    </Text>
                    <Text className="mt-1 font-extrabold text-emerald-600">
                      {remainingSeconds > 0
                        ? `${Math.floor(remainingSeconds / 60)}:${String(
                            remainingSeconds % 60,
                          ).padStart(2, '0')}`
                        : '—'}
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
              </>
            )}
          </View>
        </FadeSlideIn>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MarkInPersonAttendance;
