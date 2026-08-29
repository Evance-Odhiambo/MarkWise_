"use client";

import { useEffect, useState } from "react";
import { Share2, Users, Square } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createOnlineSession,
  endOnlineSession,
  getAttendees,
  getLecturerUnits,
  type OnlineSession,
  type TeachingUnit,
} from "@/lib/online-attendance";
import { RoleWorkspaceShell } from "@/components/workspace/RoleWorkspaceShell";

export default function LecturerOnlineAttendancePage() {
  const [unitCode, setUnitCode] = useState("");
  const [units, setUnits] = useState<TeachingUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [session, setSession] = useState<OnlineSession | null>(null);
  const [attendees, setAttendees] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getLecturerUnits()
      .then((result) =>
        setUnits(Array.isArray(result.units) ? result.units : []),
      )
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Could not load teaching units",
        ),
      )
      .finally(() => setLoadingUnits(false));
  }, []);

  useEffect(() => {
    if (!session || session.endedAt) return;
    const refresh = async () => {
      try {
        setAttendees((await getAttendees(session.id)).data.length);
      } catch {
        /* keep the last count during transient failures */
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [session]);

  async function start() {
    setBusy(true);
    setError("");
    try {
      setSession((await createOnlineSession(unitCode)).data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start session");
    } finally {
      setBusy(false);
    }
  }

  async function end() {
    if (!session) return;
    setBusy(true);
    try {
      await endOnlineSession(session.id);
      setSession({
        ...session,
        endedAt: new Date().toISOString(),
        status: "ended",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not end session");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!session) return;
    const link = `${window.location.origin}/attend?session=${session.id}`;
    await navigator.clipboard?.writeText(link);
    setError(`Link copied: ${link}`);
  }

  return (
    <RoleWorkspaceShell role="lecturer" eyebrow="Attendance" title="Attendance">
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Online attendance</CardTitle>
              <CardDescription>
                Create a secure, time-limited attendance link for one of your
                selected teaching units.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {!session ? (
                <>
                  <div className="space-y-2">
                    <label htmlFor="unit-code" className="text-sm font-medium">
                      Teaching unit
                    </label>
                    <select
                      id="unit-code"
                      value={unitCode}
                      onChange={(e) => setUnitCode(e.target.value)}
                      disabled={loadingUnits || units.length === 0}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">
                        {loadingUnits
                          ? "Loading teaching units…"
                            : units.length === 0
                            ? "No selected units found"
                            : "Select a teaching unit"}
                      </option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.code}>
                          {unit.code} - {unit.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {!loadingUnits && units.length === 0 && (
                    <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                      Configure your teaching units before creating an
                      attendance link.
                      <Link
                        href="/lecturer/units"
                        className="ml-1 font-semibold underline underline-offset-2"
                      >
                        Configure teaching units
                      </Link>
                    </div>
                  )}
                  <Button
                    onClick={start}
                    disabled={busy || !unitCode}
                    className="w-full"
                  >
                    {busy ? "Starting…" : "Start session"}
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-lg border bg-white p-4">
                    <div>
                      <p className="font-semibold">{session.unitCode}</p>
                      <p className="text-sm text-muted-foreground">
                        Closes{" "}
                        {new Date(session.expiresAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge variant={session.endedAt ? "secondary" : "default"}>
                      {session.endedAt ? "Ended" : "Active"}
                    </Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-white p-4">
                      <Users className="mb-2 h-5 w-5 text-emerald-600" />
                      <p className="text-2xl font-bold">{attendees}</p>
                      <p className="text-sm text-muted-foreground">
                        Students marked
                      </p>
                    </div>
                    <div className="rounded-lg border bg-white p-4">
                      <p className="mb-2 text-sm font-medium">Student link</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {window.location.origin}/attend?session={session.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button onClick={share} className="w-full sm:flex-1">
                      <Share2 /> Copy link
                    </Button>
                    <Button
                      onClick={end}
                      disabled={busy || !!session.endedAt}
                      variant="destructive"
                      className="w-full sm:w-auto"
                    >
                      <Square /> End
                    </Button>
                  </div>
                </>
              )}
              {error && (
                <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {error}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </RoleWorkspaceShell>
  );
}
