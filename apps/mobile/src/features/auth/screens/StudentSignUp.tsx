import React from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import RoleAuthScreen from './RoleAuthScreen';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function StudentSignUp({ navigation }: Props) {
  return (
    <RoleAuthScreen role="student" mode="signUp" navigation={navigation} />
  );
}
