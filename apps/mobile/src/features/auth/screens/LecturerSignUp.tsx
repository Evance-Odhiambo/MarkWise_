import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import RoleAuthScreen from './RoleAuthScreen';

export default function LecturerSignUp({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'LecturerSignUp'>) {
  return (
    <RoleAuthScreen role="lecturer" mode="signUp" navigation={navigation} />
  );
}
