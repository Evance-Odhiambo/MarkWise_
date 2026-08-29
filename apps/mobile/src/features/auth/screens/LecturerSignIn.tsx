import React from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import RoleAuthScreen from './RoleAuthScreen';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function LecturerSignIn({ navigation }: Props) {
  return (
    <RoleAuthScreen role="lecturer" mode="signIn" navigation={navigation} />
  );
}
