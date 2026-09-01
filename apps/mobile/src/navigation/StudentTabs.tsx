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
import StudentHomeScreen from '../features/dashboard/screens/student/HomeScreen';
import StudentSettingsScreen from '../features/dashboard/screens/student/SettingsScreen';
import NotificationStack from '../features/notifications/components/NotificationStack';
import AttendanceStack from '../features/attendance/components/AttendanceStack';
import { useNotifications } from '../features/notifications/hooks/useNotifications';
import { useAuth } from '../features/auth/context/AuthContext';
import { StudentTabParamList, RootStackParamList } from './types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../features/theme/context/ThemeContext';

const Tab = createBottomTabNavigator<StudentTabParamList>();

type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

// Defined once at module scope, not inline in tabBarIcon, so React Navigation
// sees the same component identity across renders instead of remounting the
// icon on every StudentTabNavigator re-render (react/no-unstable-nested-components).
type TabIconProps = { color: string; size: number };
const HomeTabIcon = ({ color, size }: TabIconProps) => (
  <HomeIcon color={color} size={size} />
);
const AlertsTabIcon = ({ color, size }: TabIconProps) => (
  <Bell color={color} size={size} />
);
const AttendanceTabIcon = ({ color, size }: TabIconProps) => (
  <CalendarClock color={color} size={size} />
);
const SettingsTabIcon = ({ color, size }: TabIconProps) => (
  <SettingsIcon color={color} size={size} />
);

export default function StudentTabNavigator() {
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
      // detachInactiveScreens physically tears down and rebuilds each tab's
      // native view hierarchy on every switch. On reattach, the fresh native
      // view briefly reports stale/zero safe-area insets before
      // react-native-safe-area-context's WindowInsets callback corrects it -
      // that's the "pops out of the safe area then snaps in" flash, and the
      // teardown/rebuild itself is what makes the switch feel slow. lazy +
      // freezeOnBlur below are JS-level (mount-once, pause when unfocused)
      // and give most of the same win without touching the native tree.
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
        component={StudentHomeScreen}
        options={{ tabBarIcon: HomeTabIcon }}
      />
      <Tab.Screen
        name="Alerts"
        component={NotificationStack}
        options={{
          tabBarIcon: AlertsTabIcon,
          tabBarBadge: unreadCount > 9 ? '9+' : unreadCount > 0 ? unreadCount : undefined,
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
        options={{ tabBarIcon: AttendanceTabIcon, tabBarLabel: 'Attendance' }}
      />
      <Tab.Screen
        name="Settings"
        component={StudentSettingsScreen}
        options={{ tabBarIcon: SettingsTabIcon }}
      />
    </Tab.Navigator>
  );
}
