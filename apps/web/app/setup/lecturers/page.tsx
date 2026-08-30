"use client";

import { useState, useEffect, useMemo } from "react";
import type { Lecturer, ImportMethod } from "@/types/setup-lecturer";
import type { Institution } from "@/types/auth";
import { LecturerMethodSelector } from "@/components/features/setup/lecturer-method-selector";
import { LecturerApiImportForm } from "@/components/features/setup/lecturer-api-import-form";
import { LecturerCsvImportForm } from "@/components/features/setup/lecturer-csv-import-form";
import { BulkSpreadsheetEntry } from "@/components/features/setup/bulk-spreadsheet-entry";
import { AdminWorkspaceShell } from "@/components/features/admin/admin-workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Check,
  CheckCircle2,
  Download,
  Edit2,
  Plus,
  RefreshCw,
  School,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LecturersPage() {
  const [method, setMethod] = useState<ImportMethod>("manual");
  const [data, setData] = useState<Lecturer[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [institutionId, setInstitutionId] = useState<string>("");
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [institutionFetchError, setInstitutionFetchError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Roster search and batch selection state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingStaffNumber, setEditingStaffNumber] = useState("");

  const authHeaders = (): Record<string, string> => {
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "{}") as {
        token?: string;
      };
      return user.token ? { Authorization: `Bearer ${user.token}` } : {};
    } catch {
      return {};
    }
  };

  const fetchInstitutions = async () => {
    setInstitutionFetchError(null);
    try {
      const endpoints = [
        "/api/v1/institutions",
        "/api/v1/institutions/institutions",
      ];
      let lastStatus = 0;
      for (const endpoint of endpoints) {
        const response = await fetch(endpoint, { headers: authHeaders() });
        lastStatus = response.status;
        if (!response.ok) continue;
        const result = await response.json();
        setInstitutions(Array.isArray(result.institutions) ? result.institutions : []);
        return;
      }
      throw new Error(`Institution service returned HTTP ${lastStatus}`);
    } catch (err) {
      console.error("Failed to fetch institutions:", err);
      setInstitutionFetchError(
        "Unable to load registered institutions. Check that the backend is running and try again.",
      );
      setInstitutions([]);
    } finally {
      setLoadingInstitutions(false);
    }
  };

  useEffect(() => {
    // Seed institutionId from the logged-in user's token first, then fall
    // back to the previously-selected value stored under its own key.
    const storedUser = localStorage.getItem("user");
    let seedId = localStorage.getItem("institutionId") ?? "";
    try {
      const parsed = storedUser
        ? (JSON.parse(storedUser) as { institutionId?: string })
        : null;
      if (parsed?.institutionId) seedId = parsed.institutionId;
    } catch { /* ignore */ }
    if (seedId) setInstitutionId(seedId);

    fetchInstitutions();
  }, []);

  useEffect(() => {
    if (institutionId) {
      localStorage.setItem("institutionId", institutionId);
    }
  }, [institutionId]);

  const fetchLecturers = async () => {
    if (!institutionId) {
      setData([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/v1/lecturers?institutionId=${encodeURIComponent(institutionId)}`,
        { headers: authHeaders() },
      );
      if (!response.ok)
        throw new Error(`Lecturer service returned HTTP ${response.status}`);
      const result = await response.json();
      setData(Array.isArray(result.lecturers) ? result.lecturers : []);
    } catch (err) {
      console.error("Failed to fetch lecturers:", err);
      setData([]);
    }
  };

  useEffect(() => {
    fetchLecturers();
  }, [institutionId]);

  const handleBulkCommit = async (
    newRows: Array<{ name: string; identifier: string }>,
  ) => {
    if (!institutionId || newRows.length === 0) return;

    setIsSaving(true);
    setSaveMessage(null);

    const merged = [
      ...data,
      ...newRows.map((r) => ({
        id: `lecturer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: r.name,
        staffNumber: r.identifier,
      })),
    ];

    try {
      const response = await fetch("/api/v1/lecturers", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          institutionId,
          lecturers: merged.map((l) => ({
            name: l.name,
            staffNumber: l.staffNumber,
          })),
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to save lecturers");
      }

      await fetchLecturers();
      setSaveMessage(`Successfully added ${newRows.length} faculty members.`);
      setTimeout(() => setSaveMessage(null), 3500);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to save faculty roster");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDataImported = async (importedData: Lecturer[]) => {
    setData(importedData);
    if (!institutionId) return;

    setIsSaving(true);
    setSaveMessage(null);
    try {
      const response = await fetch("/api/v1/lecturers", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          institutionId,
          lecturers: importedData.map((l) => ({
            name: l.name,
            staffNumber: l.staffNumber,
          })),
        }),
      });
      if (!response.ok)
        throw new Error(
          (await response.json().catch(() => ({}))).error ||
            "Failed to save lecturers",
        );
      setSaveMessage("Faculty roster synced successfully.");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to save faculty roster");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    const updated = data.filter((l) => l.id !== id);
    setData(updated);
    if (!institutionId) return;

    try {
      await fetch("/api/v1/lecturers", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          institutionId,
          lecturers: updated.map((l) => ({
            name: l.name,
            staffNumber: l.staffNumber,
          })),
        }),
      });
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleDeleteBatch = async () => {
    if (selectedIds.size === 0) return;
    const updated = data.filter((l) => !selectedIds.has(l.id));
    setData(updated);
    setSelectedIds(new Set());

    if (!institutionId) return;

    try {
      await fetch("/api/v1/lecturers", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          institutionId,
          lecturers: updated.map((l) => ({
            name: l.name,
            staffNumber: l.staffNumber,
          })),
        }),
      });
    } catch (err) {
      console.error("Batch delete failed:", err);
    }
  };

  const handleStartEdit = (lecturer: Lecturer) => {
    setEditingId(lecturer.id);
    setEditingName(lecturer.name);
    setEditingStaffNumber(lecturer.staffNumber);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim() || !editingStaffNumber.trim()) return;

    const updated = data.map((l) =>
      l.id === editingId
        ? { ...l, name: editingName.trim(), staffNumber: editingStaffNumber.trim().toUpperCase() }
        : l,
    );

    setData(updated);
    setEditingId(null);

    if (!institutionId) return;

    try {
      await fetch("/api/v1/lecturers", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          institutionId,
          lecturers: updated.map((l) => ({
            name: l.name,
            staffNumber: l.staffNumber,
          })),
        }),
      });
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map((l) => l.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const exportFacultyCSV = () => {
    const listToExport = selectedIds.size > 0
      ? data.filter((l) => selectedIds.has(l.id))
      : data;

    if (listToExport.length === 0) return;
    const headers = ["Name", "Staff Number"];
    const rows = listToExport.map((l) => [`"${l.name}"`, l.staffNumber]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lecturers_roster_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const existingStaffNumbers = useMemo(() => {
    return new Set(data.map((l) => l.staffNumber.trim().toLowerCase()));
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(
      (l) =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.staffNumber.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [data, searchTerm]);

  const selectedInstitution = institutions.find((i) => i.id === institutionId);

  return (
    <AdminWorkspaceShell eyebrow="Academic Management" title="Lecturers Directory">
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.05),transparent_35%),linear-gradient(to_bottom,#f8fafc,#f1f5f9)] py-2 px-2 sm:px-3 text-slate-900 text-[11px]">
        <div className="mx-auto max-w-[1800px] space-y-2">
          {/* Header Banner & Institution Picker */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 shadow-2xs backdrop-blur-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-slate-900">
                Faculty & Lecturer Setup
              </span>
              {selectedInstitution && (
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] py-0 px-1.5 font-semibold"
                >
                  <Building2 className="mr-1 h-2.5 w-2.5 text-emerald-600" />
                  {selectedInstitution.name}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {data.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportFacultyCSV}
                  className="h-6 px-2 text-[10px] text-slate-700 bg-white border-slate-200 hover:bg-slate-50 gap-1 shadow-2xs"
                >
                  <Download className="h-3 w-3 text-slate-500" />
                  <span>Export CSV</span>
                </Button>
              )}

              {loadingInstitutions ? (
                <span className="text-[10.5px] text-slate-500">Loading...</span>
              ) : institutions.length > 0 ? (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-medium text-slate-500">
                    Institution:
                  </span>
                  <select
                    value={institutionId}
                    onChange={(e) => setInstitutionId(e.target.value)}
                    className="h-6 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-[10.5px] font-medium text-slate-800 shadow-inner outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-200 min-w-[160px]"
                  >
                    <option value="">Select institution...</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-[10.5px] text-amber-700">
                  {institutionFetchError ?? "No institutions found."}
                </span>
              )}
            </div>
          </div>

          {saveMessage && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[10.5px] text-emerald-800 flex items-center justify-between animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>{saveMessage}</span>
              </div>
              <button onClick={() => setSaveMessage(null)}>
                <X className="h-3 w-3 text-emerald-600" />
              </button>
            </div>
          )}

          {!institutionId ? (
            <Card className="border-dashed border-slate-300 bg-white/70">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <School className="h-6 w-6 text-slate-400 mb-1" />
                <h3 className="text-xs font-bold text-slate-800">
                  Select an Institution to Manage Faculty
                </h3>
                <p className="mt-0.5 max-w-sm text-[10px] text-slate-500">
                  Choose a registered institution from the dropdown above to load and configure its lecturer roster.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {/* Method Selector Tabs */}
              <LecturerMethodSelector method={method} onChange={setMethod} />

              {/* Data Ingestion Workspace */}
              <Card className="border-slate-200/90 bg-white shadow-2xs">
                <CardContent className="p-3">
                  {method === "manual" && (
                    <BulkSpreadsheetEntry
                      mode="lecturer"
                      entityName="Lecturer"
                      identifierLabel="Staff / Payroll ID"
                      identifierPlaceholder="e.g. LEC-104"
                      existingIdentifiers={existingStaffNumbers}
                      onCommit={handleBulkCommit}
                      isSaving={isSaving}
                    />
                  )}
                  {method === "csv" && (
                    <LecturerCsvImportForm onDataImported={handleDataImported} />
                  )}
                  {method === "api" && (
                    <LecturerApiImportForm
                      institutionId={institutionId}
                      onDataImported={handleDataImported}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Current Active Roster Table */}
              <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
                <CardHeader className="border-b border-slate-100 px-3 py-2 bg-slate-50/60 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-slate-700" />
                    <CardTitle className="text-xs font-bold text-slate-900">
                      Active Faculty Roster
                    </CardTitle>
                    <Badge variant="outline" className="text-[9px] font-mono border-slate-200">
                      {data.length} Registered
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedIds.size > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500">
                          {selectedIds.size} selected
                        </span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleDeleteBatch}
                          className="h-6 px-2 text-[10px] font-medium"
                        >
                          <Trash2 className="h-2.5 w-2.5 mr-1" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    )}

                    <div className="relative min-w-[180px]">
                      <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search faculty..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-6 w-full rounded-md border border-slate-200 bg-white pl-6 pr-2 text-[10px] text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {data.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-[10.5px]">
                      No faculty members saved for this institution yet. Use the entry forms above to add lecturers.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/80 text-[9.5px] font-bold uppercase tracking-wider text-slate-500 sticky top-0 z-10">
                            <th className="py-1.5 px-2.5 w-8">
                              <input
                                type="checkbox"
                                checked={
                                  filteredData.length > 0 &&
                                  selectedIds.size === filteredData.length
                                }
                                onChange={toggleSelectAll}
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              />
                            </th>
                            <th className="py-1.5 px-3">Faculty Name</th>
                            <th className="py-1.5 px-3">Staff / Payroll ID</th>
                            <th className="py-1.5 px-3 text-right w-20">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {filteredData.map((lecturer) => {
                            const isSelected = selectedIds.has(lecturer.id);
                            const isEditing = editingId === lecturer.id;

                            return (
                              <tr
                                key={lecturer.id}
                                className={`transition-colors ${
                                  isSelected ? "bg-emerald-50/40" : "hover:bg-slate-50/60"
                                }`}
                              >
                                <td className="py-1.5 px-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectRow(lecturer.id)}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                  />
                                </td>
                                <td className="py-1.5 px-3">
                                  {isEditing ? (
                                    <Input
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      className="h-6 text-[10.5px]"
                                      autoFocus
                                    />
                                  ) : (
                                    <span className="font-semibold text-slate-900 text-[11px]">
                                      {lecturer.name}
                                    </span>
                                  )}
                                </td>
                                <td className="py-1.5 px-3">
                                  {isEditing ? (
                                    <Input
                                      value={editingStaffNumber}
                                      onChange={(e) => setEditingStaffNumber(e.target.value)}
                                      className="h-6 text-[10.5px] font-mono"
                                    />
                                  ) : (
                                    <span className="font-mono text-[10.5px] text-slate-600">
                                      {lecturer.staffNumber}
                                    </span>
                                  )}
                                </td>
                                <td className="py-1.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {isEditing ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={handleSaveEdit}
                                          className="rounded p-1 text-emerald-600 hover:bg-emerald-50 transition"
                                          title="Save changes"
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingId(null)}
                                          className="rounded p-1 text-slate-400 hover:bg-slate-100 transition"
                                          title="Cancel"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleStartEdit(lecturer)}
                                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                                          title="Edit"
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteSingle(lecturer.id)}
                                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                                          title="Delete"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
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
