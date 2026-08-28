import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Search,
  Trophy,
} from 'lucide-react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AttendanceStackParamList } from '../../../../navigation/types';
import { useAuth } from '../../../auth/context/AuthContext';
import { useTheme } from '../../../theme/context/ThemeContext';
import { AttendanceBackHeader } from '../../../attendance/components/AttendanceBackHeader';
import { API_BASE_URL } from '../../../../shared/constants';

type Navigation = NativeStackNavigationProp<
  AttendanceStackParamList,
  'StudentProgress'
>;

type UnitHealth = {
  unitCode: string;
  unitName: string;
  conducted: number;
  attended: number;
  missed: number;
  percentage: number;
  status: 'No data' | 'At risk' | 'On track';
};

type Summary = {
  currentSemester: {
    name: string;
    unitsTotal: number;
    unitsEnrolled: number;
  };
  health: {
    conducted: number;
    attended: number;
    missed: number;
    projectedPercentage: number;
    goalPercentage: number;
    streak: number;
  };
  unitHealth: UnitHealth[];
};

type Filter = 'all' | 'onTrack' | 'atRisk' | 'noData';

const progressColour = (unit: UnitHealth) => {
  if (unit.status === 'On track') return '#10b981';
  if (unit.status === 'At risk') return '#f59e0b';
  return '#64748b';
};

export default function StudentProgressScreen() {
  const { isDark } = useTheme();
  const { token } = useAuth();
  const navigation = useNavigation<Navigation>();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

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
          `${API_BASE_URL}/attendance/student/summary`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (!response.ok) throw new Error('Unable to load attendance progress');
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
  const health = summary?.health;
  const percentage = health?.projectedPercentage ?? 0;
  const units = (summary?.unitHealth ?? []).filter(unit => {
    const matchesQuery = `${unit.unitCode} ${unit.unitName}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'onTrack' && unit.status === 'On track') ||
      (filter === 'atRisk' && unit.status === 'At risk') ||
      (filter === 'noData' && unit.status === 'No data');
    return matchesQuery && matchesFilter;
  });
  const onTrackCount =
    summary?.unitHealth.filter(unit => unit.status === 'On track').length ?? 0;
  const atRiskCount =
    summary?.unitHealth.filter(unit => unit.status === 'At risk').length ?? 0;

  const statCards = [
    {
      label: 'Attended',
      value: `${health?.attended ?? 0}/${health?.conducted ?? 0}`,
      caption: 'sessions',
      color: '#10b981',
      icon: <CheckCircle2 size={19} color="#10b981" />,
    },
    {
      label: 'On track',
      value: onTrackCount,
      caption: `of ${summary?.unitHealth.length ?? 0} units`,
      color: '#10b981',
      icon: <Trophy size={19} color="#10b981" />,
    },
    {
      label: 'At risk',
      value: atRiskCount,
      caption: 'units below goal',
      color: '#f59e0b',
      icon: <AlertTriangle size={19} color="#f59e0b" />,
    },
    {
      label: 'Missed',
      value: health?.missed ?? 0,
      caption: 'sessions',
      color: '#ef4444',
      icon: <BarChart3 size={19} color="#ef4444" />,
    },
  ];

  return (
    <SafeAreaView className={`flex-1 ${background}`}>
      <AttendanceBackHeader
        title="Attendance Progress"
        subtitle="Track your health across enrolled units"
        isDark={isDark}
        onBack={() => navigation.goBack()}
      />
      {loading && !summary ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className={`mt-4 ${secondary}`}>Loading progress...</Text>
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
          <View className="overflow-hidden rounded-3xl bg-emerald-600 p-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-2xl font-extrabold text-white">
                  Attendance health
                </Text>
                <Text className="mt-2 text-sm text-emerald-100">
                  {summary?.currentSemester.name || 'Current semester'}
                </Text>
                <Text className="mt-1 text-xs text-emerald-100">
                  {summary?.currentSemester.unitsEnrolled ?? 0} enrolled units
                </Text>
              </View>
              <View className="h-24 w-24 items-center justify-center rounded-full border-8 border-emerald-300/40">
                <Text className="text-2xl font-extrabold text-white">
                  {percentage}%
                </Text>
              </View>
            </View>
            <View className="mt-5 h-2 overflow-hidden rounded-full bg-emerald-800/50">
              <View
                className="h-full rounded-full bg-white"
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
            </View>
            <View className="mt-3 flex-row justify-between">
              <Text className="text-xs text-emerald-100">
                Goal: {health?.goalPercentage ?? 75}%
              </Text>
              <Text className="text-xs font-bold text-white">
                {health?.streak ?? 0} day streak
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap justify-between gap-y-3">
            {statCards.map(card => (
              <View
                key={card.label}
                className={`w-[48%] rounded-2xl border p-4 ${surface}`}
              >
                <View className="flex-row items-center gap-2">
                  {card.icon}
                  <Text className={`text-xs font-bold ${muted}`}>
                    {card.label}
                  </Text>
                </View>
                <Text
                  style={{ color: card.color }}
                  className="mt-3 text-2xl font-extrabold"
                >
                  {card.value}
                </Text>
                <Text className={`mt-1 text-xs ${muted}`}>{card.caption}</Text>
              </View>
            ))}
          </View>

          <View
            className={`flex-row items-center rounded-2xl border px-3 ${surface}`}
          >
            <Search size={19} color={isDark ? '#94a3b8' : '#64748b'} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search units by code or name"
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              className={`h-12 flex-1 px-3 ${title}`}
              autoCapitalize="none"
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {(
                [
                  ['all', 'All units'],
                  ['onTrack', 'On track'],
                  ['atRisk', 'At risk'],
                  ['noData', 'No data'],
                ] as [Filter, string][]
              ).map(([value, label]) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => setFilter(value)}
                  className={`rounded-full border px-4 py-2 ${
                    filter === value
                      ? 'border-emerald-600 bg-emerald-600'
                      : isDark
                      ? 'border-slate-700 bg-slate-900'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-sm font-bold ${
                      filter === value ? 'text-white' : secondary
                    }`}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View className="flex-row items-center justify-between">
            <View>
              <Text className={`text-xl font-extrabold ${title}`}>
                Unit progress
              </Text>
              <Text className={`mt-1 text-sm ${muted}`}>
                {units.length} unit{units.length === 1 ? '' : 's'} shown
              </Text>
            </View>
          </View>

          {units.length === 0 ? (
            <View className={`items-center rounded-2xl border p-8 ${surface}`}>
              <Text className={`text-center font-bold ${title}`}>
                No matching units
              </Text>
              <Text className={`mt-2 text-center text-sm ${muted}`}>
                Adjust your search or enroll in a unit to start tracking
                progress.
              </Text>
            </View>
          ) : (
            units.map(unit => {
              const color = progressColour(unit);
              return (
                <View
                  key={unit.unitCode}
                  className={`rounded-2xl border p-5 ${surface}`}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="self-start rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-extrabold text-emerald-600">
                        {unit.unitCode}
                      </Text>
                      <Text
                        className={`mt-3 text-lg font-extrabold ${title}`}
                        numberOfLines={2}
                      >
                        {unit.unitName}
                      </Text>
                    </View>
                    <Text style={{ color }} className="text-2xl font-extrabold">
                      {unit.percentage}%
                    </Text>
                  </View>
                  <View className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, unit.percentage)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </View>
                  <View className="mt-4 flex-row justify-between">
                    <Text className={`text-xs ${secondary}`}>
                      Attended: {unit.attended}
                    </Text>
                    <Text className={`text-xs ${secondary}`}>
                      Missed: {unit.missed}
                    </Text>
                    <Text style={{ color }} className="text-xs font-bold">
                      {unit.status}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
