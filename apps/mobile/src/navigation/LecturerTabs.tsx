import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home as HomeIcon, Settings as SettingsIcon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import LecturerHomeScreen from '../features/dashboard/screens/lecturer/HomeScreen';
import LecturerSettingsScreen from '../features/dashboard/screens/lecturer/SettingsScreen';
import { LecturerTabParamList, RootStackParamList } from './types';
import { useColorScheme } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const Tab = createBottomTabNavigator<LecturerTabParamList>();

type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export default function LecturerTabNavigator() {
  const colorScheme = useColorScheme();
  const activeColor = '#10b981';
  const inactiveColor = '#9ca3af';
  const backgroundColor = colorScheme === 'dark' ? '#0f172a' : '#ffffff';
  const navigation = useNavigation<RootNavProp>();

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate('AppEntry');
        return true;
      };
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );
      return () => subscription.remove();
    }, [navigation])
  );

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor,
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={LecturerHomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <HomeIcon color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={LecturerSettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <SettingsIcon color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
