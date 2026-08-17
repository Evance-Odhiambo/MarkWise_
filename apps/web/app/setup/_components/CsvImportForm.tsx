"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { AcademicCourse } from "../types/academic";
import { parseCsv } from "../lib/csvParser";

interface CsvImportFormProps {
  onDataImported: (data: AcademicCourse[]) => void;
}

const expectedColumns = ["courseName", "duration"];

export function CsvImportForm({ onDataImported }: CsvImportFormProps) {
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
      const result = parseCsv(csvText);
      const missingCols = expectedColumns.filter((col) => !result.headers.includes(col));
      if (missingCols.length > 0) {
        setError(
          `Missing required columns: ${missingCols.join(", ")}. Expected columns: ${expectedColumns.join(", ")}. Optional columns: yearNumber, semesterName, semesterNumber, unitName, unitCode`
        );
        return;
      }

      setError(null);
      setSuccessMessage(`Successfully parsed ${result.courses.length} courses`);
      onDataImported(result.courses);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
    }
  };

  const handlePaste = () => {
    if (!csvText.trim()) {
      setError("Please paste CSV data");
      return;
    }
    handleImport();
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Upload CSV File</label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileUpload}
          ref={fileInputRef}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Or paste CSV data</label>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={
            `courseName,duration\n` +
            `Computer Science,4\n` +
            `Mathematics,3`
          }
          rows={8}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <p className="text-sm leading-6 text-slate-600">
        Required columns: <strong>courseName</strong>, <strong>duration</strong> (years)
        <br />
        Optional columns: <strong>yearNumber</strong>, <strong>semesterNumber</strong>, <strong>unitName</strong>, <strong>unitCode</strong>
      </p>

      {fileName && <p className="text-sm text-slate-600">Loaded: {fileName}</p>}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {successMessage && <p className="text-sm text-emerald-600">{successMessage}</p>}

      <Button type="button" onClick={handlePaste} className="w-full justify-center" size="lg">
        Parse and Import CSV
      </Button>
    </div>
  );
}
