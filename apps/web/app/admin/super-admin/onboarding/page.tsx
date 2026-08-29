"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminWorkspaceShell } from "@/components/admin/AdminWorkspaceShell";

interface OnboardingRequest {
  id: string;
  contactName: string;
  contactTitle: string;
  email: string;
  institutionName: string;
  createdAt: string;
}

export default function OnboardingApprovalPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<OnboardingRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [activationLink, setActivationLink] = useState<string | null>(null);

  const getToken = () => {
    const stored = localStorage.getItem("user");
    return stored
      ? (JSON.parse(stored) as { token?: string; role?: string })
      : null;
  };

  useEffect(() => {
    const user = getToken();

    if (!user?.token || user.role !== "SUPER_ADMIN") {
      router.replace("/admin/super-admin/login");
      return;
    }

    fetch("/api/v1/admin/onboarding", {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load onboarding requests");
        const data = await response.json();
        setRequests(data.requests ?? []);
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setIsLoading(false));
  }, [router]);

  const approveRequest = async (requestId: string) => {
    const user = getToken();

    if (!user?.token) {
      setError("Authentication is required.");
      return;
    }

    setError(null);
    setIsApproving(true);

    try {
      const response = await fetch(
        `/api/v1/admin/onboarding/${requestId}/approve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Approval failed");

      if (data.requester) {
        const params = new URLSearchParams(data.requester);
        setActivationLink(
          `${window.location.origin}/admin/institution/activate?${params.toString()}`,
        );
      }
      setRequests((current) =>
        current.filter((request) => request.id !== requestId),
      );
      setSelectedId(null);
    } catch (approvalError) {
      setError(
        approvalError instanceof Error
          ? approvalError.message
          : "Approval failed",
      );
    } finally {
      setIsApproving(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem("user");
    router.replace("/admin/super-admin/login");
  };

  return (
    <AdminWorkspaceShell eyebrow="Governance" title="Institution approvals">
      <main className="min-h-dvh bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <header className="flex flex-col gap-4 border-b border-emerald-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                <ShieldCheck className="h-4 w-4" /> Super admin
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Institution approvals
              </h1>
              <p className="mt-2 text-slate-600">
                Review requests and create the first institutional
                representative account.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={signOut}
              className="w-full sm:w-auto"
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </header>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {activationLink && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="space-y-2 p-4">
                <p className="font-semibold text-emerald-900">
                  Activation link
                </p>
                <p className="text-sm text-emerald-800">
                  Share this link with the approved institutional
                  representative:
                </p>
                <Input
                  readOnly
                  value={activationLink}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                Loading requests...
              </CardContent>
            </Card>
          ) : requests.length === 0 ? (
            <Card className="border-emerald-100 bg-white/80">
              <CardContent className="py-12 text-center text-slate-500">
                No pending onboarding requests.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
              <section className="space-y-3">
                {requests.map((request) => (
                  <Card
                    key={request.id}
                    className={
                      selectedId === request.id
                        ? "border-emerald-400 bg-white"
                        : "border-white/80 bg-white/80"
                    }
                  >
                    <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="flex items-center gap-2 font-semibold text-slate-900">
                          <Building2 className="h-4 w-4 text-emerald-600" />
                          {request.institutionName}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {request.contactName} · {request.contactTitle} ·{" "}
                          {request.email}
                        </p>
                        <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                          <Clock3 className="h-3 w-3" />
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedId(request.id);
                          setError(null);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto"
                      >
                        Review
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </section>

              <Card className="h-fit border-emerald-100 bg-white/90">
                <CardHeader>
                  <CardTitle>Approve request</CardTitle>
                  <CardDescription>
                    Approval creates the institution and its institutional
                    representative account.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedId ? (
                    <div className="space-y-4">
                      <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                        Approve the institution. The requester will create their
                        password on the approved registration page.
                      </div>
                      <Button
                        disabled={isApproving}
                        onClick={() => approveRequest(selectedId)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {isApproving ? "Approving..." : "Approve institution"}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Select a request to review it.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </AdminWorkspaceShell>
  );
}
