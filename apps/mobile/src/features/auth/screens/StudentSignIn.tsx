import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import RoleAuthScreen from './RoleAuthScreen';

export default function StudentSignIn({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'StudentSignIn'>) {
  return (
    <RoleAuthScreen role="student" mode="signIn" navigation={navigation} />
  );
}
