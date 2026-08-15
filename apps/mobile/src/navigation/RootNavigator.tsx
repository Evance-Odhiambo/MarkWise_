import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from '../features/auth/context/AuthContext';
import AppEntryScreen from '../features/auth/screens/AppEntryScreen';
import StudentTabNavigator from './StudentTabs';
import LecturerTabNavigator from './LecturerTabs';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="AppEntry"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="AppEntry" component={AppEntryScreen} />
          <Stack.Screen name="StudentApp">
            {() => <StudentTabNavigator />}
          </Stack.Screen>
          <Stack.Screen name="LecturerApp">
            {() => <LecturerTabNavigator />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
};

export default RootNavigator;
