import React from 'react';
import {
  Animated,
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
import {
  isUnitSelectionSnapshotFresh,
  readUnitSelectionSnapshot,
} from '../../../shared/storage/unitSelectionCache';
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

  const resetTo = React.useCallback(
    (name: keyof RootStackParamList) => {
      navigation.reset({ index: 0, routes: [{ name }] });
    },
    [navigation],
  );

  const [checkingUnits, setCheckingUnits] = React.useState(false);
  const loadingProgress = React.useRef(new Animated.Value(0.08)).current;

  React.useEffect(() => {
    const target = !isHydrated ? 0.28 : checkingUnits ? 0.78 : 1;
    Animated.timing(loadingProgress, {
      toValue: target,
      duration: 420,
      useNativeDriver: false,
    }).start();
  }, [checkingUnits, isHydrated, loadingProgress]);

  React.useEffect(() => {
    let mounted = true;

    const restoreDestination = async () => {
      if (!isHydrated || !session) return;
      if (session.token) {
        const destination =
          session.role === 'student' ? 'StudentApp' : 'LecturerApp';
        resetTo(destination);
        return;
      }
      setCheckingUnits(true);
      try {
        const snapshot = await readUnitSelectionSnapshot({
          role: session.role,
          userId: session.userId,
          institutionId: session.institutionId,
        });
        const selectedCodes = await loadSelectedUnitCodes({
          userId: session.userId,
          role: session.role,
          institutionId: session.institutionId,
        }).catch(() => [] as string[]);

        const hasSavedSelection =
          selectedCodes.length > 0 ||
          (snapshot && snapshot.selectedCodes.length > 0);

        if (snapshot && isUnitSelectionSnapshotFresh(snapshot)) {
          if (!mounted) return;
          resetTo(
            session.role === 'student'
              ? hasSavedSelection
                ? 'StudentApp'
                : 'StudentUnitSelection'
              : hasSavedSelection
                ? 'LecturerApp'
                : 'LecturerUnitSelection',
          );
          return;
        }

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
            resetTo(
              body.enrolledUnitIds?.length || hasSavedSelection
                ? 'StudentApp'
                : 'StudentUnitSelection',
            );
          } catch {
            if (!mounted) return;
            resetTo(
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
          resetTo(
            body.selectedUnitIds?.length || hasSavedSelection
              ? 'LecturerApp'
              : 'LecturerUnitSelection',
          );
        } catch {
          if (!mounted) return;
          resetTo(
            selectedCodes.length ? 'LecturerApp' : 'LecturerUnitSelection',
          );
        }
      } catch {
        if (mounted)
          resetTo(
            session.role === 'student'
              ? 'StudentUnitSelection'
              : 'LecturerUnitSelection',
          );
      } finally {
        if (mounted) setCheckingUnits(false);
      }
    };

    void restoreDestination();
    return () => {
      mounted = false;
    };
  }, [isHydrated, resetTo, session]);

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

  if (session?.token) {
    return null;
  }

  if (!isHydrated || checkingUnits) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center px-8 ${backgroundClasses}`}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View className="mb-7 h-20 w-20 items-center justify-center rounded-3xl bg-emerald-600 shadow-lg shadow-emerald-200">
          <Text className="text-4xl font-extrabold text-white">✓</Text>
        </View>
        <Text className={`text-4xl font-extrabold ${titleClasses}`}>
          MarkWise
        </Text>
        <Text
          className={`mt-2 text-center text-xs font-semibold uppercase tracking-[0.2em] ${accentTextClasses}`}
        >
          Attendance Intelligence
        </Text>
        <Text className={`mt-10 text-base font-semibold ${subtitleClasses}`}>
          Loading MarkWise
        </Text>
        <View
          className={`mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full ${
            isDark ? 'bg-slate-800' : 'bg-emerald-100'
          }`}
        >
          <Animated.View
            className="h-full rounded-full bg-emerald-600"
            style={{
              width: loadingProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            }}
          />
        </View>
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
