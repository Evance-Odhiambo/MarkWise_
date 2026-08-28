import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Unit } from '../types';

interface Props {
  units: Unit[];
  selectedCode?: string;
  onSelect: (unit: Unit) => void;
  isDark: boolean;
}

export const LecturerUnitPicker = ({
  units,
  selectedCode,
  onSelect,
  isDark,
}: Props) => (
  <View className="gap-3">
    {units.map(unit => {
      const selected = selectedCode === unit.code;
      return (
        <TouchableOpacity
          key={unit.code}
          onPress={() => onSelect(unit)}
          activeOpacity={0.8}
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
                : isDark
                ? 'border-slate-600'
                : 'border-slate-300'
            }`}
          >
            {selected && <Check size={16} color="#fff" />}
          </View>
          <View className="ml-3 flex-1">
            <Text
              className={`font-bold ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {unit.code}
            </Text>
            <Text
              className={`mt-1 text-sm ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              {unit.name}
            </Text>
          </View>
        </TouchableOpacity>
      );
    })}
  </View>
);
