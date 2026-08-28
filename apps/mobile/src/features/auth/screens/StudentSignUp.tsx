import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import RoleAuthScreen from './RoleAuthScreen';

export default function StudentSignUp({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'StudentSignUp'>) {
  return (
    <RoleAuthScreen role="student" mode="signUp" navigation={navigation} />
  );
}
