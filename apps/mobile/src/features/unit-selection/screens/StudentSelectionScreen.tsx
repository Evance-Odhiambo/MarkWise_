import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X } from 'lucide-react-native';
import { AttendanceBackHeader } from '../../attendance/components/AttendanceBackHeader';
import { useTheme } from '../../theme/context/ThemeContext';
import { StudentUnitPicker } from '../components/StudentUnitPicker';
import { useUnitSelection } from '../hooks/useUnitSelection';

type Props = {
  navigation: {
    goBack: () => void;
  };
};

export default function StudentSelectionScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const { availableUnits, years, selectedCodes, loading, toggleUnit } =
    useUnitSelection('student');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const text = isDark ? 'text-white' : 'text-slate-900';
  const secondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const mutedSurface = isDark ? 'bg-slate-900' : 'bg-white';
  const year = years.find(item => item.yearNumber === selectedYear);
  const semester = year?.semester.find(
    item => item.semesterNumber === selectedSemester,
  );
  const semesterUnitCodes = useMemo(
    () => new Set((semester?.units || []).map(unit => unit.code)),
    [semester],
  );
  const visibleUnits = useMemo(() => {
    const units = years.length
      ? availableUnits.filter(unit => semesterUnitCodes.has(unit.code))
      : availableUnits;
    const query = searchQuery.trim().toLowerCase();
    return query
      ? units.filter(unit =>
          `${unit.code} ${unit.name}`.toLowerCase().includes(query),
        )
      : units;
  }, [availableUnits, semesterUnitCodes, searchQuery, years.length]);

  useEffect(() => {
    if (!years.length) return;
    const firstYear = years[0];
    setSelectedYear(current => current ?? firstYear.yearNumber);
    setSelectedSemester(
      current => current ?? firstYear.semester[0]?.semesterNumber ?? null,
    );
  }, [years]);

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}
    >
      <View className="flex-1">
        <AttendanceBackHeader
          title="Manage Units"
          subtitle="Update the units used for attendance"
          isDark={isDark}
          onBack={() => navigation.goBack()}
        />
        <View
          className={`border-b px-5 pb-5 pt-4 ${
            isDark
              ? 'border-slate-800 bg-slate-950'
              : 'border-slate-200 bg-white'
          }`}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className={`text-2xl font-bold ${text}`}>
                Unit enrollment
              </Text>
              <Text className={`mt-2 text-sm leading-5 ${secondary}`}>
                Select the units you are taking this semester. They will be used
                for attendance.
              </Text>
            </View>
            <View className="items-center rounded-2xl bg-emerald-500/15 px-3 py-2">
              <Text className="text-2xl font-bold text-emerald-500">
                {selectedCodes.length}
              </Text>
              <Text className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                Selected
              </Text>
            </View>
          </View>

          {!loading && years.length > 0 && (
            <>
              <Text
                className={`mb-2 mt-5 text-xs font-bold uppercase tracking-wider ${secondary}`}
              >
                Academic year
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {years.map(item => {
                    const active = item.yearNumber === selectedYear;
                    return (
                      <Pressable
                        key={item.yearNumber}
                        onPress={() => {
                          setSelectedYear(item.yearNumber);
                          setSelectedSemester(
                            item.semester[0]?.semesterNumber ?? null,
                          );
                          setSearchQuery('');
                        }}
                        className={`rounded-xl px-4 py-3 ${
                          active ? 'bg-emerald-500' : mutedSurface
                        }`}
                      >
                        <Text
                          className={`font-semibold ${
                            active ? 'text-white' : text
                          }`}
                        >
                          Year {item.yearNumber}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
              <Text
                className={`mb-2 mt-4 text-xs font-bold uppercase tracking-wider ${secondary}`}
              >
                Semester
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {(year?.semester || []).map(item => {
                    const active = item.semesterNumber === selectedSemester;
                    return (
                      <Pressable
                        key={item.semesterNumber}
                        onPress={() => {
                          setSelectedSemester(item.semesterNumber);
                          setSearchQuery('');
                        }}
                        className={`rounded-xl px-4 py-3 ${
                          active ? 'bg-emerald-500' : mutedSurface
                        }`}
                      >
                        <Text
                          className={`font-semibold ${
                            active ? 'text-white' : text
                          }`}
                        >
                          {item.name || `Semester ${item.semesterNumber}`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          )}

          <View
            className={`mt-5 flex-row items-center rounded-xl border px-3 ${
              isDark
                ? 'border-slate-800 bg-slate-900'
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            <Search size={19} color={isDark ? '#94a3b8' : '#64748b'} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search units by code or name"
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              className={`h-12 flex-1 px-3 text-base ${text}`}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={isDark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-6 pt-5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text className={`text-lg font-bold ${text}`}>
                {semester?.name || 'Available units'}
              </Text>
              <Text className={`mt-1 text-sm ${secondary}`}>
                {visibleUnits.length} unit{visibleUnits.length === 1 ? '' : 's'}{' '}
                available
              </Text>
            </View>
            {selectedCodes.length > 0 && (
              <Text className="text-sm font-semibold text-emerald-600">
                {selectedCodes.length} selected
              </Text>
            )}
          </View>
          {loading ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#10b981" />
              <Text className={`mt-4 text-sm ${secondary}`}>
                Loading your course units...
              </Text>
            </View>
          ) : visibleUnits.length ? (
            <StudentUnitPicker
              units={visibleUnits}
              selectedCodes={selectedCodes}
              onToggle={toggleUnit}
              isDark={isDark}
            />
          ) : (
            <View
              className={`items-center rounded-2xl p-8 ${
                isDark ? 'bg-slate-900' : 'bg-white'
              }`}
            >
              <Text className={`text-center font-semibold ${text}`}>
                {searchQuery ? 'No units found' : 'No units available'}
              </Text>
              <Text className={`mt-2 text-center text-sm ${secondary}`}>
                {searchQuery
                  ? 'Try another search term.'
                  : 'Your course has no units in this semester yet.'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
