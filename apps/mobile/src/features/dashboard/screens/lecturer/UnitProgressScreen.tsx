import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AttendanceBackHeader } from '../../../attendance/components/AttendanceBackHeader';
import { API_BASE_URL } from '../../../../shared/constants';
import { useAuth } from '../../../auth/context/AuthContext';
import { useTheme } from '../../../theme/context/ThemeContext';
import type { AttendanceStackParamList } from '../../../../navigation/types';

type UnitProgress = {
  unitCode: string;
  unitName: string;
  sessions: number;
  checkIns: number;
  averageAttendance: number;
};

type Summary = {
  units: UnitProgress[];
  coverage: { selected: number; used: number };
  totals: { sessions: number; checkIns: number };
};

export default function UnitProgressScreen() {
  const { isDark } = useTheme();
  const { token } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<AttendanceStackParamList>>();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = useCallback(
    async (manual = false) => {
      if (!token) {
        setLoading(false);
        return;
      }
      if (manual) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/attendance/lecturer/summary`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (!response.ok) throw new Error('Unable to load unit progress');
        setSummary((await response.json()) as Summary);
      } catch {
        // Keep the last successful summary visible during transient outages.
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      void loadSummary();
    }, [loadSummary]),
  );

  const background = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const surface = isDark
    ? 'bg-slate-900 border-slate-800'
    : 'bg-white border-slate-200';
  const title = isDark ? 'text-white' : 'text-slate-900';
  const secondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <SafeAreaView className={`flex-1 ${background}`}>
      <AttendanceBackHeader
        title="Unit Progress"
        subtitle="Track attendance across your teaching units"
        isDark={isDark}
        onBack={() => navigation.goBack()}
      />
      {loading && !summary ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className={`mt-4 ${secondary}`}>Loading unit progress...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-5 pb-8 pt-5"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadSummary(true)}
              tintColor="#10b981"
              colors={['#10b981']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View className="rounded-3xl bg-emerald-600 p-5">
            <Text className="text-2xl font-extrabold text-white">
              Teaching overview
            </Text>
            <Text className="mt-2 text-sm text-emerald-100">
              {summary?.coverage.used ?? 0} of {summary?.coverage.selected ?? 0}{' '}
              selected units have attendance activity
            </Text>
            <View className="mt-5 flex-row justify-between">
              <Text className="text-sm font-bold text-white">
                Sessions: {summary?.totals.sessions ?? 0}
              </Text>
              <Text className="text-sm font-bold text-white">
                Check-ins: {summary?.totals.checkIns ?? 0}
              </Text>
            </View>
          </View>

          <Text className={`text-xl font-extrabold ${title}`}>Your units</Text>
          {summary?.units.length ? (
            summary.units.map(unit => (
              <View
                key={unit.unitCode}
                className={`rounded-2xl border p-5 ${surface}`}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="self-start rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-extrabold text-emerald-600">
                      {unit.unitCode}
                    </Text>
                    <Text className={`mt-3 text-lg font-extrabold ${title}`}>
                      {unit.unitName}
                    </Text>
                  </View>
                  <Text className="text-2xl font-extrabold text-emerald-600">
                    {unit.averageAttendance}
                  </Text>
                </View>
                <Text className={`mt-1 text-xs ${muted}`}>
                  average students per session
                </Text>
                <View className="mt-4 flex-row justify-between">
                  <Text className={`text-sm ${secondary}`}>
                    Sessions: {unit.sessions}
                  </Text>
                  <Text className={`text-sm ${secondary}`}>
                    Check-ins: {unit.checkIns}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View className={`items-center rounded-2xl border p-8 ${surface}`}>
              <Text className={`text-center font-bold ${title}`}>
                No teaching activity yet
              </Text>
              <Text className={`mt-2 text-center text-sm ${muted}`}>
                Start an attendance session to see unit progress here.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
