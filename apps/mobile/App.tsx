import './global.css';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { ThemeProvider } from './src/features/theme/context/ThemeContext';
import { AuthProvider } from './src/features/auth/context/AuthContext';
import OfflineAttendanceSync from './src/features/attendance/components/OfflineAttendanceSync';
import LecturerManualMarkSync from './src/features/attendance/components/LecturerManualMarkSync';
import FcmRegistration from './src/features/notifications/FcmRegistration';

export default function App() {
  return (
    // Required by react-native-gesture-handler v2+ for any gesture handler
    // to work at all — NotificationItem's swipe-to-delete (Swipeable from
    // react-native-gesture-handler/ReanimatedSwipeable, used by both the
    // student and lecturer notification screens) throws "... must be used
    // as a descendant of GestureHandlerRootView" without this wrapping the
    // app root. index.js's `import 'react-native-gesture-handler'` only
    // registers the native module; it doesn't provide this.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <OfflineAttendanceSync />
            <LecturerManualMarkSync />
            <FcmRegistration />
            <RootNavigator />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
