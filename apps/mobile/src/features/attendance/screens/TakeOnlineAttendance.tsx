import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Radio, Search, UserPlus } from 'lucide-react-native';
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

// Mirrors web's duration options exactly (online/page.tsx's <select>).
const DURATION_OPTIONS_MINUTES = [5, 10, 15, 30, 45, 60, 90, 120];
const DEFAULT_DURATION_MINUTES = 10;

type Attendee = { id: string; admissionNumber: string; markedAt: string };

// Web's own "Manual Add" is local-only React state — there is no backend
// endpoint for it (no online-session equivalent of in-person's manual mark).
// This matches that faithfully rather than inventing a real backend feature:
// these entries live only in this screen's state and vanish on navigation
// away, same as web's do on a page refresh.
type ManualEntry = { id: string; name: string; admissionNumber: string; markedAt: string };

const card = (dark: boolean, border: string) =>
  `rounded-2xl border ${border} p-5 shadow-sm ${
    dark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
  }`;

const formatTimer = (totalSeconds: number) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const TakeOnlineAttendance = ({ navigation, route }: Props) => {
  const { isDark } = useTheme();
  const { isTablet } = useResponsive();
  const { token } = useAuth();
  const [session, setSession] = useState<{
    id: string;
    expiresAt: string;
  } | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(
    DEFAULT_DURATION_MINUTES,
  );
  const [secondsRemaining, setSecondsRemaining] = useState(
    DEFAULT_DURATION_MINUTES * 60,
  );
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [ended, setEnded] = useState(false);

  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAdmission, setManualAdmission] = useState('');

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
      const expiresAt = new Date(
        Date.now() + durationMinutes * 60 * 1000,
      ).toISOString();
      const response = await createOnlineAttendanceSession(
        { unitCode: route.params.unitCode, expiresAt },
        { token },
      );
      setSession(response.data);
      setSecondsRemaining(durationMinutes * 60);
      setAttendees([]);
      setManualEntries([]);
    } catch (error) {
      Alert.alert(
        'Could not start session',
        error instanceof Error ? error.message : 'Try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    if (!session || !token || ended) return;
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

  // Poll the live roster while the session is active — same cadence as web's
  // own polling (online/page.tsx's 4000ms setInterval).
  useEffect(() => {
    if (!session || !token || ended) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await getOnlineAttendanceAttendees(session.id, {
          token,
        });
        if (!cancelled) setAttendees(response.data);
      } catch {
        /* transient refresh error — keep the last known roster */
      }
    };
    void refresh();
    const timer = setInterval(refresh, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [session, token, ended]);

  // Countdown that auto-ends the session at zero, mirroring web's timer
  // (online/page.tsx:107-119).
  useEffect(() => {
    if (!session || ended) return;
    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          void endSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, ended]);

  const shareSession = async () => {
    if (!session) return;
    await Share.share({
      message: `MarkWise attendance for ${route.params.unitCode}: ${WEB_APP_URL}/attend?session=${session.id}`,
    });
  };

  const addManualEntry = () => {
    const name = manualName.trim();
    const admissionNumber = manualAdmission.trim().toUpperCase();
    if (!name || !admissionNumber) return;
    setManualEntries(prev => [
      {
        id: `manual-${Date.now()}`,
        name,
        admissionNumber,
        markedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setManualName('');
    setManualAdmission('');
    setShowManualAdd(false);
  };

  // Merges the real roster (no student names — see plan context) with local
  // manual entries (which do have a name), newest first, then applies search.
  const roster = useMemo(() => {
    const real = attendees.map(a => ({
      id: a.id,
      name: 'Verified Student',
      admissionNumber: a.admissionNumber,
      markedAt: a.markedAt,
      manual: false as const,
    }));
    const manual = manualEntries.map(m => ({ ...m, manual: true as const }));
    const combined = [...manual, ...real].sort(
      (a, b) => new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime(),
    );
    const query = searchQuery.trim().toLowerCase();
    if (!query) return combined;
    return combined.filter(
      entry =>
        entry.name.toLowerCase().includes(query) ||
        entry.admissionNumber.toLowerCase().includes(query),
    );
  }, [attendees, manualEntries, searchQuery]);

  const totalCount = attendees.length + manualEntries.length;

  return (
    <SafeAreaView className={`flex-1 ${screenClasses}`}>
      <AttendanceBackHeader
        title="Online Attendance"
        subtitle="Create a session for your selected unit"
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
        <View className="gap-4">
          {session && (
            <View
              className={`flex-row items-center self-start rounded-full px-3 py-1.5 ${
                ended
                  ? isDark
                    ? 'bg-slate-800'
                    : 'bg-slate-100'
                  : 'bg-emerald-500/15'
              }`}
            >
              <Radio
                size={12}
                color={ended ? '#94a3b8' : '#059669'}
                style={{ marginRight: 6 }}
              />
              <Text
                className={`text-xs font-bold uppercase tracking-wider ${
                  ended ? 'text-slate-500' : 'text-emerald-700'
                }`}
              >
                {ended
                  ? 'Session concluded'
                  : `Broadcasting: ${route.params.unitCode}`}
              </Text>
            </View>
          )}

          <View>
            <Text className={`text-2xl font-bold ${titleClasses} mb-1`}>
              Online Attendance
            </Text>
            <Text className={`text-sm ${bodyTextClasses} mb-4`}>
              Create a short-lived link students can open to take attendance.
            </Text>

            <View className={card(isDark, 'border-emerald-500/30')}>
              <Text className={`text-lg font-semibold ${titleClasses}`}>
                {route.params.unitName || route.params.unitCode}
              </Text>
              <Text className={`text-sm ${bodyTextClasses} mt-1`}>
                Unit code: {route.params.unitCode}
              </Text>

              {!session && (
                <>
                  <Text
                    className={`mt-5 mb-2 text-xs font-bold uppercase tracking-wider ${bodyTextClasses}`}
                  >
                    Session duration
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {DURATION_OPTIONS_MINUTES.map(minutes => {
                      const selected = minutes === durationMinutes;
                      return (
                        <TouchableOpacity
                          key={minutes}
                          onPress={() => setDurationMinutes(minutes)}
                          className={`rounded-full border px-4 py-2 ${
                            selected
                              ? 'border-emerald-600 bg-emerald-600'
                              : isDark
                              ? 'border-slate-700 bg-slate-800'
                              : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              selected
                                ? 'text-white'
                                : isDark
                                ? 'text-slate-300'
                                : 'text-slate-600'
                            }`}
                          >
                            {minutes} min
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <TouchableOpacity
                    onPress={handleStart}
                    disabled={loading}
                    className={`mt-5 items-center rounded-2xl bg-emerald-600 py-4 ${
                      loading ? 'opacity-60' : ''
                    }`}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="font-bold text-white">
                        Start online session
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {session && (
            <>
              <View className="flex-row flex-wrap gap-2.5">
                <View className={`flex-1 min-w-[45%] ${card(isDark, 'border-emerald-500/30')}`}>
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Active unit
                  </Text>
                  <Text className={`mt-1 text-lg font-extrabold ${titleClasses}`}>
                    {route.params.unitCode}
                  </Text>
                </View>
                <View className={`flex-1 min-w-[45%] ${card(isDark, 'border-emerald-500/30')}`}>
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Verified attendees
                  </Text>
                  <Text className={`mt-1 text-lg font-extrabold ${titleClasses}`}>
                    {totalCount}
                  </Text>
                </View>
                <View className={`flex-1 min-w-[45%] ${card(isDark, 'border-slate-500/20')}`}>
                  <Text
                    className={`text-[10px] font-bold uppercase tracking-wider ${bodyTextClasses}`}
                  >
                    Time remaining
                  </Text>
                  <Text className={`mt-1 text-lg font-extrabold font-mono ${titleClasses}`}>
                    {ended ? '00:00' : formatTimer(secondsRemaining)}
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-2.5">
                <TouchableOpacity
                  onPress={shareSession}
                  className="flex-1 items-center rounded-2xl bg-emerald-600 py-4"
                >
                  <Text className="font-bold text-white">Share link</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={endSession}
                  disabled={ended}
                  className={`flex-1 items-center rounded-2xl border border-red-200 py-4 ${
                    ended ? 'opacity-50' : ''
                  }`}
                >
                  <Text className="font-bold text-red-600">
                    {ended ? 'Session ended' : 'End session'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View className={card(isDark, 'border-slate-200/60')}>
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className={`text-base font-extrabold ${titleClasses}`}>
                    Live roster ({roster.length})
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowManualAdd(true)}
                    className="flex-row items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1.5"
                  >
                    <UserPlus size={14} color="#d97706" />
                    <Text className="text-xs font-bold text-amber-600">
                      Manual add
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  className={`mb-3 flex-row items-center rounded-xl border px-3 ${
                    isDark
                      ? 'border-slate-700 bg-slate-800'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <Search size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Filter by name or admission number"
                    placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                    autoCapitalize="none"
                    autoCorrect={false}
                    className={`ml-2 flex-1 py-2.5 text-sm ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  />
                </View>

                {roster.length === 0 ? (
                  <View className="items-center py-8">
                    <Radio size={22} color="#059669" />
                    <Text className={`mt-3 text-sm font-bold ${titleClasses}`}>
                      Attendance session active
                    </Text>
                    <Text className={`mt-1 text-xs ${bodyTextClasses}`}>
                      Waiting for student check-ins...
                    </Text>
                  </View>
                ) : (
                  roster.map(entry => (
                    <View
                      key={entry.id}
                      className={`flex-row items-center justify-between border-t py-2.5 ${
                        isDark ? 'border-slate-800' : 'border-slate-100'
                      }`}
                    >
                      <View className="flex-1">
                        <Text
                          className={`text-sm font-semibold ${titleClasses}`}
                          numberOfLines={1}
                        >
                          {entry.name}
                        </Text>
                        <Text className={`text-xs ${bodyTextClasses}`}>
                          {entry.admissionNumber} ·{' '}
                          {new Date(entry.markedAt).toLocaleTimeString()}
                        </Text>
                      </View>
                      <View className="rounded bg-emerald-100 px-1.5 py-0.5">
                        <Text className="text-[9px] font-bold text-emerald-800">
                          PRESENT
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showManualAdd}
        transparent
        animationType="slide"
        onRequestClose={() => setShowManualAdd(false)}
      >
        <SafeAreaView
          edges={['top', 'bottom']}
          className="flex-1 justify-end bg-black/60"
        >
          <View
            className={`rounded-t-3xl px-6 pb-8 pt-5 ${
              isDark ? 'bg-slate-900' : 'bg-white'
            }`}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className={`text-lg font-extrabold ${titleClasses}`}>
                Manual student check-in
              </Text>
              <TouchableOpacity onPress={() => setShowManualAdd(false)}>
                <Text className="text-2xl text-slate-400">×</Text>
              </TouchableOpacity>
            </View>
            <Text className={`mb-4 text-xs ${bodyTextClasses}`}>
              Recorded on this roster view only — not verified or synced, same
              as the web dashboard's manual add.
            </Text>
            <TextInput
              value={manualName}
              onChangeText={setManualName}
              placeholder="Student name"
              placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
              className={`mb-3 rounded-xl border p-4 ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-white'
                  : 'border-slate-300 bg-slate-50 text-slate-900'
              }`}
            />
            <TextInput
              value={manualAdmission}
              onChangeText={setManualAdmission}
              placeholder="Admission number"
              placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
              autoCapitalize="characters"
              className={`rounded-xl border p-4 font-mono ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-white'
                  : 'border-slate-300 bg-slate-50 text-slate-900'
              }`}
            />
            <TouchableOpacity
              onPress={addManualEntry}
              disabled={!manualName.trim() || !manualAdmission.trim()}
              className={`mt-5 items-center rounded-xl bg-amber-600 py-4 ${
                !manualName.trim() || !manualAdmission.trim()
                  ? 'opacity-50'
                  : ''
              }`}
            >
              <Text className="font-bold text-white">Confirm present</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default TakeOnlineAttendance;
