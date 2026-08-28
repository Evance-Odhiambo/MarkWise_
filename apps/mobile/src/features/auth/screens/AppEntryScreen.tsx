import React from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, GraduationCap, ArrowRight } from 'lucide-react-native';
import { useAuth, UserRole } from '../context/AuthContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { useTheme } from '../../theme/context/ThemeContext';
import { useResponsive } from '../../theme/hooks/useResponsive';
import { loadSelectedUnitCodes } from '../../../shared/storage/unitMappings';
import { API_BASE_URL } from '../../../shared/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'AppEntry'>;

const AppEntryScreen = ({ navigation }: Props) => {
  const { setRole, session, isHydrated } = useAuth();
  const { isDark } = useTheme();
  const { isTablet, isMobile } = useResponsive();

  const backgroundClasses = isDark ? 'bg-slate-950' : 'bg-emerald-50';
  const cardClasses = isDark
    ? 'bg-slate-900 border-slate-800'
    : 'bg-white border-emerald-100';
  const titleClasses = isDark ? 'text-white' : 'text-slate-900';
  const subtitleClasses = isDark ? 'text-slate-300' : 'text-slate-500';
  const accentTextClasses = isDark ? 'text-emerald-300' : 'text-emerald-700';

  const handleRoleSelect = (role: UserRole) => {
    setRole(role);
    navigation.navigate(
      role === 'student' ? 'StudentSignIn' : 'LecturerSignIn',
    );
  };

  const [checkingUnits, setCheckingUnits] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    const restoreDestination = async () => {
      if (!isHydrated || !session) return;
      setCheckingUnits(true);
      try {
        // The backend is the source of truth while online. A locally selected
        // unit is not necessarily an enrolled unit (it may be stale or may
        // belong to a previous incomplete enrollment sync).
        if (session.role === 'student') {
          try {
            const response = await fetch(
              `${API_BASE_URL}/students/units/catalog`,
              {
                headers: { Authorization: `Bearer ${session.token}` },
              },
            );
            if (!response.ok) throw new Error('Unable to check enrolled units');
            const body = (await response.json()) as {
              enrolledUnitIds?: string[];
            };
            navigation.replace(
              body.enrolledUnitIds?.length
                ? 'StudentApp'
                : 'StudentUnitSelection',
            );
          } catch {
            // Preserve offline access for an existing student whose units are
            // already stored locally.
            const selectedCodes = await loadSelectedUnitCodes({
              userId: session.userId,
              role: session.role,
              institutionId: session.institutionId,
            });
            if (!mounted) return;
            navigation.replace(
              selectedCodes.length ? 'StudentApp' : 'StudentUnitSelection',
            );
          }
          return;
        }

        try {
          const response = await fetch(
            `${API_BASE_URL}/lecturers/units/catalog`,
            {
              headers: { Authorization: `Bearer ${session.token}` },
            },
          );
          if (!response.ok) throw new Error('Unable to check teaching units');
          const body = (await response.json()) as {
            selectedUnitIds?: string[];
          };
          navigation.replace(
            body.selectedUnitIds?.length
              ? 'LecturerApp'
              : 'LecturerUnitSelection',
          );
        } catch {
          // If the API is unavailable, use the local selection so an existing
          // user can still open the app and attend offline.
          const selectedCodes = await loadSelectedUnitCodes({
            userId: session.userId,
            role: session.role,
            institutionId: session.institutionId,
          });
          if (!mounted) return;
          navigation.replace(
            selectedCodes.length ? 'LecturerApp' : 'LecturerUnitSelection',
          );
        }
      } catch {
        // A database read failure should not strand the user on the entry
        // screen. The selection screen can recover/sync the catalogue.
        if (mounted) navigation.replace('LecturerUnitSelection');
      } finally {
        if (mounted) setCheckingUnits(false);
      }
    };

    void restoreDestination();
    return () => {
      mounted = false;
    };
  }, [isHydrated, navigation, session]);

  const roles = [
    {
      id: 'student',
      title: 'Student',
      subtitle: 'Mark attendance and view unit progress',
      icon: GraduationCap,
      buttonClass: isDark ? 'bg-emerald-600' : 'bg-emerald-600',
      textClass: 'text-white',
    },
    {
      id: 'lecturer',
      title: 'Lecturer',
      subtitle: 'Take attendance and view unit progress',
      icon: BookOpen,
      buttonClass: isDark ? 'bg-slate-700' : 'bg-slate-800',
      textClass: 'text-white',
    },
  ] as const;

  const logoSize = isTablet ? 96 : 80;
  const contentMaxWidth = isTablet ? 'max-w-xl' : 'max-w-md';
  const horizontalPadding = isTablet ? 'px-8' : 'px-5';
  const verticalPadding = isTablet ? 'py-12' : 'py-8';
  const cardRadius = isTablet ? 'rounded-[32px]' : 'rounded-[28px]';

  if (!isHydrated || checkingUnits) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${backgroundClasses}`}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color="#059669" />
        <Text className={`mt-4 ${subtitleClasses}`}>
          {checkingUnits
            ? 'Restoring your units...'
            : 'Restoring your session...'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${backgroundClasses}`}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View
        className={`flex-1 ${horizontalPadding} ${verticalPadding} justify-center ${contentMaxWidth} self-center`}
      >
        <View className="items-center mb-8">
          <View
            style={{ width: logoSize, height: logoSize }}
            className="rounded-2xl bg-emerald-600 items-center justify-center shadow-lg shadow-emerald-200 mb-4"
          >
            <Text className="text-4xl">✓</Text>
          </View>

          <Text className={`text-5xl font-extrabold ${titleClasses}`}>
            MarkWise
          </Text>
          <Text
            className={`text-sm tracking-[0.22em] uppercase mt-2 ${accentTextClasses}`}
          >
            Attendance Intelligence
          </Text>
        </View>

        <View className={`${cardRadius} p-5 shadow-xl border ${cardClasses}`}>
          <Text className={`text-2xl font-bold mb-2 ${titleClasses}`}>
            Continue as:
          </Text>
          <Text className={`text-base mb-6 ${subtitleClasses}`}>
            Choose the role that best matches how you use MarkWise.
          </Text>

          <View className="gap-4">
            {roles.map(
              ({ id, title, subtitle, icon: Icon, buttonClass, textClass }) => (
                <TouchableOpacity
                  key={id}
                  activeOpacity={0.9}
                  onPress={() => handleRoleSelect(id)}
                  className={`${buttonClass} rounded-2xl p-4 flex-row items-center justify-between shadow-md`}
                >
                  <View className="flex-row items-center flex-1">
                    <View
                      style={{
                        width: isTablet ? 48 : 40,
                        height: isTablet ? 48 : 40,
                      }}
                      className="rounded-xl bg-white/15 items-center justify-center mr-4"
                    >
                      <Icon color="white" size={isTablet ? 28 : 26} />
                    </View>

                    <View className="flex-1">
                      <Text
                        className={`font-bold ${
                          isTablet ? 'text-xl' : 'text-lg'
                        } ${textClass}`}
                      >
                        {title}
                      </Text>
                      <Text
                        className={`mt-1 ${
                          isTablet ? 'text-sm' : 'text-sm'
                        } ${textClass} opacity-80`}
                      >
                        {subtitle}
                      </Text>
                    </View>
                  </View>

                  <ArrowRight color="white" size={isTablet ? 24 : 20} />
                </TouchableOpacity>
              ),
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default AppEntryScreen;
