import React from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import RoleAuthScreen from './RoleAuthScreen';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function LecturerSignUp({ navigation }: Props) {
  return (
    <RoleAuthScreen role="lecturer" mode="signUp" navigation={navigation} />
  );
}
