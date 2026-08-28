import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Home as HomeIcon,
  Settings as SettingsIcon,
  Bell,
  CalendarClock,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import LecturerHomeScreen from '../features/dashboard/screens/lecturer/HomeScreen';
import LecturerSettingsScreen from '../features/dashboard/screens/lecturer/SettingsScreen';
import NotificationStack from '../features/notifications/components/NotificationStack';
import AttendanceStack from '../features/attendance/components/AttendanceStack';
import { useNotifications } from '../features/notifications/hooks/useNotifications';
import { useAuth } from '../features/auth/context/AuthContext';
import { LecturerTabParamList, RootStackParamList } from './types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../features/theme/context/ThemeContext';

const Tab = createBottomTabNavigator<LecturerTabParamList>();

type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export default function LecturerTabNavigator() {
  const { isDark } = useTheme();
  const activeColor = '#10b981';
  const inactiveColor = '#9ca3af';
  const backgroundColor = isDark ? '#0f172a' : '#ffffff';
  const navigation = useNavigation<RootNavProp>();
  const { role } = useAuth();
  const { unreadCount } = useNotifications(role ?? undefined);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        const state = navigation.getState();
        const canGoBackInTree = (s: any): boolean => {
          if (!s || !s.routes) return false;
          const route = s.routes[s.index];
          if (route?.state) {
            const nested = route.state;
            if (nested.index && nested.index > 0) return true;
            return canGoBackInTree(nested);
          }
          return false;
        };
        if (canGoBackInTree(state)) {
          return false;
        }
        navigation.navigate('AppEntry');
        return true;
      };
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => subscription.remove();
    }, [navigation]),
  );

  return (
    <Tab.Navigator
      detachInactiveScreens
      screenOptions={{
        lazy: true,
        freezeOnBlur: true,
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
        name="Alerts"
        component={NotificationStack}
        options={{
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontSize: 10,
            minWidth: 16,
            paddingHorizontal: 3,
          },
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <CalendarClock color={color} size={size} />
          ),
          tabBarLabel: 'Attendance',
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
