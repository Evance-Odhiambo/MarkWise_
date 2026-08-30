"use client";

import { useState, useRef } from "react";
import { CheckCircle2, Upload } from "lucide-react";
import type { Student } from "../../../types/setup-student";
import { parseStudentCsv } from "../../../lib/setup/student-csv-parser";
import { Button } from "@/components/ui/button";

interface CsvImportFormProps {
  selectedCourse: string;
  onDataImported: (data: Student[]) => void;
}

const expectedColumns = ["name", "admissionNumber"];

export function StudentCsvImportForm({
  selectedCourse,
  onDataImported,
}: CsvImportFormProps) {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!csvText.trim()) {
      setError("Please upload a CSV file or paste CSV data");
      return;
    }

    try {
      const result = parseStudentCsv(csvText);
      const missingCols = expectedColumns.filter(
        (col) => !result.headers.includes(col),
      );
      if (missingCols.length > 0) {
        setError(
          `Missing columns: ${missingCols.join(", ")}. Expected: ${expectedColumns.join(", ")}`,
        );
        return;
      }

      const studentsWithCourse = result.students.map((student) => ({
        ...student,
        course: selectedCourse,
      }));

      setError(null);
      setSuccessMessage(
        `Successfully parsed and enrolled ${studentsWithCourse.length} students into "${selectedCourse}"`,
      );
      onDataImported(studentsWithCourse);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
    }
  };

  return (
    <div className="space-y-3 text-[11px]">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-[10.5px] text-red-700">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-[10.5px] text-emerald-800 flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
          <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
            Upload CSV File (.csv)
          </label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="w-full text-[10.5px] text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
          />
          {fileName && (
            <p className="text-[10px] text-emerald-700 font-mono">
              Loaded: {fileName}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
            Or Paste Raw CSV Data
          </label>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={"name,admissionNumber\nKelvin Otieno,SC211/0458/2023\nMary Muthoni,SC211/0459/2023"}
            rows={4}
            className="w-full rounded-md border border-slate-200 bg-white p-2 text-[10px] font-mono text-slate-800 outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
        <Button
          type="button"
          size="sm"
          onClick={handleImport}
          className="h-7 px-3 text-[10.5px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
        >
          <Upload className="h-3 w-3" />
          <span>Parse & Enroll Cohort</span>
        </Button>
      </div>
    </div>
  );
}
