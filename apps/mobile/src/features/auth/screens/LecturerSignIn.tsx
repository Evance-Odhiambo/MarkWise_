import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import RoleAuthScreen from './RoleAuthScreen';

export default function LecturerSignIn({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'LecturerSignIn'>) {
  return (
    <RoleAuthScreen role="lecturer" mode="signIn" navigation={navigation} />
  );
}
