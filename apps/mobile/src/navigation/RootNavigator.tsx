import React from 'react';
import { Animated, View, Text, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { useAuth } from '../features/auth/context/AuthContext';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

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

  const hasSession = Boolean(session?.token);

  const initialRouteName = React.useMemo(() => {
    if (hasSession && session) {
      return session.role === 'student' ? 'StudentApp' : 'LecturerApp';
    }
    return 'AppEntry';
  }, [hasSession, session]);

  if (!isHydrated && !hasSession) {
    return <BootSplash />;
  }

  return (
    <NavigationContainer key={`root-${session?.role ?? 'guest'}`}>
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
        <Stack.Screen name="StudentApp">
          {() => <StudentTabNavigator />}
        </Stack.Screen>
        <Stack.Screen name="LecturerApp">
          {() => <LecturerTabNavigator />}
        </Stack.Screen>
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
