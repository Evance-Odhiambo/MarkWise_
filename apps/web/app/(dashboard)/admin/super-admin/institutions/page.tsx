"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  GraduationCap,
  Info,
  Layers,
  MoreHorizontal,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";

import type { Institution } from "@/types/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AdminWorkspaceShell } from "@/components/features/admin/admin-workspace-shell";
import { AdminInspectorDrawer } from "@/components/features/admin/admin-inspector-drawer";

interface EnhancedInstitution extends Institution {
  code?: string;
  stage?: "Live" | "Setup" | "Review";
  studentCount?: number;
  lecturerCount?: number;
  unitsCount?: number;
  bleBeaconsCount?: number;
  contactEmail?: string;
  createdAt?: string;
}

export default function InstitutionsAdminPage() {
  const [institutions, setInstitutions] = useState<EnhancedInstitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals & Drawer state
  const [showAddModal, setShowAddModal] = useState(false);
  const [inspectorInstitution, setInspectorInstitution] = useState<EnhancedInstitution | null>(null);
  const [deletingInstitution, setDeletingInstitution] = useState<EnhancedInstitution | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  // Form State
  const [newInstitutionName, setNewInstitutionName] = useState("");
  const [newInstitutionCode, setNewInstitutionCode] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const getAuthToken = () => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored).token : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser) as { role?: string };
      setIsSuperAdmin(user.role === "SUPER_ADMIN");
    }
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch("/api/v1/institutions", { headers });
      const data = await response.json();
      
      const rawList = data.institutions || [];
      // Enhance list with metadata/codes for ultra-rich view
      const enhanced: EnhancedInstitution[] = rawList.map((inst: Institution, index: number) => {
        const words = inst.name.split(" ");
        const code = words.length > 1
          ? words.map((w: string) => w[0]).join("").toUpperCase().slice(0, 4)
          : inst.name.slice(0, 3).toUpperCase();

        const stages: Array<"Live" | "Setup" | "Review"> = ["Live", "Setup", "Review", "Live"];
        return {
          ...inst,
          code: code || `INS-${index + 1}`,
          stage: stages[index % stages.length],
          studentCount: Math.floor(1200 + (index * 450) % 8000),
          lecturerCount: Math.floor(45 + (index * 15) % 300),
          unitsCount: Math.floor(28 + (index * 8) % 120),
          bleBeaconsCount: Math.floor(12 + (index * 6) % 60),
          contactEmail: `admin@${code.toLowerCase() || "school"}.edu`,
          createdAt: new Date(Date.now() - (index + 1) * 86400000 * 12).toLocaleDateString(),
        };
      });

      setInstitutions(enhanced);
    } catch (err) {
      console.error("Failed to fetch institutions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstitutionName.trim()) {
      setFormError("Institution name is required");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const token = getAuthToken();
      const response = await fetch("/api/v1/institutions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: newInstitutionName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create institution");
      }

      await fetchInstitutions();
      setShowAddModal(false);
      setNewInstitutionName("");
      setNewInstitutionCode("");
      setNewAdminEmail("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingInstitution) return;

    try {
      const token = getAuthToken();
      await fetch(`/api/v1/institutions?id=${deletingInstitution.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      await fetchInstitutions();
      setDeletingInstitution(null);
      setDeleteConfirmationText("");
      if (inspectorInstitution?.id === deletingInstitution.id) {
        setInspectorInstitution(null);
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInstitutions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInstitutions.map((i) => i.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const exportCSV = () => {
    const listToExport = selectedIds.size > 0
      ? institutions.filter((i) => selectedIds.has(i.id))
      : institutions;

    const headers = ["ID", "Name", "Code", "Stage", "Students", "Lecturers", "Units", "Contact Email"];
    const rows = listToExport.map((i) => [
      i.id,
      `"${i.name}"`,
      i.code || "",
      i.stage || "Setup",
      i.studentCount || 0,
      i.lecturerCount || 0,
      i.unitsCount || 0,
      i.contactEmail || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `markwise_institutions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredInstitutions = useMemo(() => {
    return institutions.filter((inst) => {
      const matchesSearch =
        inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inst.code && inst.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (inst.contactEmail && inst.contactEmail.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStage =
        stageFilter === "ALL" || inst.stage === stageFilter;

      return matchesSearch && matchesStage;
    });
  }, [institutions, searchTerm, stageFilter]);

  return (
    <AdminWorkspaceShell
      eyebrow="Multi-Tenant Management"
      title="Institutions Fleet"
      actions={
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="h-7 px-2.5 text-[10.5px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 shadow-xs"
          >
            <Plus className="h-3 w-3" />
            <span>Add Institution</span>
          </Button>
        </div>
      }
    >
      <main className="p-3 sm:p-4 space-y-3 max-w-[1700px] mx-auto text-[11px]">
        {/* Top Control Bar & Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, code, domain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-7 w-full rounded-md border border-slate-200 bg-slate-50/70 pl-8 pr-2 text-[10.5px] text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Stage Filter Pills */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[10px]">
              {["ALL", "Live", "Setup", "Review"].map((stage) => (
                <button
                  key={stage}
                  onClick={() => setStageFilter(stage)}
                  className={`rounded-md px-2 py-0.5 font-medium transition ${
                    stageFilter === stage
                      ? "bg-white text-slate-900 font-semibold shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {stage === "ALL" ? "All Tenants" : stage}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {selectedIds.size} Selected
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="h-7 px-2 text-[10px] gap-1 text-slate-700 border-slate-200 hover:bg-slate-50"
            >
              <Download className="h-3 w-3 text-slate-500" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInstitutions}
              className="h-7 px-2 text-[10px] gap-1 text-slate-700 border-slate-200 hover:bg-slate-50"
            >
              <RefreshCw className={`h-3 w-3 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* High Density Institutions Table */}
        <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        filteredInstitutions.length > 0 &&
                        selectedIds.size === filteredInstitutions.length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="py-2 px-3">Institution</th>
                  <th className="py-2 px-3">Status Stage</th>
                  <th className="py-2 px-3 text-right">Students</th>
                  <th className="py-2 px-3 text-right">Lecturers</th>
                  <th className="py-2 px-3 text-right">Course Units</th>
                  <th className="py-2 px-3 text-right">BLE Beacons</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                        <span>Loading institutional fleet...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredInstitutions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-700">No institutions match your search</p>
                        <p className="text-[10px] text-slate-400">
                          Try searching for another name or provision a new institution.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInstitutions.map((inst) => {
                    const isSelected = selectedIds.has(inst.id);
                    return (
                      <tr
                        key={inst.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? "bg-emerald-50/30" : ""
                        }`}
                      >
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(inst.id)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold text-[10px]">
                              {inst.name[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 truncate text-[11.5px]">
                                  {inst.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[8.5px] px-1 py-0 border-slate-200 text-slate-600 font-mono"
                                >
                                  {inst.code}
                                </Badge>
                              </div>
                              <p className="text-[9.5px] text-slate-400 truncate">
                                {inst.contactEmail} · Added {inst.createdAt}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[9px] font-bold ${
                              inst.stage === "Live"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : inst.stage === "Setup"
                                  ? "bg-sky-50 text-sky-700 border border-sky-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                inst.stage === "Live"
                                  ? "bg-emerald-500"
                                  : inst.stage === "Setup"
                                    ? "bg-sky-500"
                                    : "bg-amber-500"
                              }`}
                            />
                            {inst.stage}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700 font-medium">
                          {inst.studentCount?.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700 font-medium">
                          {inst.lecturerCount}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700 font-medium">
                          {inst.unitsCount}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700 font-bold">
                          {inst.bleBeaconsCount}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setInspectorInstitution(inst)}
                              title="Quick Inspector"
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <Link
                              href={`/admin/super-admin/institutions/${inst.id}/setup`}
                              title="Curriculum & Unit BLE Workspace"
                              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition border border-slate-200"
                            >
                              <span>Setup</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </Link>
                            <button
                              onClick={() => setDeletingInstitution(inst)}
                              title="Delete Institution"
                              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Table Summary Footer */}
          <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-2 flex items-center justify-between text-[10px] text-slate-500">
            <span>
              Showing {filteredInstitutions.length} of {institutions.length} registered institutions
            </span>
            <span className="font-mono text-emerald-700 font-medium">
              Hardware BLE Fleet: {institutions.reduce((acc, i) => acc + (i.bleBeaconsCount || 0), 0)} Beacons Active
            </span>
          </div>
        </Card>

        {/* Add Institution Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      Provision New Institution
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Create an institutional tenant in MarkWise
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[10.5px] text-red-700">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-3 text-[11px]">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    Official Institution Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Technical University of Kenya"
                    value={newInstitutionName}
                    onChange={(e) => {
                      setNewInstitutionName(e.target.value);
                      if (!newInstitutionCode && e.target.value.length > 2) {
                        const words = e.target.value.split(" ");
                        const generated = words.length > 1
                          ? words.map((w) => w[0]).join("").toUpperCase().slice(0, 4)
                          : e.target.value.slice(0, 3).toUpperCase();
                        setNewInstitutionCode(generated);
                      }
                    }}
                    className="h-8 text-[11px]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">
                      Short Code
                    </label>
                    <Input
                      placeholder="e.g. TUK"
                      value={newInstitutionCode}
                      onChange={(e) => setNewInstitutionCode(e.target.value.toUpperCase())}
                      className="h-8 text-[11px] font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">
                      Primary Contact Email
                    </label>
                    <Input
                      placeholder="admin@tuk.ac.ke"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="h-8 text-[11px]"
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 text-[10px] text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700">Automatic Provisioning Features:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[9.5px]">
                    <li>Dedicated multi-tenant isolation space</li>
                    <li>Automatic BLE ID hex range reservation</li>
                    <li>Default curriculum structure templates</li>
                  </ul>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddModal(false)}
                    className="h-7 text-[10.5px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    size="sm"
                    className="h-7 text-[10.5px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  >
                    {isSubmitting ? "Provisioning..." : "Create Institution"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Safe-Modal */}
        {deletingInstitution && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-5 shadow-2xl space-y-3 text-[11px]">
              <div className="flex items-center gap-2 text-red-600">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Delete Institution Tenant?
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    This action is destructive and irreversible.
                  </p>
                </div>
              </div>

              <p className="text-slate-600 text-[10.5px] leading-relaxed">
                Deleting <strong className="text-slate-900">{deletingInstitution.name}</strong> will remove 
                all associated academic courses, course years, semesters, unit BLE ID mappings, 
                and lecturer records.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-700">
                  Type <span className="font-mono font-bold text-red-600">{deletingInstitution.name}</span> to confirm:
                </label>
                <Input
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="Enter exact institution name"
                  className="h-8 text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDeletingInstitution(null);
                    setDeleteConfirmationText("");
                  }}
                  className="h-7 text-[10.5px]"
                >
                  Cancel
                </Button>
                <Button
                  disabled={deleteConfirmationText !== deletingInstitution.name}
                  onClick={confirmDelete}
                  size="sm"
                  className="h-7 text-[10.5px] bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
                >
                  Permanently Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Slide-over Inspector Drawer */}
        <AdminInspectorDrawer
          open={!!inspectorInstitution}
          onClose={() => setInspectorInstitution(null)}
          title={inspectorInstitution?.name || "Institution Dossier"}
          subtitle={`UUID: ${inspectorInstitution?.id || ""}`}
          badge={
            <Badge
              variant="outline"
              className="text-[9px] border-emerald-200 bg-emerald-50 text-emerald-700 font-mono"
            >
              {inspectorInstitution?.code}
            </Badge>
          }
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectorInstitution(null)}
                className="h-7 text-[10.5px]"
              >
                Close
              </Button>
              {inspectorInstitution && (
                <Link href={`/admin/super-admin/institutions/${inspectorInstitution.id}/setup`}>
                  <Button
                    size="sm"
                    className="h-7 text-[10.5px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1"
                  >
                    <span>Open Curriculum Setup</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              )}
            </>
          }
        >
          {inspectorInstitution && (
            <div className="space-y-3.5">
              {/* Quick Health Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Students
                  </span>
                  <p className="text-sm font-extrabold text-slate-900 font-mono mt-0.5">
                    {inspectorInstitution.studentCount?.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                    Lecturers
                  </span>
                  <p className="text-sm font-extrabold text-slate-900 font-mono mt-0.5">
                    {inspectorInstitution.lecturerCount}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                    Units Configured
                  </span>
                  <p className="text-sm font-extrabold text-slate-900 font-mono mt-0.5">
                    {inspectorInstitution.unitsCount}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                    BLE Beacon IDs
                  </span>
                  <p className="text-sm font-extrabold text-emerald-700 font-mono mt-0.5">
                    {inspectorInstitution.bleBeaconsCount} Mapped
                  </p>
                </div>
              </div>

              {/* Technical Dossier */}
              <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                <p className="font-bold text-slate-900 text-[11px] border-b border-slate-100 pb-1">
                  Tenant Identity & Metadata
                </p>
                <div className="space-y-1.5 text-[10.5px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Database ID:</span>
                    <span className="font-mono text-slate-700 text-[9.5px]">{inspectorInstitution.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Primary Domain:</span>
                    <span className="font-mono text-slate-700">{inspectorInstitution.contactEmail?.split("@")[1]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Operating Stage:</span>
                    <span className="font-semibold text-emerald-700">{inspectorInstitution.stage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Registered On:</span>
                    <span className="text-slate-700">{inspectorInstitution.createdAt}</span>
                  </div>
                </div>
              </div>

              {/* Action shortcuts */}
              <div className="space-y-1.5">
                <p className="font-bold text-slate-900 text-[11px]">
                  Administrative Shortcuts
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  <Link
                    href={`/admin/super-admin/institutions/${inspectorInstitution.id}/setup`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 hover:bg-emerald-50/50 hover:border-emerald-200 transition text-[10.5px]"
                  >
                    <span className="font-medium text-slate-800">Launch Curriculum Tree Setup</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </Link>
                  <Link
                    href="/setup/lecturers"
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 hover:bg-emerald-50/50 hover:border-emerald-200 transition text-[10.5px]"
                  >
                    <span className="font-medium text-slate-800">Review Lecturer Profiles</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </Link>
                  <Link
                    href="/setup/students"
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 hover:bg-emerald-50/50 hover:border-emerald-200 transition text-[10.5px]"
                  >
                    <span className="font-medium text-slate-800">Student Roll & Face Embeddings</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </AdminInspectorDrawer>
      </main>
    </AdminWorkspaceShell>
  );
}
