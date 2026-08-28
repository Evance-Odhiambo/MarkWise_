import React from 'react';
import { Text, View } from 'react-native';
import type { InPersonSession } from '../../types/inPerson';

export function InPersonSessionCard({ session }: { session: InPersonSession }) {
  return (
    <View>
      <Text>{session.unitCode}</Text>
    </View>
  );
}
