import React, { useEffect, useState } from 'react';
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
import { Check, Search, X } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AttendanceStackParamList,
  RootStackParamList,
} from '../../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/context/ThemeContext';
import { useUnitSelection } from '../hooks/useUnitSelection';
import { AttendanceBackHeader } from '../../attendance/components/AttendanceBackHeader';

type Props = NativeStackScreenProps<
  AttendanceStackParamList,
  'LecturerUnitSelection'
>;

export default function LecturerSelectionScreen({ navigation, route }: Props) {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const {
    availableUnits,
    selectedCodes,
    selectedUnit,
    loading,
    toggleUnit,
    selectUnitLocally,
  } = useUnitSelection('lecturer', debouncedQuery);
  const text = isDark ? 'text-white' : 'text-slate-900';
  const secondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const sessionSelection = Boolean(route.params?.next);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const select = (unit: (typeof availableUnits)[number]) => {
    if (sessionSelection) void selectUnitLocally(unit);
    else toggleUnit(unit);
  };
  const continueAction = () => {
    if (!selectedUnit) return;
    if (route.params?.next)
      navigation.navigate(route.params.next, {
        unitCode: selectedUnit.code,
        unitName: selectedUnit.name,
      });
    else if (navigation.getParent()) navigation.navigate('AttendanceMode');
    else
      (
        navigation as unknown as NativeStackNavigationProp<RootStackParamList>
      ).replace('LecturerApp');
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}
    >
      <View className="flex-1">
        <AttendanceBackHeader
          title="Teaching units"
          subtitle="Select the units you teach"
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
                Teaching units
              </Text>
              <Text className={`mt-2 text-sm leading-5 ${secondary}`}>
                {sessionSelection
                  ? 'Choose the unit for this attendance session.'
                  : 'Select the units you teach. Your choices are saved for attendance.'}
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
          showsVerticalScrollIndicator={false}
        >
          <Text className={`mb-1 text-lg font-bold ${text}`}>
            Available units
          </Text>
          <Text className={`mb-4 text-sm ${secondary}`}>
            {debouncedQuery
              ? `${availableUnits.length} matching unit${
                  availableUnits.length === 1 ? '' : 's'
                }`
              : 'Search by unit code or unit name to find a teaching unit'}
          </Text>
          {loading ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#10b981" />
              <Text className={`mt-4 text-sm ${secondary}`}>
                Searching institution units...
              </Text>
            </View>
          ) : availableUnits.length ? (
            <View className="gap-3">
              {availableUnits.map(unit => {
                const selected = selectedCodes.includes(unit.code);
                return (
                  <Pressable
                    key={unit.code}
                    onPress={() => select(unit)}
                    className={`flex-row items-center rounded-2xl border p-4 ${
                      selected
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : isDark
                        ? 'border-slate-800 bg-slate-900'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <View
                      className={`h-6 w-6 items-center justify-center rounded-full border ${
                        selected
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-slate-400'
                      }`}
                    >
                      {selected && <Check size={16} color="white" />}
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className={`font-bold ${text}`}>{unit.code}</Text>
                      <Text className={`mt-1 text-sm ${secondary}`}>
                        {unit.name}
                      </Text>
                    </View>
                    <Text
                      className={`text-xs font-semibold ${
                        selected ? 'text-emerald-500' : 'text-slate-400'
                      }`}
                    >
                      {selected ? 'Selected' : 'Select'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View
              className={`items-center rounded-2xl p-8 ${
                isDark ? 'bg-slate-900' : 'bg-white'
              }`}
            >
              <Text className={`font-semibold ${text}`}>No units found</Text>
              <Text className={`mt-2 text-center text-sm ${secondary}`}>
                Try another search term.
              </Text>
            </View>
          )}
        </ScrollView>
        <View
          className={`border-t px-5 pb-4 pt-3 ${
            isDark
              ? 'border-slate-800 bg-slate-950'
              : 'border-slate-200 bg-white'
          }`}
        >
          <TouchableOpacity
            disabled={!selectedUnit}
            onPress={continueAction}
            className={`rounded-2xl py-4 ${
              selectedUnit ? 'bg-emerald-500' : 'bg-slate-400 opacity-50'
            }`}
          >
            <Text className="text-center text-base font-bold text-white">
              {sessionSelection ? 'Use selected unit' : 'Save teaching units'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
