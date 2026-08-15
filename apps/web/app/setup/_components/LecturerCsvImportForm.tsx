"use client";

import { useState, useRef } from "react";
import type { Lecturer } from "../types/lecturer";
import { parseLecturerCsv } from "../lib/lecturerCsvParser";

interface CsvImportFormProps {
  onDataImported: (data: Lecturer[]) => void;
}

const expectedColumns = ["name", "staffNumber"];

export function LecturerCsvImportForm({ onDataImported }: CsvImportFormProps) {
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
      const result = parseLecturerCsv(csvText);
      const missingCols = expectedColumns.filter((col) => !result.headers.includes(col));
      if (missingCols.length > 0) {
        setError(
          `Missing required columns: ${missingCols.join(", ")}. Expected columns: ${expectedColumns.join(", ")}`
        );
        return;
      }

      setError(null);
      setSuccessMessage(`Successfully parsed ${result.lecturers.length} lecturers`);
      onDataImported(result.lecturers);
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
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Upload CSV File
        </label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileUpload}
          ref={fileInputRef}
          className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Or paste CSV data
        </label>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={`name,staffNumber&#10;Dr. Jane Smith,L789012`}
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
        />
      </div>

      {fileName && <p className="text-sm text-gray-600">Loaded: {fileName}</p>}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

      <button
        type="button"
        onClick={handlePaste}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition"
      >
        Parse and Import CSV
      </button>
    </div>
  );
}
