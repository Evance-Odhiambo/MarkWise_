"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Trash2, Users } from "lucide-react";
import type { Lecturer } from "../../../types/setup-lecturer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ManualEntryFormProps {
  data: Lecturer[];
  onDataChange: (data: Lecturer[]) => void;
}

export function LecturerManualEntryForm({
  data,
  onDataChange,
}: ManualEntryFormProps) {
  const [name, setName] = useState("");
  const [staffNumber, setStaffNumber] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setStaffNumber("");
    setError(null);
  };

  const addLecturer = () => {
    if (!name.trim() || !staffNumber.trim()) return;

    const existing = data.find(
      (l) => l.staffNumber.trim().toLowerCase() === staffNumber.trim().toLowerCase(),
    );
    if (existing) {
      setError(`Staff number "${staffNumber}" is already assigned to ${existing.name}`);
      return;
    }

    const newLecturer: Lecturer = {
      id: `lecturer-${Date.now()}`,
      name: name.trim(),
      staffNumber: staffNumber.trim(),
    };
    onDataChange([...data, newLecturer]);
    resetForm();
  };

  const deleteLecturer = (id: string) => {
    onDataChange(data.filter((l) => l.id !== id));
  };

  const filteredData = useMemo(() => {
    return data.filter(
      (l) =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.staffNumber.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [data, searchTerm]);

  return (
    <div className="space-y-3 text-[11px]">
      {/* Inline Quick Add Form */}
      <div className="rounded-lg border border-slate-200/90 bg-slate-50/70 p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 text-[11px]">
            Add Faculty Member
          </span>
          {error && <span className="text-[10px] text-red-600 font-medium">{error}</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_auto] gap-2 items-end">
          <div className="space-y-0.5">
            <label className="text-[10px] font-semibold text-slate-600">
              Full Name <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Dr. Jane Wambui"
              className="h-7 text-[11px] bg-white"
            />
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] font-semibold text-slate-600">
              Staff / Payroll ID <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={staffNumber}
              onChange={(e) => {
                setStaffNumber(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="e.g. LEC-8901"
              className="h-7 text-[11px] font-mono bg-white"
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={addLecturer}
            disabled={!name.trim() || !staffNumber.trim()}
            className="h-7 px-3 text-[10.5px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1 shrink-0"
          >
            <Plus className="h-3 w-3" />
            <span>Add Lecturer</span>
          </Button>
        </div>
      </div>

      {/* Roster Controls & Search */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search faculty roster..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-6 w-full rounded-md border border-slate-200 bg-white pl-7 pr-2 text-[10px] text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 transition"
          />
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          Total Faculty: <strong className="text-slate-900">{data.length}</strong>
        </span>
      </div>

      {/* Compact Table */}
      {data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-slate-400 text-[10.5px]">
          No lecturers registered yet. Use the form above to add faculty members.
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[9.5px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-1.5 px-3">Faculty Name</th>
                <th className="py-1.5 px-3">Staff Number</th>
                <th className="py-1.5 px-3 text-right w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredData.map((lecturer) => (
                <tr key={lecturer.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-1.5 px-3 font-semibold text-slate-900 text-[11px]">
                    {lecturer.name}
                  </td>
                  <td className="py-1.5 px-3 font-mono text-[10.5px] text-slate-600">
                    {lecturer.staffNumber}
                  </td>
                  <td className="py-1.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => deleteLecturer(lecturer.id)}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                      title="Remove Lecturer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
