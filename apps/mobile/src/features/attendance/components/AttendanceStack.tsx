import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AttendanceStackParamList } from '../../../navigation/types';
import AttendanceModeScreen from '../screens/AttendanceModeScreen';
import TakeInPersonAttendance from '../screens/TakeInPersonAttendance';
import MarkInPersonAttendance from '../screens/MarkInPersonAttendance';
import TakeOnlineAttendance from '../screens/TakeOnlineAttendance';
import MarkOnlineAttendance from '../screens/MarkOnlineAttendance';
import StudentSelectionScreen from '../../unit-selection/screens/StudentSelectionScreen';
import LecturerSelectionScreen from '../../unit-selection/screens/LecturerSelectionScreen';
import StudentProgressScreen from '../../dashboard/screens/student/UnitProgressScreen';
import LecturerProgressScreen from '../../dashboard/screens/lecturer/UnitProgressScreen';
import { useAuth } from '../../auth/context/AuthContext';

const Stack = createNativeStackNavigator<AttendanceStackParamList>();

const AttendanceStack = () => {
  const { role } = useAuth();
  return (
    <Stack.Navigator
      initialRouteName={'AttendanceMode'}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationMatchesGesture: true,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="StudentProgress"
        component={StudentProgressScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LecturerProgress"
        component={LecturerProgressScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="AttendanceMode" component={AttendanceModeScreen} />
      <Stack.Screen
        name="StudentUnitSelection"
        component={StudentSelectionScreen as any}
      />
      <Stack.Screen
        name="LecturerUnitSelection"
        component={LecturerSelectionScreen}
      />
      <Stack.Screen name="TakeInPerson" component={TakeInPersonAttendance} />
      <Stack.Screen name="MarkInPerson" component={MarkInPersonAttendance} />
      <Stack.Screen name="TakeOnline" component={TakeOnlineAttendance} />
      <Stack.Screen name="MarkOnline" component={MarkOnlineAttendance} />
    </Stack.Navigator>
  );
};

export default AttendanceStack;
