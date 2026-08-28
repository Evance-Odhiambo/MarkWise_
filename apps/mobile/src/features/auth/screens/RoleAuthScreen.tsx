import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Eye, EyeOff } from 'lucide-react-native';
import { API_BASE_URL } from '../../../shared/constants';
import { useAuth, UserRole } from '../context/AuthContext';
import type { RootStackParamList } from '../../../navigation/types';

type AuthMode = 'signIn' | 'signUp';
type AuthRoute =
  | 'StudentSignIn'
  | 'StudentSignUp'
  | 'LecturerSignIn'
  | 'LecturerSignUp';

type Props = {
  role: UserRole;
  mode: AuthMode;
  navigation: NativeStackNavigationProp<RootStackParamList, AuthRoute>;
};

type Institution = { id: string; name: string };
type VerifiedData = { name: string; course?: string };

const inputClass =
  'border border-slate-300 rounded-xl px-4 py-3 text-slate-900 bg-white';
const primaryButtonClass = 'rounded-xl bg-emerald-600 px-4 py-3 items-center';

// Admission and staff numbers are identifiers, so ignore accidental whitespace
// and use the same uppercase representation as the institutional records.
const cleanIdentifier = (value: string) =>
  value.trim().replace(/\s+/g, '').toUpperCase();

export default function RoleAuthScreen({ role, mode, navigation }: Props) {
  const { setSession } = useAuth();
  const isSignUp = mode === 'signUp';
  const [institutionId, setInstitutionId] = useState('');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [identifier, setIdentifier] = useState('');
  const [verifiedData, setVerifiedData] = useState<VerifiedData | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingInstitutions, setLoadingInstitutions] = useState(isSignUp);
  const [error, setError] = useState<string | null>(null);

  const isStudent = role === 'student';
  const identifierLabel = isStudent ? 'Admission number' : 'Staff number';
  const identifierPlaceholder = isStudent ? 'SCB211-0156/2025' : 'L789012';
  const title = isSignUp
    ? isStudent
      ? 'Student registration'
      : 'Lecturer registration'
    : `${isStudent ? 'Student' : 'Lecturer'} sign in`;

  useEffect(() => {
    if (!isSignUp) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    fetch(`${API_BASE_URL}/institutions/public`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async response => {
        const result = (await response.json().catch(() => null)) as {
          institutions?: Institution[];
          error?: string;
        } | null;
        if (!response.ok) {
          throw new Error(
            result?.error || `Unable to load institutions (${response.status})`,
          );
        }
        if (!Array.isArray(result?.institutions)) {
          throw new Error('The server returned an invalid institution list');
        }
        setInstitutions(result.institutions);
        if (result.institutions.length === 0) {
          setError(
            'No institutions have been configured yet. Ask an administrator to complete setup.',
          );
        }
      })
      .catch((requestError: unknown) => {
        if (
          requestError instanceof Error &&
          requestError.name === 'AbortError'
        ) {
          setError(
            'The server took too long to respond. Check your internet connection and try again.',
          );
        } else {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Unable to load institutions',
          );
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoadingInstitutions(false);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [isSignUp]);

  const requestJson = async (path: string, body: object) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Request failed');
    return result as Record<string, unknown>;
  };

  const handleVerify = async () => {
    const normalizedIdentifier = cleanIdentifier(identifier);
    if (!institutionId || !normalizedIdentifier) {
      setError(
        `Select an institution and enter your ${identifierLabel.toLowerCase()}`,
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await requestJson(
        isStudent ? '/students/verify' : '/lecturers/verify',
        {
          institutionId,
          ...(isStudent
            ? { admissionNumber: normalizedIdentifier }
            : { staffNumber: normalizedIdentifier }),
        },
      );
      setVerifiedData({
        name: String(result.name),
        course: result.course ? String(result.course) : undefined,
      });
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Verification failed',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await requestJson(
        isStudent ? '/students/login' : '/lecturers/login',
        {
          email: email.trim().toLowerCase(),
          password,
        },
      );
      await setSession({
        token: String(result.token),
        userId: String(result.userId),
        name: result.name ? String(result.name) : undefined,
        institutionId: result.institutionId
          ? String(result.institutionId)
          : null,
        course: result.course ? String(result.course) : undefined,
        admissionNumber: result.admissionNumber
          ? String(result.admissionNumber)
          : undefined,
        staffNumber: result.staffNumber
          ? String(result.staffNumber)
          : undefined,
        role,
        email: email.trim().toLowerCase(),
      });
      // AppEntry decides whether unit setup is needed from the local
      // WatermelonDB selection cache.
      navigation.replace('AppEntry');
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error ? requestError.message : 'Sign in failed',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!verifiedData) {
      await handleVerify();
      return;
    }
    const normalizedIdentifier = cleanIdentifier(identifier);
    if (!email.trim() || !password || password !== confirmPassword) {
      setError(
        password !== confirmPassword
          ? 'Passwords do not match'
          : 'Email and password are required',
      );
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await requestJson(
        isStudent ? '/students/register' : '/lecturers/register',
        {
          institutionId,
          ...(isStudent
            ? {
                admissionNumber: normalizedIdentifier,
                course: verifiedData.course,
              }
            : { staffNumber: normalizedIdentifier, name: verifiedData.name }),
          ...(isStudent ? { name: verifiedData.name } : {}),
          email: email.trim().toLowerCase(),
          password,
        },
      );
      navigation.replace(isStudent ? 'StudentSignIn' : 'LecturerSignIn');
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Registration failed',
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    navigation.replace(
      isStudent
        ? isSignUp
          ? 'StudentSignIn'
          : 'StudentSignUp'
        : isSignUp
        ? 'LecturerSignIn'
        : 'LecturerSignUp',
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-emerald-50">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="px-5 py-8"
        >
          <View className="flex-1 justify-center">
            <Text className="text-3xl font-bold text-slate-900">{title}</Text>
            <Text className="mt-2 mb-6 text-base text-slate-600">
              {isSignUp
                ? `Verify your ${identifierLabel.toLowerCase()} before creating an account.`
                : 'Use your MarkWise account to continue.'}
            </Text>

            {isSignUp && !verifiedData && (
              <View className="mb-5 rounded-2xl border border-emerald-100 bg-white p-4">
                <Text className="mb-2 font-semibold text-slate-800">
                  Institution
                </Text>
                {loadingInstitutions ? (
                  <ActivityIndicator color="#059669" />
                ) : institutions.length === 0 ? (
                  <Text className="text-red-600">
                    No institutions available.
                  </Text>
                ) : (
                  institutions.map(institution => (
                    <TouchableOpacity
                      key={institution.id}
                      onPress={() => setInstitutionId(institution.id)}
                      className={`mb-2 rounded-xl border px-4 py-3 ${
                        institution.id === institutionId
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <Text className="text-slate-800">{institution.name}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {isSignUp && !verifiedData ? (
              <View className="gap-4">
                <TextInput
                  className={inputClass}
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder={identifierPlaceholder}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  onPress={handleVerify}
                  disabled={loading}
                  className={primaryButtonClass}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="font-semibold text-white">
                      Verify identity
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View className="gap-4">
                {isSignUp && (
                  <Text className="rounded-xl bg-emerald-100 px-4 py-3 text-emerald-900">
                    Verified: {verifiedData?.name}
                    {verifiedData?.course ? ` - ${verifiedData.course}` : ''}
                  </Text>
                )}
                <TextInput
                  className={inputClass}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View className="flex-row items-center rounded-xl border border-slate-300 bg-white">
                  <TextInput
                    className="flex-1 px-4 py-3 text-slate-900"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(visible => !visible)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    className="px-4 py-3"
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#047857" />
                    ) : (
                      <Eye size={20} color="#047857" />
                    )}
                  </TouchableOpacity>
                </View>
                {isSignUp && (
                  <View className="flex-row items-center rounded-xl border border-slate-300 bg-white">
                    <TextInput
                      className="flex-1 px-4 py-3 text-slate-900"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm password"
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setShowConfirmPassword(visible => !visible)
                      }
                      accessibilityRole="button"
                      accessibilityLabel={
                        showConfirmPassword
                          ? 'Hide confirmation password'
                          : 'Show confirmation password'
                      }
                      className="px-4 py-3"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={20} color="#047857" />
                      ) : (
                        <Eye size={20} color="#047857" />
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity
                  onPress={isSignUp ? handleSignUp : handleSignIn}
                  disabled={loading}
                  className={primaryButtonClass}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="font-semibold text-white">
                      {isSignUp ? 'Create account' : 'Sign in'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {error && (
              <Text className="mt-4 text-center text-red-600">{error}</Text>
            )}
            <TouchableOpacity
              onPress={switchMode}
              className="mt-6 items-center"
            >
              <Text className="font-semibold text-emerald-700">
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : 'Need an account? Sign up'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('AppEntry')}
              className="mt-4 items-center"
            >
              <Text className="text-slate-500">Change role</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
