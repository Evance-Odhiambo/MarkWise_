import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Check, Circle } from 'lucide-react-native';
import { Unit } from '../types';

interface Props {
  units: Unit[];
  selectedCodes: string[];
  onToggle: (unit: Unit) => void;
  isDark: boolean;
}

export const StudentUnitPicker = ({
  units,
  selectedCodes,
  onToggle,
  isDark,
}: Props) => (
  <View className="gap-3">
    {units.map(unit => {
      const selected = selectedCodes.includes(unit.code);
      return (
        <TouchableOpacity
          key={unit.code}
          onPress={() => onToggle(unit)}
          activeOpacity={0.8}
          className={`flex-row items-center rounded-2xl border p-4 ${
            selected
              ? 'border-emerald-500 bg-emerald-500/10'
              : isDark
              ? 'border-slate-800 bg-slate-900'
              : 'border-slate-200 bg-white'
          }`}
        >
          {selected ? (
            <Check size={22} color="#10b981" />
          ) : (
            <Circle size={22} color={isDark ? '#64748b' : '#94a3b8'} />
          )}
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
          <Text
            className={`text-xs font-semibold ${
              selected
                ? 'text-emerald-500'
                : isDark
                ? 'text-slate-500'
                : 'text-slate-400'
            }`}
          >
            {selected ? 'Selected' : 'Select'}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);
