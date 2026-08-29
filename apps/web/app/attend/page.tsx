"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getOnlineSession,
  getPasskeyAttendanceOptions,
  getPasskeyRegistrationOptions,
  verifyPasskeyAttendance,
  verifyPasskeyRegistration,
  type OnlineSession,
} from "@/lib/online-attendance";
import { RoleWorkspaceShell } from "@/components/workspace/RoleWorkspaceShell";

export default function AttendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("session");
  const [session, setSession] = useState<OnlineSession | null>(null);
  const [message, setMessage] = useState("Loading attendance session…");
  const [authReady, setAuthReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState("");

  useEffect(() => {
    if (!id) {
      setMessage("This attendance link is missing its session.");
      setAuthReady(true);
      return;
    }

    let user: { token?: string; role?: string } = {};
    try {
      user = JSON.parse(localStorage.getItem("user") ?? "{}");
    } catch {
      localStorage.removeItem("user");
    }

    if (!user.token || user.role !== "student") {
      const returnTo = `/attend?session=${encodeURIComponent(id)}`;
      router.replace(`/student/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    setAuthReady(true);
    getOnlineSession(id)
      .then((result) => setSession(result.data))
      .catch((error) =>
        setMessage(
          error instanceof Error
            ? error.message
            : "This session is unavailable.",
        ),
      );
  }, [id, router]);

  async function registerPasskey() {
    setBusy(true);
    setPasskeyMessage("");
    try {
      const options = await getPasskeyRegistrationOptions();
      const credential = await startRegistration({ optionsJSON: options.data });
      await verifyPasskeyRegistration(credential);
      setPasskeyMessage("Passkey registered. You can now mark attendance.");
    } catch (error) {
      setPasskeyMessage(
        error instanceof Error ? error.message : "Passkey registration failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function mark() {
    if (!id) return;
    setBusy(true);
    setPasskeyMessage("");
    try {
      const options = await getPasskeyAttendanceOptions(id);
      const assertion = await startAuthentication({
        optionsJSON: options.data,
      });
      await verifyPasskeyAttendance(id, assertion);
      setMessage("Attendance marked successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not mark attendance.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!authReady) return null;

  return (
    <RoleWorkspaceShell role="student" eyebrow="Attendance" title="Attendance">
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Mark online attendance</CardTitle>
            <CardDescription>Secure attendance check-in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
              <p className="text-xl font-semibold text-slate-950">
                {session?.unitName ?? "Loading…"}
              </p>
              <p className="mt-1 text-sm font-medium tracking-wide text-slate-600">
                {session?.unitCode ?? ""}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">{message}</p>
            {session && (
              <>
                <Button
                  onClick={registerPasskey}
                  disabled={busy}
                  variant="outline"
                  className="w-full"
                >
                  {busy ? "Working…" : "Set up this device passkey"}
                </Button>
                <Button
                  onClick={mark}
                  disabled={busy || session.status !== "active"}
                  className="w-full"
                >
                  {busy ? "Verifying…" : "Verify and mark attendance"}
                </Button>
              </>
            )}
            {passkeyMessage && (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {passkeyMessage}
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </RoleWorkspaceShell>
  );
}
