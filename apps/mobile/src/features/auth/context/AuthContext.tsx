import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { adaptiveConfig } from '../../../shared/utils/adaptiveAttendanceConfig';
import { clearSelectedUnitSelections } from '../../../shared/storage/unitMappings';
import BLEScanner from '../../native/NativeBLEScanner';
import BLEAdvertiser from '../../native/NativeBLEAdvertiser';
import { API_BASE_URL } from '../../../shared/constants';
import {
  readSessionSnapshot,
  cacheSessionSnapshot,
  isSessionSnapshotFresh,
  fetchStudentProfile,
  fetchLecturerProfile,
  runWithSessionRefreshLock,
  sessionCacheKey,
} from '../../../shared/storage/sessionCache';
export type UserRole = 'student' | 'lecturer';

export interface AuthSession {
  token: string;
  userId: string;
  role: UserRole;
  institutionId?: string | null;
  name?: string;
  email?: string;
  course?: string;
  admissionNumber?: string;
  staffNumber?: string;
}

interface AuthContextType {
  role: UserRole | null;
  session: AuthSession | null;
  token: string | null;
  userId: string | null;
  institutionId: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setRole: (role: UserRole) => void;
  setSession: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const SESSION_STORAGE_KEY = '@markwise/auth-session-v1';
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const hydrateSession = async () => {
      const snapshot = await readSessionSnapshot();

      if (!mounted) return;

      if (snapshot) {
        setSessionState(snapshot);
        setRole(snapshot.role);
      }

      // Splash can clear as soon as the session snapshot itself is known —
      // the unit-selection/BLE-mapping caches used to be read here too, but
      // their results were never used (see git history), so this was two
      // extra AsyncStorage round-trips purely delaying startup for no
      // benefit. Whatever actually needs those caches reads them itself.
      setIsHydrated(true);

      if (!snapshot) return;

      if (isSessionSnapshotFresh(snapshot)) return;

      await runWithSessionRefreshLock(
        `${snapshot.role}:${snapshot.userId}`,
        async () => {
          const profile =
            snapshot.role === 'student'
              ? await fetchStudentProfile(snapshot.token)
              : await fetchLecturerProfile(snapshot.token);

          if (!profile || !mounted) return;

          const refreshed: AuthSession = {
            ...snapshot,
            userId: profile.userId || snapshot.userId,
            name: profile.name || snapshot.name,
            institutionId:
              profile.institutionId ?? snapshot.institutionId ?? null,
            admissionNumber:
              profile.admissionNumber || snapshot.admissionNumber,
            course: profile.course || snapshot.course,
            staffNumber: profile.staffNumber || snapshot.staffNumber,
          };

          setSessionState(refreshed);
          await cacheSessionSnapshot(refreshed);
        },
      ).catch(() => undefined);
    };

    void hydrateSession();

    return () => {
      mounted = false;
    };
  }, []);

  const selectRole = useCallback((nextRole: UserRole) => {
    setRole(nextRole);
    setSessionState(current =>
      current && current.role === nextRole ? current : null,
    );
  }, []);

  const setSession = useCallback(async (nextSession: AuthSession) => {
    const normalized: AuthSession = {
      ...nextSession,
      role: nextSession.role,
      token: nextSession.token.trim(),
      userId: nextSession.userId.trim(),
      institutionId: nextSession.institutionId || null,
    };
    setSessionState(normalized);
    setRole(normalized.role);
    await Promise.all([
      AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalized)),
      cacheSessionSnapshot(normalized),
    ]);
  }, []);

  const signOut = useCallback(async () => {
    const currentSession = session;
    const cleanupErrors: unknown[] = [];
    try {
      await BLEScanner.stopScan();
    } catch (error) {
      cleanupErrors.push(error);
    }
    try {
      await BLEAdvertiser.stopAdvertising();
    } catch (error) {
      cleanupErrors.push(error);
    }
    if (currentSession) {
      try {
        await adaptiveConfig.clearForUser({
          userId: currentSession.userId,
          role: currentSession.role,
          institutionId: currentSession.institutionId,
        });
      } catch (error) {
        cleanupErrors.push(error);
      }
      try {
        await clearSelectedUnitSelections(
          currentSession.userId,
          currentSession.role,
          currentSession.institutionId,
        );
      } catch (error) {
        cleanupErrors.push(error);
      }
    } else if (role) {
      try {
        await clearSelectedUnitSelections('anonymous', role);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    setSessionState(null);
    setRole(null);
    try {
      await Promise.all([
        AsyncStorage.removeItem(SESSION_STORAGE_KEY),
        AsyncStorage.removeItem(sessionCacheKey()),
      ]);
    } catch (error) {
      cleanupErrors.push(error);
    }
    if (cleanupErrors.length)
      console.warn(
        '[Auth] Logout completed with local cleanup warnings',
        cleanupErrors,
      );
  }, [role, session]);

  const deleteAccount = useCallback(async () => {
    const currentSession = session;
    if (!currentSession) throw new Error('No active account');

    const endpoint =
      currentSession.role === 'student' ? '/students/me' : '/lecturers/me';
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${currentSession.token}` },
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok)
      throw new Error(result.error || 'Unable to delete account');

    await signOut();
  }, [session, signOut]);

  // Memoized so every consumer of useAuth() doesn't re-render (and, for
  // RootNavigator specifically, doesn't recreate its tab-navigator render
  // functions and force a full remount) on every AuthProvider render — only
  // when the actual auth state changes.
  const value = useMemo(
    () => ({
      role,
      session,
      token: session?.token ?? null,
      userId: session?.userId ?? null,
      institutionId: session?.institutionId ?? null,
      isAuthenticated: Boolean(session?.token),
      isHydrated,
      setRole: selectRole,
      setSession,
      signOut,
      deleteAccount,
    }),
    [role, session, isHydrated, selectRole, setSession, signOut, deleteAccount],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};
