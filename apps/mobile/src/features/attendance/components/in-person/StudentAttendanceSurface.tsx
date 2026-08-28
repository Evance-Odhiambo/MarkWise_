import React from 'react';
import { Text, View } from 'react-native';
import { QRScanner } from './QRScanner';
import { PulseView } from './AnimatedAttendance';

type Props = {
  onQrScan: (value: string) => void;
  pause?: boolean;
};

export const StudentAttendanceSurface = ({
  onQrScan,
  pause = false,
}: Props) => (
  <View className="gap-4">
    <View className="rounded-2xl border border-slate-200 bg-white p-5">
      <Text className="mb-3 text-lg font-bold text-slate-900">
        Scan lecturer QR
      </Text>
      <PulseView>
        <View className="relative h-80 overflow-hidden rounded-2xl bg-slate-950">
          <QRScanner onScan={onQrScan} pause={pause} />
          <View className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-emerald-400/40">
            <View className="absolute -left-0.5 -top-0.5 h-10 w-10 rounded-tl-xl border-l-4 border-t-4 border-emerald-400" />
            <View className="absolute -right-0.5 -top-0.5 h-10 w-10 rounded-tr-xl border-r-4 border-t-4 border-emerald-400" />
            <View className="absolute -bottom-0.5 -left-0.5 h-10 w-10 rounded-bl-xl border-b-4 border-l-4 border-emerald-400" />
            <View className="absolute -bottom-0.5 -right-0.5 h-10 w-10 rounded-br-xl border-b-4 border-r-4 border-emerald-400" />
          </View>
        </View>
      </PulseView>
    </View>
  </View>
);
