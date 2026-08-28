import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import AppEntryScreen from '../features/auth/screens/AppEntryScreen';
import StudentSignIn from '../features/auth/screens/StudentSignIn';
import StudentSignUp from '../features/auth/screens/StudentSignUp';
import LecturerSignIn from '../features/auth/screens/LecturerSignIn';
import LecturerSignUp from '../features/auth/screens/LecturerSignUp';
import StudentTabNavigator from './StudentTabs';
import LecturerTabNavigator from './LecturerTabs';
import StudentSelectionScreen from '../features/unit-selection/screens/StudentSelectionScreen';
import LecturerSelectionScreen from '../features/unit-selection/screens/LecturerSelectionScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="AppEntry"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationMatchesGesture: true,
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="AppEntry" component={AppEntryScreen} />
        <Stack.Screen name="StudentSignIn" component={StudentSignIn} />
        <Stack.Screen name="StudentSignUp" component={StudentSignUp} />
        <Stack.Screen name="LecturerSignIn" component={LecturerSignIn} />
        <Stack.Screen name="LecturerSignUp" component={LecturerSignUp} />
        <Stack.Screen name="StudentApp">
          {() => <StudentTabNavigator />}
        </Stack.Screen>
        <Stack.Screen name="LecturerApp">
          {() => <LecturerTabNavigator />}
        </Stack.Screen>
        <Stack.Screen
          name="StudentUnitSelection"
          component={StudentSelectionScreen}
        />
        <Stack.Screen
          name="LecturerUnitSelection"
          component={LecturerSelectionScreen as any}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
