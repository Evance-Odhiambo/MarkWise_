import './global.css';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { ThemeProvider } from './src/features/theme/context/ThemeContext';
import { AuthProvider } from './src/features/auth/context/AuthContext';
import OfflineAttendanceSync from './src/features/attendance/components/OfflineAttendanceSync';
import LecturerManualMarkSync from './src/features/attendance/components/LecturerManualMarkSync';
import FcmRegistration from './src/features/notifications/FcmRegistration';

export default function App() {
  return (
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
  );
}
