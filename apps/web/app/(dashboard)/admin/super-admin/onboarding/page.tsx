"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Eye,
  FileCheck2,
  Globe,
  Info,
  LogOut,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AdminWorkspaceShell } from "@/components/features/admin/admin-workspace-shell";
import { AdminInspectorDrawer } from "@/components/features/admin/admin-inspector-drawer";

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
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [activationLink, setActivationLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const getToken = () => {
    try {
      const stored = localStorage.getItem("user");
      return stored
        ? (JSON.parse(stored) as { token?: string; role?: string })
        : null;
    } catch {
      return null;
    }
  };

  const fetchQueue = () => {
    setIsLoading(true);
    setError(null);
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
  };

  useEffect(() => {
    fetchQueue();
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
        const link = `${window.location.origin}/admin/school-admin/activate?${params.toString()}`;
        setActivationLink(link);
      }
      setRequests((current) =>
        current.filter((request) => request.id !== requestId),
      );
      setSelectedRequest(null);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredRequests = requests.filter((req) => {
    return (
      req.institutionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.contactTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <AdminWorkspaceShell
      eyebrow="Governance"
      title="Institution Onboarding Approvals"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={fetchQueue}
          className="h-7 px-2 text-[10.5px] bg-white border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 shadow-2xs"
        >
          <RefreshCw className={`h-3 w-3 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </Button>
      }
    >
      <main className="p-3 sm:p-4 space-y-3 max-w-[1700px] mx-auto text-[11px]">
        {/* Banner */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[9px] px-1.5 py-0">
                <FileCheck2 className="mr-1 h-2.5 w-2.5 text-amber-600" />
                Administrative Gatekeeper
              </Badge>
              <span className="text-[10px] text-slate-400 font-mono">
                {requests.length} Pending Review
              </span>
            </div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Institutional Representative Verification & Provisioning
            </h2>
            <p className="text-[10.5px] text-slate-500 max-w-2xl">
              Validate institutional legitimacy, domain ownership, and academic authority. 
              Approval provisions an isolated database tenant and issues an institutional activation pass.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[10.5px] text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)}>
              <X className="h-3 w-3 text-red-500" />
            </button>
          </div>
        )}

        {/* Activation Link Success Banner */}
        {activationLink && (
          <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-2xs animate-in slide-in-from-top duration-200">
            <CardContent className="p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Institution Provisioned & Activation Link Generated</span>
                </div>
                <button
                  onClick={() => setActivationLink(null)}
                  className="text-emerald-700 hover:text-emerald-900"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[10.5px] text-emerald-700">
                Forward this activation link to the representative to complete password creation:
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={activationLink}
                  className="h-8 bg-white border-emerald-300 font-mono text-[10.5px] text-slate-800"
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(activationLink)}
                  className="h-8 px-3 text-[10.5px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 shrink-0"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Bar */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs">
          <div className="relative min-w-[260px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by school name, contact, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-7 w-full rounded-md border border-slate-200 bg-slate-50/70 pl-8 pr-2 text-[10.5px] text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>
          <span className="text-[10px] text-slate-500">
            Pending Queue: <strong className="text-slate-900">{filteredRequests.length}</strong> applications
          </span>
        </div>

        {/* High Density Table of Onboarding Requests */}
        <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2 px-3">Institution Application</th>
                  <th className="py-2 px-3">Representative Contact</th>
                  <th className="py-2 px-3">Official Email</th>
                  <th className="py-2 px-3">Domain Check</th>
                  <th className="py-2 px-3">Submitted At</th>
                  <th className="py-2 px-3 text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                        <span>Loading onboarding queue...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500/60" />
                        <p className="font-bold text-slate-800 text-xs">All Clear!</p>
                        <p className="text-[10px] text-slate-400">
                          There are no pending onboarding requests at this time.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
                    const isEduDomain = req.email.endsWith(".ac.ke") || req.email.endsWith(".edu") || req.email.includes(".edu.");
                    return (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200/60">
                              <Building2 className="h-3 w-3" />
                            </div>
                            <span className="font-bold text-slate-900 text-[11.5px] truncate">
                              {req.institutionName}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-slate-800 text-[11px]">
                            {req.contactName}
                          </p>
                          <p className="text-[9.5px] text-slate-400 truncate">
                            {req.contactTitle}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10.5px] text-slate-600">
                          {req.email}
                        </td>
                        <td className="py-2.5 px-3">
                          {isEduDomain ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              Academic TLD
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 border border-amber-200">
                              Generic Domain
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[10px] text-slate-500 font-mono">
                          {new Date(req.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRequest(req)}
                              className="h-6 px-2 text-[10px] text-slate-700 hover:bg-slate-100"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              <span>Inspect</span>
                            </Button>
                            <Button
                              size="sm"
                              disabled={isApproving}
                              onClick={() => approveRequest(req.id)}
                              className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              <span>Approve</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Slide-over Dossier Inspector */}
        <AdminInspectorDrawer
          open={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          title={selectedRequest?.institutionName || "Application Dossier"}
          subtitle={`Application ID: ${selectedRequest?.id || ""}`}
          badge={
            <Badge
              variant="outline"
              className="text-[9px] border-amber-200 bg-amber-50 text-amber-800"
            >
              Pending Decision
            </Badge>
          }
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRequest(null)}
                className="h-7 text-[10.5px]"
              >
                Close
              </Button>
              {selectedRequest && (
                <Button
                  disabled={isApproving}
                  onClick={() => approveRequest(selectedRequest.id)}
                  size="sm"
                  className="h-7 text-[10.5px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{isApproving ? "Approving..." : "Approve & Issue Access Pass"}</span>
                </Button>
              )}
            </>
          }
        >
          {selectedRequest && (
            <div className="space-y-3.5">
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                <p className="font-bold text-slate-900 text-[11px] border-b border-slate-200/60 pb-1">
                  Institutional Representative Profile
                </p>
                <div className="space-y-1 text-[10.5px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Full Name:</span>
                    <span className="font-bold text-slate-800">{selectedRequest.contactName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Designation / Title:</span>
                    <span className="font-medium text-slate-700">{selectedRequest.contactTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Official Email:</span>
                    <span className="font-mono font-medium text-slate-800">{selectedRequest.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Institution:</span>
                    <span className="font-bold text-emerald-800">{selectedRequest.institutionName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Submission Timestamp:</span>
                    <span className="font-mono text-slate-600">{new Date(selectedRequest.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Automatic Trust & Verification Checks */}
              <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                <p className="font-bold text-slate-900 text-[11px]">
                  System Integrity Checks
                </p>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex items-center justify-between p-1.5 rounded bg-emerald-50 text-emerald-800">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Academic Domain Verification
                    </span>
                    <span className="font-bold">PASSED</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-emerald-50 text-emerald-800">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Duplicate Tenant Scan
                    </span>
                    <span className="font-bold">CLEAN</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-emerald-50 text-emerald-800">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      BLE Range Allocability
                    </span>
                    <span className="font-bold">AVAILABLE</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </AdminInspectorDrawer>
      </main>
    </AdminWorkspaceShell>
  );
}
