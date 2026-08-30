"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Trash2, Users } from "lucide-react";
import type { Student } from "../../../types/setup-student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ManualEntryFormProps {
  data: Student[];
  onDataChange: (data: Student[]) => void;
  selectedCourse: string;
}

export function StudentManualEntryForm({
  data,
  onDataChange,
  selectedCourse,
}: ManualEntryFormProps) {
  const [name, setName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setAdmissionNumber("");
    setError(null);
  };

  const addStudent = () => {
    if (!name.trim() || !admissionNumber.trim()) return;

    const existing = data.find(
      (s) => s.admissionNumber.trim().toLowerCase() === admissionNumber.trim().toLowerCase(),
    );
    if (existing) {
      setError(`Admission number "${admissionNumber}" is already registered to ${existing.name}`);
      return;
    }

    const newStudent: Student = {
      id: `student-${Date.now()}`,
      name: name.trim(),
      admissionNumber: admissionNumber.trim(),
      course: selectedCourse,
    };
    onDataChange([...data, newStudent]);
    resetForm();
  };

  const deleteStudent = (id: string) => {
    onDataChange(data.filter((s) => s.id !== id));
  };

  const filteredData = useMemo(() => {
    return data.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [data, searchTerm]);

  return (
    <div className="space-y-3 text-[11px]">
      {/* Inline Quick Add Form */}
      <div className="rounded-lg border border-slate-200/90 bg-slate-50/70 p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 text-[11px]">
            Enroll Student in {selectedCourse}
          </span>
          {error && <span className="text-[10px] text-red-600 font-medium">{error}</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_auto] gap-2 items-end">
          <div className="space-y-0.5">
            <label className="text-[10px] font-semibold text-slate-600">
              Student Full Name <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Kelvin Otieno"
              className="h-7 text-[11px] bg-white"
            />
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] font-semibold text-slate-600">
              Admission / Student ID <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={admissionNumber}
              onChange={(e) => {
                setAdmissionNumber(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="e.g. SC211/0458/2023"
              className="h-7 text-[11px] font-mono bg-white"
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={addStudent}
            disabled={!name.trim() || !admissionNumber.trim()}
            className="h-7 px-3 text-[10.5px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1 shrink-0"
          >
            <Plus className="h-3 w-3" />
            <span>Enroll Student</span>
          </Button>
        </div>
      </div>

      {/* Roster Controls & Search */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student roll..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-6 w-full rounded-md border border-slate-200 bg-white pl-7 pr-2 text-[10px] text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 transition"
          />
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          Enrolled: <strong className="text-slate-900">{data.length}</strong> students
        </span>
      </div>

      {/* Compact Table */}
      {data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-slate-400 text-[10.5px]">
          No students enrolled in this program yet. Use the form above or CSV import to register students.
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[9.5px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-1.5 px-3">Student Name</th>
                <th className="py-1.5 px-3">Admission Number</th>
                <th className="py-1.5 px-3">Academic Program</th>
                <th className="py-1.5 px-3 text-right w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredData.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-1.5 px-3 font-semibold text-slate-900 text-[11px]">
                    {student.name}
                  </td>
                  <td className="py-1.5 px-3 font-mono text-[10.5px] text-slate-600">
                    {student.admissionNumber}
                  </td>
                  <td className="py-1.5 px-3 text-slate-500 text-[10px]">
                    {student.course}
                  </td>
                  <td className="py-1.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => deleteStudent(student.id)}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                      title="Remove Student"
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
