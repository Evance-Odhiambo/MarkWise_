import { useState, useCallback, useEffect } from 'react';
import { AttendanceSession, AttendanceStatus } from '../types';

const mockSessions: AttendanceSession[] = [
  {
    id: '1',
    mode: 'online',
    method: 'pin',
    status: 'active',
    startTime: new Date(Date.now() - 10 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 20 * 60000).toISOString(),
    pin: '4823',
    unitId: 'CS203',
    unitName: 'Object Oriented Programming',
    lecturerName: 'Dr. Felix Orati',
    attendedCount: 24,
    expectedCount: 35,
  },
  {
    id: '2',
    mode: 'in-person',
    method: 'ble',
    status: 'active',
    startTime: new Date(Date.now() - 5 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60000).toISOString(),
    unitId: 'MA101',
    unitName: 'Mathematics I',
    lecturerName: 'Prof. Jane Goodall',
    attendedCount: 18,
    expectedCount: 30,
  },
];

export const useAttendance = () => {
  const [sessions, setSessions] = useState<AttendanceSession[]>(mockSessions);
  const [loading, setLoading] = useState(false);

  const activeSession = sessions.find((s) => s.status === 'active');

  const joinSession = useCallback(async (sessionId: string, pin?: string): Promise<boolean> => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return false;
    if (session.pin && session.pin !== pin) return false;
    if (new Date(session.expiresAt) < new Date()) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, status: 'completed' as AttendanceStatus } : s
        )
      );
      return false;
    }
    return true;
  }, [sessions]);

  const startSession = useCallback(async (
    mode: 'online' | 'in-person',
    method: 'qr' | 'ble' | 'pin',
    durationMinutes: number = 30
  ): Promise<AttendanceSession> => {
    const now = new Date();
    const session: AttendanceSession = {
      id: Math.random().toString(36).substring(2, 10),
      mode,
      method,
      status: 'active',
      startTime: now.toISOString(),
      expiresAt: new Date(now.getTime() + durationMinutes * 60000).toISOString(),
      pin: method === 'pin' ? Math.floor(1000 + Math.random() * 9000).toString() : undefined,
      attendedCount: 0,
      expectedCount: 0,
    };
    setSessions((prev) => [session, ...prev]);
    return session;
  }, []);

  const endSession = useCallback((sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, status: 'completed', endTime: new Date().toISOString() } : s
      )
    );
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
    setSessions(mockSessions);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    sessions,
    activeSession,
    loading,
    joinSession,
    startSession,
    endSession,
    refetch,
  };
};
