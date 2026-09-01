import { useCallback, useEffect, useState } from 'react';
import type { InPersonSession } from '../types/inPerson';
import {
  createInPersonSession,
  endInPersonSession,
} from '../api/inPersonAttendanceApi';
import {
  storeAttendanceSessionSecret,
  clearAttendanceSessionSecret,
} from '../../../shared/security/secureKeyStorage';
import { cacheInPersonSession } from '../../../shared/storage/inPersonSessionCache';
import { saveUnitMappings } from '../../../shared/storage/unitMappings';
import { useAuth } from '../../auth/context/AuthContext';
import {
  randomNonce,
  randomSecret,
  randomSessionId,
} from '../security/attendanceCrypto';

/** How often to retry claiming a locally-started session on the server. */
const CLAIM_RETRY_MS = 20_000;

type PendingClaim = {
  id: string;
  unitCode: string;
  sessionStart: number;
  expiresAt: number;
  sessionNonce: number;
  sessionSecret: string;
  bleUnitId: number | null;
};

export const useInPersonSession = (token: string | null) => {
  const { userId, institutionId } = useAuth();
  const [session, setSession] = useState<InPersonSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [pendingClaim, setPendingClaim] = useState<PendingClaim | null>(null);

  // The lecturer device always generates the full session identity itself
  // and starts broadcasting immediately — online or not, session start
  // never waits on a network round-trip. The identity is then "claimed"
  // server-side in the background (below), idempotently, so every
  // already-broadcast QR/PIN/BLE payload and every attendance record a
  // student already queued against this id stays valid once the claim
  // succeeds — no per-record reconciliation needed.
  const start = useCallback(
    async (input: {
      unitCode: string;
      durationMinutes?: number;
      bleUnitId?: number | null;
    }) => {
      setLoading(true);
      try {
        const durationMs = Math.min(input.durationMinutes ?? 10, 60) * 60_000;
        const sessionStart = Math.floor(Date.now() / 1_000) * 1_000;
        const id = randomSessionId();
        const sessionNonce = randomNonce();
        const sessionSecret = randomSecret();
        const bleUnitId = input.bleUnitId ?? null;
        const localSession: InPersonSession = {
          id,
          unitCode: input.unitCode,
          sessionStart,
          expiresAt: sessionStart + durationMs,
          sessionNonce,
          bleUnitId,
          status: 'active',
        };
        await storeAttendanceSessionSecret(id, sessionSecret);
        await cacheInPersonSession(localSession);
        setSession(localSession);
        setClaimed(false);
        setPendingClaim({
          id,
          unitCode: input.unitCode,
          sessionStart,
          expiresAt: localSession.expiresAt,
          sessionNonce,
          sessionSecret,
          bleUnitId,
        });
        return { ...localSession, sessionSecret };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Retries claiming the session server-side until it succeeds, the claim
  // is abandoned (e.g. an ownership conflict, which should be
  // astronomically unlikely given a random UUID), or the component unmounts.
  useEffect(() => {
    if (!pendingClaim || !token) return;
    let cancelled = false;
    const attemptClaim = async () => {
      try {
        const result = await createInPersonSession(
          {
            unitCode: pendingClaim.unitCode,
            expiresAt: new Date(pendingClaim.expiresAt).toISOString(),
            id: pendingClaim.id,
            sessionNonce: pendingClaim.sessionNonce,
            sessionSecret: pendingClaim.sessionSecret,
            sessionStart: pendingClaim.sessionStart,
            bleUnitId: pendingClaim.bleUnitId,
          },
          token,
        );
        if (cancelled) return;
        const safeSession = { ...result.data, sessionSecret: undefined };
        await cacheInPersonSession(safeSession);
        if (cancelled) return;
        setSession(current =>
          current?.id === safeSession.id ? safeSession : current,
        );
        setClaimed(true);
        setPendingClaim(null);
        // The claim is often the first time this device learns a unit's real
        // bleUnitId (the local cache was empty/stale, e.g. a fresh login or
        // a unit synced from a different device) — persist it so every
        // future session for this unit resolves it instantly from the local
        // cache, online or offline, instead of starting with no BLE beacon
        // every time until the next claim round-trip corrects it.
        if (safeSession.bleUnitId != null && userId)
          await saveUnitMappings(
            { userId, role: 'lecturer', institutionId },
            [
              {
                unitCode: safeSession.unitCode,
                bleId: String(safeSession.bleUnitId),
              },
            ],
          ).catch(() => undefined);
      } catch (error) {
        if (cancelled) return;
        const reason =
          error && typeof error === 'object' && 'reason' in error
            ? (error as { reason?: string }).reason
            : undefined;
        // Astronomically unlikely (random UUID collision with another
        // lecturer's session) but not recoverable by retrying.
        if (reason === 'SESSION_OWNERSHIP_CONFLICT') setPendingClaim(null);
        // Otherwise: transient (offline/server error) — the interval retries.
      }
    };
    void attemptClaim();
    const interval = setInterval(() => void attemptClaim(), CLAIM_RETRY_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pendingClaim, token, userId, institutionId]);

  const end = useCallback(async () => {
    if (!session) return;
    setPendingClaim(null);
    // Safe to always attempt: the backend's endSession uses updateMany and
    // silently no-ops (count: 0) if this session was never claimed.
    if (token) await endInPersonSession(session.id, token).catch(() => undefined);
    await clearAttendanceSessionSecret(session.id);
    setSession(null);
    setClaimed(false);
  }, [session, token]);

  const adopt = useCallback(async (adopted: InPersonSession) => {
    await cacheInPersonSession(adopted);
    setSession(adopted);
    // A delegated/adopted session already exists server-side.
    setClaimed(true);
    setPendingClaim(null);
  }, []);

  return { session, loading, claimed, start, end, adopt };
};
