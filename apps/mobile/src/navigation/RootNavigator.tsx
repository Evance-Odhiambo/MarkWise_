import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Linking, View, Text, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import AppEntryScreen from '../features/auth/screens/AppEntryScreen';
import StudentSignIn from '../features/auth/screens/StudentSignIn';
import StudentSignUp from '../features/auth/screens/StudentSignUp';
import LecturerSignIn from '../features/auth/screens/LecturerSignIn';
import LecturerSignUp from '../features/auth/screens/LecturerSignUp';
import StudentTabNavigator from './StudentTabs';
import LecturerTabNavigator from './LecturerTabs';
import StudentSelectionScreen from '../features/unit-selection/screens/StudentSelectionScreen';
import LecturerSelectionScreen from '../features/unit-selection/screens/LecturerSelectionScreen';
import { useAuth } from '../features/auth/context/AuthContext';
import { RootStackParamList } from './types';
import { useAttendancePermissions } from '../features/attendance/hooks/useAttendancePermissions';
import { subscribeToIncomingAttendanceLinks } from '../features/attendance/deepLink/incomingAttendanceLink';
import { WEB_APP_URL } from '../shared/constants';

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

const BootSplash = () => {
  const progress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 320,
      useNativeDriver: false,
    });

    animation.start();
    return () => animation.stop();
  }, [progress]);

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-emerald-50 px-8">
      <StatusBar barStyle="dark-content" />
      <View className="mb-7 h-20 w-20 items-center justify-center rounded-3xl bg-emerald-600 shadow-lg shadow-emerald-200">
        <Text className="text-4xl font-extrabold text-white">✓</Text>
      </View>
      <Text className="text-4xl font-extrabold text-slate-900">MarkWise</Text>
      <Text className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
        Loading your workspace
      </Text>
      <View className="mt-10 h-2 w-full max-w-xs overflow-hidden rounded-full bg-emerald-100">
        <Animated.View
          className="h-full rounded-full bg-emerald-600"
          style={{
            width: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const RootNavigator = () => {
  const { isHydrated, session } = useAuth();
  useAttendancePermissions();

  const hasSession = Boolean(session?.token);

  const initialRouteName = React.useMemo(() => {
    if (hasSession && session) {
      return session.role === 'student' ? 'StudentApp' : 'LecturerApp';
    }
    return 'AppEntry';
  }, [hasSession, session]);

  // Deep-link handling needs the latest auth state, but must subscribe to
  // Linking exactly once — Linking.getInitialURL() isn't "consumed", so
  // re-subscribing on every auth-state change would reprocess the same
  // cold-start link every time the student later logs in/out. A ref holds
  // the latest values for the one long-lived subscription below to read.
  const authStateRef = useRef({ isHydrated, hasSession, session });
  useEffect(() => {
    authStateRef.current = { isHydrated, hasSession, session };
  }, [isHydrated, hasSession, session]);

  // Buffers a link caught before hydration finishes (cold start) until the
  // flush effect further down can process it.
  const pendingSessionIdRef = useRef<string | null>(null);

  const openInAttendanceScreen = useCallback((sessionId: string) => {
    const navigate = () => {
      if (!navigationRef.isReady()) {
        setTimeout(navigate, 100);
        return;
      }
      navigationRef.navigate('StudentApp', {
        screen: 'Attendance',
        params: { screen: 'MarkOnline', params: { sessionId, autoMark: true } },
      });
    };
    navigate();
  }, []);

  const processSessionId = useCallback(
    (sessionId: string) => {
      const current = authStateRef.current;
      if (!current.isHydrated) {
        pendingSessionIdRef.current = sessionId;
        return;
      }
      if (current.hasSession && current.session?.role === 'student') {
        openInAttendanceScreen(sessionId);
        return;
      }
      // Not a logged-in student (logged out, or a lecturer tapped a
      // student's link) — the app can't complete this itself, so bounce
      // back out to the browser rather than silently swallowing the link
      // and stranding the student on the blank page the web side leaves
      // behind once it sees the app came to the foreground.
      Linking.openURL(`${WEB_APP_URL}/attend?session=${sessionId}`).catch(
        () => undefined,
      );
    },
    [openInAttendanceScreen],
  );

  useEffect(
    () => subscribeToIncomingAttendanceLinks(processSessionId),
    [processSessionId],
  );

  // Flushes a link that arrived before hydration finished, once it does.
  useEffect(() => {
    if (isHydrated && pendingSessionIdRef.current) {
      const pending = pendingSessionIdRef.current;
      pendingSessionIdRef.current = null;
      processSessionId(pending);
    }
  }, [isHydrated, processSessionId]);

  if (!isHydrated && !hasSession) {
    return <BootSplash />;
  }

  return (
    <NavigationContainer
      key={`root-${session?.role ?? 'guest'}`}
      ref={navigationRef}
    >
      <Stack.Navigator
        initialRouteName={initialRouteName}
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
        <Stack.Screen name="StudentApp" component={StudentTabNavigator} />
        <Stack.Screen name="LecturerApp" component={LecturerTabNavigator} />
        <Stack.Screen
          name="StudentUnitSelection"
          component={StudentSelectionScreen as any}
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
