import React from 'react';
import {
  Alert,
  View,
  Text,
  Switch,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MoonStar,
  Bell,
  Shield,
  CircleHelp,
  UserRound,
  Trash2,
  LogOut,
} from 'lucide-react-native';
import { useTheme } from '../../../theme/context/ThemeContext';
import { useAuth } from '../../../auth/context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const StudentSettingsScreen = () => {
  const { isDark, toggleTheme } = useTheme();
  const { signOut, deleteAccount } = useAuth();
  const navigation = useNavigation<any>();

  const screenClasses = isDark ? 'bg-slate-950' : 'bg-slate-50';

  const cardClasses = isDark
    ? 'bg-slate-900 border-slate-800'
    : 'bg-white border-slate-200';

  const textClasses = isDark ? 'text-slate-100' : 'text-slate-900';
  const secondaryTextClasses = isDark ? 'text-slate-300' : 'text-slate-600';

  const handleDeleteAccount = () =>
    Alert.alert(
      'Delete account?',
      'Your login credentials will be permanently removed. Your institutional student record and attendance history will be retained. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () =>
            void deleteAccount()
              .then(() => navigation.getParent()?.navigate('AppEntry'))
              .catch((error: unknown) => {
                Alert.alert(
                  'Unable to delete account',
                  error instanceof Error ? error.message : 'Please try again.',
                );
              }),
        },
      ],
    );

  return (
    <SafeAreaView className={`flex-1 ${screenClasses}`}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 40,
          flexGrow: 1,
        }}
      >
        <View className="mb-6">
          <Text className={`text-2xl font-bold ${textClasses}`}>Settings</Text>
          <Text className={`mt-1 text-sm ${secondaryTextClasses}`}>
            Personalize your MarkWise experience
          </Text>
        </View>

        <View className={`mt-6 rounded-3xl border p-4 ${cardClasses}`}>
          <View className="mb-4 flex-row items-center gap-3">
            <View
              className={`h-10 w-10 items-center justify-center rounded-2xl ${
                isDark ? 'bg-slate-800' : 'bg-emerald-100'
              }`}
            >
              <UserRound size={20} color={isDark ? '#a7f3d0' : '#059669'} />
            </View>
            <View>
              <Text className={`font-semibold ${textClasses}`}>Account</Text>
              <Text className={`text-xs ${secondaryTextClasses}`}>
                Manage your MarkWise account
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'Log out?',
                'You can log out while offline. Local attendance records remain on this device and BLE mappings will be cleared.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Log out',
                    style: 'destructive',
                    onPress: () =>
                      void signOut().then(() =>
                        navigation.getParent()?.navigate('AppEntry'),
                      ),
                  },
                ],
              )
            }
            className="mb-3 flex-row items-center rounded-2xl border border-slate-200 p-4"
          >
            <LogOut size={18} color={isDark ? '#d1fae5' : '#047857'} />
            <Text className={`ml-3 font-semibold ${textClasses}`}>
              Sign out
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteAccount}
            className="flex-row items-center rounded-2xl border border-red-200 bg-red-50 p-4"
          >
            <Trash2 size={18} color="#dc2626" />
            <Text className="ml-3 font-semibold text-red-600">
              Delete account
            </Text>
          </TouchableOpacity>
        </View>

        <View className={`rounded-3xl border p-4 ${cardClasses}`}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View
                className={`w-10 h-10 rounded-2xl items-center justify-center ${
                  isDark ? 'bg-slate-800' : 'bg-emerald-100'
                }`}
              >
                <MoonStar size={20} color={isDark ? '#a7f3d0' : '#059669'} />
              </View>

              <View>
                <Text className={`font-semibold ${textClasses}`}>
                  Dark mode
                </Text>
                <Text className={`text-xs ${secondaryTextClasses}`}>
                  Enable a darker interface
                </Text>
              </View>
            </View>

            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#cbd5e1', true: '#34d399' }}
              thumbColor={isDark ? '#ffffff' : '#f8fafc'}
            />
          </View>
        </View>

        <View className="mt-6 space-y-3">
          {[
            {
              icon: Bell,
              label: 'Notifications',
              desc: 'Manage alerts and reminders',
              accent: 'bg-amber-100',
              accentDark: 'bg-amber-500/20',
            },
            {
              icon: Shield,
              label: 'Privacy',
              desc: 'Security and account controls',
              accent: 'bg-blue-100',
              accentDark: 'bg-blue-500/20',
            },
            {
              icon: CircleHelp,
              label: 'Help & support',
              desc: 'FAQs and contact centre',
              accent: 'bg-violet-100',
              accentDark: 'bg-violet-500/20',
            },
          ].map(({ icon: Icon, label, desc, accent, accentDark }) => (
            <View
              key={label}
              className={`rounded-2xl border p-4 flex-row items-center justify-between ${cardClasses}`}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className={`w-10 h-10 rounded-2xl items-center justify-center ${
                    isDark ? accentDark : accent
                  }`}
                >
                  <Icon size={18} color={isDark ? '#d1fae5' : '#0f172a'} />
                </View>
                <View>
                  <Text className={`font-medium ${textClasses}`}>{label}</Text>
                  <Text className={`text-xs ${secondaryTextClasses}`}>
                    {desc}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default StudentSettingsScreen;
