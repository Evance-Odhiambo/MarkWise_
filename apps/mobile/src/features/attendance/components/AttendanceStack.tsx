import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AttendanceStackParamList } from '../../../navigation/types';
import AttendanceModeScreen from '../screens/AttendanceModeScreen';
import TakeInPersonAttendance from '../screens/TakeInPersonAttendance';
import MarkInPersonAttendance from '../screens/MarkInPersonAttendance';
import TakeOnlineAttendance from '../screens/TakeOnlineAttendance';
import MarkOnlineAttendance from '../screens/MarkOnlineAttendance';

const Stack = createNativeStackNavigator<AttendanceStackParamList>();

const AttendanceStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="AttendanceMode" component={AttendanceModeScreen} />
      <Stack.Screen name="TakeInPerson" component={TakeInPersonAttendance} />
      <Stack.Screen name="MarkInPerson" component={MarkInPersonAttendance} />
      <Stack.Screen name="TakeOnline" component={TakeOnlineAttendance} />
      <Stack.Screen name="MarkOnline" component={MarkOnlineAttendance} />
    </Stack.Navigator>
  );
};

export default AttendanceStack;
