import React from 'react';
import { Text } from 'react-native';
import type { VerificationStatus } from '../../types/inPerson';

export function InPersonCaptureStatus({
  status,
}: {
  status: VerificationStatus;
}) {
  const message =
    status === 'verified'
      ? 'Attendance verified'
      : status === 'pending'
      ? 'Attendance pending verification'
      : status === 'duplicate'
      ? 'Attendance already recorded'
      : 'Attendance rejected';
  return <Text>{message}</Text>;
}
