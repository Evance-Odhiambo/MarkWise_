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
  getActiveInPersonSessionByUnit,
  submitPinByUnit,
  ApiRequestError,
} from '../api/inPersonAttendanceApi';
import { createSubmittedPinPayload, createHelperPin } from '../security/attendancePin';
import {
  PIN_ROTATION_SECONDS,
  RELAY_ROTATION_SECONDS,
} from '../security/attendanceProtocol';
import { nowEpochMs } from '../security/serverClock';
import { PinInput } from '../components/PinInput';
import { useUnitSelection } from '../../unit-selection/hooks/useUnitSelection';
import { loadUnitMappings } from '../../../shared/storage/unitMappings';
import { adaptiveConfig } from '../../../shared/utils/adaptiveAttendanceConfig';
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
  getOrCreateRelayKey,
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
  getCachedManifestByBeacon,
  getCachedManifestBySessionNonce,
  manifestToSession,
} from '../../../shared/storage/sessionManifestCache';
import { recordBleCounter } from '../../../shared/storage/receivedBleCounters';
import { setRecordRelayEligibility } from '../../../shared/storage/inPersonAttendanceQueue';
import {
  FadeSlideIn,
  PulseView,
  SpinView,
} from '../components/in-person/AnimatedAttendance';
import {
  Radio,
  QrCode,
  KeyRound,
  PersonStanding,
  CheckCircle2,
} from 'lucide-react-native';

type Props = NativeStackScreenProps<AttendanceStackParamList, 'MarkInPerson'>;

const MarkInPersonAttendance = ({ navigation, route }: Props) => {
  const MOTION_WINDOW_MS = 8_000;
  const MOTION_DELTA_THRESHOLD = 0.45;
  const { isDark } = useTheme();
  const { isTablet } = useResponsive();
  const { token, userId, institutionId } = useAuth();
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
  const [helperPin, setHelperPin] = useState<string | null>(null);
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
  const pinComplete = /^\d{6}$/.test(pinValue);
  // Drives the BLE card's three states — derived from state this screen
  // already tracks, nothing new to compute: a BLE beacon resolves method to
  // 'ble' and sets session (see the BLE listener effect), and submitting is
  // already true for the duration of any handleJoin call, auto-mark
  // included.
  const bleCardState =
    method === 'ble' && session
      ? submitting
        ? ('marking' as const)
        : ('detected' as const)
      : ('scanning' as const);
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
  // Stricter than relayParentRef: excludes PIN-origin marks. A student who
  // only typed the lecturer's PIN can't yet be locally certain that PIN was
  // correct (only the server can confirm it), so they aren't trusted to
  // vouch for a classmate via a helper PIN until that's server-verified —
  // unlike BLE/QR, whose local structural validation is a real trust signal
  // on its own (see scheduleRelay).
  const helperPinParentRef = useRef<{ session: InPersonSession } | null>(null);
  const helperRelayKeyRef = useRef<string | null>(null);
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
      // nowEpochMs() (server-clock-adjusted), not Date.now() (raw device
      // clock) — matches the lecturer's own countdown (TakeInPersonAttendance)
      // and every other rotation timer in this app. Using the device's
      // unadjusted clock here made the two counters visibly diverge
      // whenever a student's device clock was skewed from the server's.
      setRemainingSeconds(
        Math.max(0, Math.ceil((session.expiresAt - nowEpochMs()) / 1000)),
      );
    };
    update();
    const timer = setInterval(update, 1_000);
    return () => clearInterval(timer);
  }, [session]);

  // Replaces the old manual "Done" button on the post-mark relay screen —
  // it resumes the attendance screen on its own once the session actually
  // ends, instead of requiring the student to dismiss it themselves.
  useEffect(() => {
    if (success && remainingSeconds === 0) navigation.goBack();
  }, [success, remainingSeconds, navigation]);

  useEffect(() => {
    const update = () => {
      const now = nowEpochMs();
      const currentWindow = Math.floor(now / 1000 / PIN_ROTATION_SECONDS);
      if (
        pinWindowRef.current !== null &&
        pinWindowRef.current !== currentWindow
      ) {
        setPinValue('');
      }
      pinWindowRef.current = currentWindow;
      setPinRemainingSeconds(
        PIN_ROTATION_SECONDS -
          (Math.floor(now / 1000) % PIN_ROTATION_SECONDS),
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
    async (
      attendanceSession: InPersonSession,
      evidence: string,
      attendanceMethod: 'qr' | 'ble' | 'pin',
      verificationStatus: 'verified' | 'duplicate' | 'queued' = 'verified',
    ) => {
      if (
        !userId ||
        verificationStatus !== 'verified' && verificationStatus !== 'duplicate' ||
        (attendanceMethod === 'pin' &&
          verificationStatus !== 'verified' &&
          verificationStatus !== 'duplicate') ||
        // Already-relayed evidence (signed MWIR1) is a terminal leaf, not a
        // further relay source — verifyRelay's parent-method detection only
        // recognizes MWBLE1/MWPIN1/MWIP1, not MWIR1 itself.
        evidence.trim().startsWith('MWIR1:')
      )
        return;
      // Every eligible mark — QR, PIN, or BLE — sets up both relay
      // transports unconditionally, the same way QR/PIN-origin marks
      // always have: the rotating relay QR (an image on screen, only ever
      // actually relayed if another student chooses to scan it) and BLE
      // broadcast relaying. There's no election/selection step; any
      // verified or duplicate mark is relay-eligible.
      relayParentRef.current = { session: attendanceSession, evidence };
      // Helper-PIN eligibility is the same guard above, minus PIN-origin
      // marks — see helperPinParentRef's declaration for why.
      helperPinParentRef.current =
        attendanceMethod === 'pin' ? null : { session: attendanceSession };
      setRelayError(null);
      if (userId) {
        // Persist relay eligibility so it survives app restarts/backgrounding
        // instead of only living in relayParentRef.
        const deviceId = await getOrCreateSecureDeviceId();
        void setRecordRelayEligibility(
          attendanceSession.id,
          deviceId,
          userId,
          true,
          attendanceMethod,
        );
      }
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
      if (parent.session.expiresAt <= nowEpochMs()) {
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

  // Displays a rotating 6-digit "helper PIN" for the struggling classmate to
  // type into their own PIN entry — no server call to mint or redeem it,
  // unlike the opaque relay code above. Only shown once helperPinParentRef
  // is set (BLE/QR-origin, verified/duplicate — see scheduleRelay), and only
  // recomputes locally on each rotation boundary.
  useEffect(() => {
    const parent = helperPinParentRef.current;
    if (!parent || !userId) {
      setHelperPin(null);
      return;
    }
    let active = true;
    const tick = async () => {
      if (!active) return;
      const nowMs = nowEpochMs();
      if (parent.session.expiresAt <= nowMs) {
        setHelperPin(null);
        return;
      }
      try {
        if (!helperRelayKeyRef.current)
          helperRelayKeyRef.current = await getOrCreateRelayKey();
        if (!active) return;
        const { pin } = await createHelperPin(
          parent.session.id,
          userId,
          helperRelayKeyRef.current,
          nowMs,
        );
        if (active) setHelperPin(pin);
      } catch {
        // Keychain access can transiently fail; the next tick retries.
      }
    };
    void tick();
    const timer = setInterval(() => void tick(), 1_000);
    return () => {
      active = false;
      clearInterval(timer);
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
      session.expiresAt <= nowEpochMs()
    ) {
      void stop();
      return;
    }
    let active = true;
    const advertiseCurrent = async () => {
      if (session.expiresAt <= nowEpochMs()) {
        await stop();
        return;
      }
      try {
        // Dev-only regression guard: a relay must rebroadcast the exact
        // session identity it was verified against — same id/nonce/unit/
        // expiry, only the counter advances. If `session` state ever drifts
        // from the verified relay parent (relayParentRef), this fires loudly
        // instead of silently relaying under the wrong session identity.
        if (__DEV__ && relayParentRef.current) {
          const parent = relayParentRef.current.session;
          const identityMatches =
            session.id === parent.id &&
            session.sessionNonce === parent.sessionNonce &&
            session.unitCode === parent.unitCode &&
            session.expiresAt === parent.expiresAt;
          if (!identityMatches)
            console.warn(
              'BLE relay session identity diverged from the verified relay parent',
            );
        }
        const nextPayload = await createCompactBlePayload(session, '');
        const base64Payload = nextPayload.slice(7);
        if (Platform.OS === 'android')
          await NativeBLEAdvertiser.startBackgroundAdvertising(
            base64Payload,
            Math.ceil((session.expiresAt - nowEpochMs()) / 1_000),
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
      if (!attendanceSession) return;
      setSubmitting(true);
      try {
        const attendanceMethod = override?.method ?? method;
        const evidence = override?.evidence ?? rawPayload.trim();
        let record;
        try {
          record = await capture(evidence, attendanceMethod, attendanceSession);
        } catch (error) {
          // A local structural validation failure (bad signature, wrong
          // session/nonce, malformed payload) — not a server verification
          // question, so there's nothing to queue or sync. Worth telling
          // the student immediately since it means the scan itself needs
          // retrying, not just waiting.
          if (override) autoMarkedSessions.current.delete(override.session.id);
          Alert.alert(
            'Scan not recognized',
            error instanceof Error
              ? error.message
              : 'Could not read this attendance code. Try again.',
          );
          return;
        }
        // sync() always durably queues the record locally (before it ever
        // attempts the network) and only throws for a definitive
        // server-side rejection, not a transient one (offline, session not
        // yet claimed, etc — those resolve to "queued" without throwing).
        // Even a definitive rejection isn't surfaced here as a blocking
        // alert: the record stays queued, the background sync retries or
        // gives up per the same classification, and notifyAttendanceOutcome
        // (server-side, fires whenever /submit actually runs — the attempt
        // made here or a later background one) tells the student the real
        // outcome asynchronously instead of interrupting the scan. This
        // also means a single scan never causes more than the one API call
        // made right here — no separate "retry immediately" round-trip.
        const result = await sync(record).catch(
          () => ({ data: { status: 'queued' as const } }),
        );
        // QR and BLE are cryptographically validated locally before being
        // queued. They may relay immediately while offline. PIN is different:
        // it can relay only after the backend returns verified/duplicate.
        const relayStatus =
          result.data.status === 'queued' && attendanceMethod !== 'pin'
            ? 'verified'
            : result.data.status;
        await scheduleRelay(attendanceSession, evidence, attendanceMethod, relayStatus);
        setSuccess(true);
      } finally {
        setSubmitting(false);
      }
    },
    [capture, method, rawPayload, scheduleRelay, session, sync],
  );

  const submitPin = async () => {
    const pinScannedAt = nowEpochMs();
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
      if (!token) {
        Alert.alert(
          'PIN requires internet',
          'Connect to the internet so the server can validate this PIN. It cannot create a relay while offline.',
        );
        return;
      }
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
            'PIN saved, waiting for the session',
            "We'll confirm this shortly if the lecturer's session appears in the next minute or so. This PIN rotates quickly, so if it's no longer current by then, you'll get a notification asking you to re-enter the new one.",
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
        // A definitive server rejection (wrong PIN, session expired, not
        // enrolled, ...) is not a connectivity problem. Queuing it for
        // offline retry would just resubmit the identical, already-rejected
        // payload once the sync timer fires — producing a second, redundant
        // rejection notification for the same PIN entry. Only genuinely
        // transient failures (no network, or a 5xx/408/429 from the server)
        // belong in the retry queue; mirrors isPermanentServerRejection in
        // useAttendanceSync.ts.
        const transient =
          !(error instanceof ApiRequestError) ||
          error.status >= 500 ||
          error.status === 408 ||
          error.status === 429;
        if (!transient) {
          setShowPin(false);
          setPinValue('');
          Alert.alert(
            'PIN not accepted',
            error instanceof Error
              ? error.message
              : 'Check the PIN and try again.',
          );
          return;
        }
        try {
          const pending = await enqueuePendingPin({
            unitCode: pinUnitCode,
            pin: pinValue,
            scannedAt: nowEpochMs(),
            deviceId: await getOrCreateSecureDeviceId(),
          });
          setShowPin(false);
          setPinValue('');
          Alert.alert(
            'PIN saved offline',
            `We'll try to confirm this for ${pending.unitCode} as soon as you're back online. This PIN rotates quickly, so if too much time passes you'll get a notification asking you to re-enter the current one.`,
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
    if (pinSession.expiresAt <= nowEpochMs()) {
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
    const listener = NativeBLEScanner.addDeviceListener(async device => {
      if (!device.payload) return;
      const value = `MWBLE1:${device.payload}`;
      try {
        const beacon = decodeCompactBlePayload(value);
        // Trusted manifest is the primary discovery path — it lets this
        // beacon be fully verified and marked with no live server call. Fall
        // back to the plain session cache (no manifest yet, e.g. an
        // offline-started lecturer session) as a lesser trust tier, and only
        // hit the backend when neither is cached — first-ever contact with
        // this session.
        const manifest = await getCachedManifestByBeacon(
          beacon.nonce,
          beacon.unitId,
        );
        const cached = manifest
          ? manifestToSession(manifest)
          : await getCachedInPersonSession(beacon.nonce);
        if (cached) {
          const { accepted } = await recordBleCounter(
            cached.id,
            beacon.nonce,
            beacon.unitId,
            beacon.counter,
          );
          if (accepted) {
            setRawPayload(value);
            setSession(cached);
            setMethod('ble');
            autoMarkBle(cached, value, device.rssi);
          }
          return;
        }
        if (!token) return;
        getInPersonSessionByBleNonce(beacon.nonce, token)
          .then(async response => {
            await cacheInPersonSession(response.data);
            await recordBleCounter(
              response.data.id,
              beacon.nonce,
              beacon.unitId,
              beacon.counter,
            );
            setRawPayload(value);
            setSession(response.data);
            setMethod('ble');
            autoMarkBle(response.data, value, device.rssi);
          })
          .catch(() => undefined);
      } catch {
        /* ignore unrelated beacons */
      }
    });
    // startScanNoFilter can fail with nothing to show for it — Bluetooth
    // still off at mount, or the BLUETOOTH_SCAN permission request (fired
    // once, app-wide, at root — see useAttendancePermissions) still pending
    // when this screen mounted. Previously a single failed attempt here
    // meant BLE discovery was silently dead for the rest of the screen
    // visit, with no path to recover short of leaving and re-entering the
    // screen — which is exactly why it looked like BLE "only worked after"
    // some other unrelated action gave it a second chance to start. Retry
    // with backoff instead of a one-shot attempt, and this effect also
    // re-runs whenever bluetoothEnabled flips true (below), covering
    // Bluetooth being off at mount and turned on moments later.
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const retryDelaysMs = [1_000, 2_000, 4_000, 8_000];
    let attempt = 0;
    const startScanning = async () => {
      if (!active) return;
      try {
        await NativeBLEScanner.startScanNoFilter();
      } catch {
        if (!active || attempt >= retryDelaysMs.length) return;
        const delay = retryDelaysMs[attempt];
        attempt += 1;
        retryTimer = setTimeout(() => void startScanning(), delay);
      }
    };
    void startScanning();
    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
      listener.remove();
      void NativeBLEScanner.stopScan().catch(() => undefined);
    };
  }, [autoMarkBle, token, bluetoothEnabled]);

  const loadQrSession = async (value: string) => {
    setScanCount(current => Math.min(2, current + 1));
    setRawPayload(value);
    try {
      if (value.trim().startsWith('MWIR1:')) {
        const relay = decodeRelayPayload(value.trim());
        const parent = relay.parentPayload.startsWith('MWBLE1:')
          ? decodeCompactBlePayload(relay.parentPayload)
          : decodeAttendancePayload(relay.parentPayload);
        const parentNonce =
          'nonce' in parent ? parent.nonce : parent.sessionNonce;
        const cached = await getCachedInPersonSession(parentNonce);
        let resolvedSession = cached;
        if (!resolvedSession && token) {
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
      // Trusted manifest first (signed, authoritative), then the plain
      // session cache (no manifest yet), before falling back to
      // reconstructing an unsigned session from the payload alone.
      const manifest = await getCachedManifestBySessionNonce(
        payload.sessionNonce,
      );
      const cached = manifest
        ? manifestToSession(manifest)
        : await getCachedInPersonSession(payload.sessionNonce);
      let resolvedSession = cached;

      // If not in cache, try to reconstruct from payload + cached unit data
      if (!resolvedSession && payload.unitCode) {
        // Try to get unit information from local cache
        const storedMappings = userId
          ? await loadUnitMappings({
              userId,
              role: 'student',
              institutionId,
            }).catch(() => [])
          : [];
        
        const unitMapping = storedMappings.find(
          mapping => mapping.unitCode === payload.unitCode
        );
        
        const cachedBleUnitId = adaptiveConfig.getUnitId(payload.unitCode);
        const bleId = cachedBleUnitId ?? (unitMapping?.bleId ? Number(unitMapping.bleId) : null);
        
        // Reconstruct session from QR payload data. The signed QR already
        // carries the session's real sessionStart/expiresAt (see
        // createSignedPayload) — issuedAt is only this specific rotation's
        // timestamp, minutes later than sessionStart for a scan partway
        // through a live session. Using issuedAt as a stand-in for
        // sessionStart (as this used to) made the reconstructed session
        // disagree with the QR's own embedded sessionStart by however far
        // into the session the scan happened — almost always past the 15s
        // tolerance — so validateAttendancePayload's own SESSION_TIME_MISMATCH
        // check would fail against a session reconstructed from that exact
        // QR. Use the payload's real values directly; nothing here is an
        // approximation.
        resolvedSession = {
          id: payload.sessionId,
          unitCode: payload.unitCode,
          sessionStart: payload.sessionStart,
          expiresAt: payload.expiresAt,
          sessionNonce: payload.sessionNonce,
          bleUnitId: bleId,
          status: 'active' as const,
        };

        // Cache the reconstructed session for future use
        await cacheInPersonSession(resolvedSession);

        console.log('Reconstructed session from QR payload and cached data:', {
          unitCode: payload.unitCode,
          bleId,
          sessionStart: new Date(payload.sessionStart).toISOString(),
          expiresAt: new Date(payload.expiresAt).toISOString(),
          source: bleId ? 'cached' : 'offline'
        });
      }
      
      // If still not resolved, try backend as last resort
      if (!resolvedSession) {
        if (!token) {
          throw new Error(
            'This QR session is not cached yet. Connect once to load the session, then future attendance can work offline.'
          );
        }
        
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
                disabled={submitting || !pinComplete || !pinUnitCode}
                onPress={() => void submitPin()}
                className={`mt-6 rounded-xl py-4 ${
                  submitting || !pinComplete || !pinUnitCode
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
              <View className="gap-3">
                <PulseView>
                  <View
                    className={`items-center rounded-2xl border-2 p-4 ${
                      isDark
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : 'border-emerald-300 bg-emerald-50'
                    }`}
                  >
                    <View className="mb-2 rounded-full bg-emerald-600 p-2">
                      <CheckCircle2 size={32} color="#ffffff" strokeWidth={2.5} />
                    </View>
                    <Text
                      className={`text-center text-xl font-extrabold ${
                        isDark ? 'text-emerald-300' : 'text-emerald-800'
                      }`}
                    >
                      Attendance Marked
                    </Text>
                    <Text
                      className={`mt-2 text-sm font-bold ${
                        isDark ? 'text-emerald-400' : 'text-emerald-700'
                      }`}
                    >
                      Session ends in{' '}
                      {Math.floor(remainingSeconds / 60)}:
                      {String(remainingSeconds % 60).padStart(2, '0')}
                    </Text>
                  </View>
                </PulseView>
                {relayPayload && (
                  <View
                    className={`items-center rounded-2xl border p-4 ${
                      isDark
                        ? 'border-slate-700 bg-slate-900'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <Text className={`mb-3 font-bold ${titleClasses}`}>
                      Relay QR
                    </Text>
                    <QRCodeDisplay value={relayPayload} size={190} />
                    <Text className={`mt-2 text-center text-xs ${bodyClasses}`}>
                      Show this to nearby classmates to help them check in.
                    </Text>
                  </View>
                )}
                {helperPin && (
                  <View
                    className={`items-center rounded-2xl border p-4 ${
                      isDark
                        ? 'border-slate-700 bg-slate-900'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <Text className={`mb-1 font-bold ${titleClasses}`}>
                      Help a classmate
                    </Text>
                    <Text className="text-3xl font-extrabold tracking-widest text-emerald-600">
                      {helperPin}
                    </Text>
                    <Text
                      className={`mt-1 text-xs font-bold ${
                        isDark ? 'text-amber-400' : 'text-amber-600'
                      }`}
                    >
                      PIN rotates in {pinRemainingSeconds}s
                    </Text>
                    <Text className={`mt-2 text-center text-xs ${bodyClasses}`}>
                      For a classmate who can't scan QR or Bluetooth — they
                      type this into their own PIN entry.
                    </Text>
                  </View>
                )}
                <View
                  className={`rounded-2xl border p-4 ${
                    relayBleActive
                      ? isDark
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : 'border-emerald-300 bg-emerald-50'
                      : isDark
                      ? 'border-slate-700 bg-slate-900'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className={`font-bold ${titleClasses}`}>
                      Bluetooth relay
                    </Text>
                    <Text
                      className={`text-xs font-bold ${
                        relayBleActive ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {relayBleActive ? 'On' : 'Starting'}
                    </Text>
                  </View>
                  <Text className={`mt-1 text-xs ${bodyClasses}`}>
                    {relayBleActive
                      ? 'Nearby classmates are detected automatically.'
                      : relayError || 'Starts once your mark is confirmed.'}
                  </Text>
                </View>
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
                    {scanCount
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
                </View>
                <View
                  className={`mt-4 rounded-2xl border border-emerald-500/30 p-5 ${
                    isDark ? 'bg-slate-900' : 'bg-white'
                  }`}
                >
                  <View className="flex-row items-center">
                    {!bluetoothEnabled ? (
                      <Radio size={21} color="#d97706" />
                    ) : bleCardState === 'marking' ? (
                      <ActivityIndicator color="#059669" size="small" />
                    ) : (
                      <PulseView>
                        <Radio size={21} color="#059669" />
                      </PulseView>
                    )}
                    <Text
                      className={`ml-2 text-lg font-extrabold ${titleClasses}`}
                    >
                      {!bluetoothEnabled
                        ? 'BLE Scanning'
                        : bleCardState === 'marking'
                        ? 'Marking Attendance'
                        : bleCardState === 'detected'
                        ? 'Signals Detected'
                        : 'BLE Scanning'}
                    </Text>
                  </View>
                  <Text
                    className={`mt-2 text-sm ${
                      bluetoothEnabled ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {!bluetoothEnabled
                      ? 'Enable Bluetooth to continuously scan for nearby BLE signals'
                      : bleCardState === 'marking'
                      ? `Marking attendance for ${session?.unitCode}`
                      : bleCardState === 'detected'
                      ? `Detected signals for ${session?.unitCode}`
                      : 'Continuously scanning for nearby BLE signals'}
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
