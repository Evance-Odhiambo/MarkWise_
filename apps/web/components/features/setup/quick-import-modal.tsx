"use client";

import React, { useState, useRef } from "react";
import {
  FileSpreadsheet,
  Globe,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AcademicCourse } from "../../../types/setup-academic";
import { parseCsv } from "../../../lib/setup/csv-parser";

interface QuickImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataImported: (courses: AcademicCourse[], mode: "merge" | "replace") => void;
}

export function QuickImportModal({
  open,
  onOpenChange,
  onDataImported,
}: QuickImportModalProps) {
  const [activeTab, setActiveTab] = useState<"csv" | "api">("csv");
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");

  // CSV Tab State
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API Tab State
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiFormat, setApiFormat] = useState("Custom");

  // Status & Preview
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<AcademicCourse[] | null>(null);

  const resetState = () => {
    setCsvText("");
    setFileName(null);
    setError(null);
    setParsedPreview(null);
    setIsLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      tryParseCsv(text);
    };
    reader.readAsText(file);
  };

  const tryParseCsv = (text: string) => {
    if (!text.trim()) {
      setParsedPreview(null);
      return;
    }
    try {
      const result = parseCsv(text);
      setParsedPreview(result.courses);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
      setParsedPreview(null);
    }
  };

  const handleApiFetch = async () => {
    if (!apiUrl.trim()) {
      setError("Please enter a valid API URL");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const storedUser = JSON.parse(localStorage.getItem("user") ?? "{}") as {
        token?: string;
      };

      const response = await fetch("/api/v1/academic/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(storedUser.token ? { Authorization: `Bearer ${storedUser.token}` } : {}),
        },
        body: JSON.stringify({
          apiUrl: apiUrl.trim(),
          apiFormat,
          apiKey: apiKey.trim() || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch from LMS API");
      }

      if (Array.isArray(result.data) && result.data.length > 0) {
        setParsedPreview(result.data);
      } else {
        throw new Error("No course data found at the provided endpoint");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "API Import error");
      setParsedPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedPreview || parsedPreview.length === 0) return;
    onDataImported(parsedPreview, importMode);
    resetState();
    onOpenChange(false);
  };

  const totalPreviewUnits = (parsedPreview || []).reduce(
    (sum, c) =>
      sum +
      (c.years || []).reduce(
        (ySum, y) =>
          ySum +
          (y.semesters || []).reduce(
            (sSum, s) => sSum + (s.units || []).length,
            0,
          ),
        0,
      ),
    0,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetState();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Import Academic Data
          </DialogTitle>
          <DialogDescription>
            Import courses, semesters, and units from a CSV spreadsheet or external LMS.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Selector */}
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab("csv");
              setError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition ${
              activeTab === "csv"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="h-4 w-4" />
            CSV File / Spreadsheet Paste
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("api");
              setError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition ${
              activeTab === "api"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Globe className="h-4 w-4" />
            LMS API Sync
          </button>
        </div>

        {/* CSV Tab */}
        {activeTab === "csv" && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-700">
                Upload CSV File
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />
              {fileName && (
                <p className="text-xs text-slate-500">Loaded file: {fileName}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700">
                Or Paste Spreadsheet Data (CSV / TSV)
              </label>
              <textarea
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  tryParseCsv(e.target.value);
                }}
                placeholder={`courseName,duration,yearNumber,semesterNumber,unitCode,unitName\nComputer Science,4,1,1,CS101,Intro to Programming\nComputer Science,4,1,1,MAT101,Calculus I`}
                rows={6}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        )}

        {/* API Tab */}
        {activeTab === "api" && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700">
                Endpoint URL
              </label>
              <Input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://lms.institution.edu/api/v1/courses"
                className="h-10 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700">
                  LMS Provider
                </label>
                <select
                  value={apiFormat}
                  onChange={(e) => setApiFormat(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Moodle">Moodle</option>
                  <option value="Canvas">Canvas</option>
                  <option value="Blackboard">Blackboard</option>
                  <option value="Brightspace">Brightspace</option>
                  <option value="Custom">Custom REST</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700">
                  API Key / Token (Optional)
                </label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-10 text-xs"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={isLoading || !apiUrl.trim()}
              onClick={handleApiFetch}
              className="w-full text-xs"
            >
              {isLoading ? "Connecting to LMS..." : "Fetch & Parse Courses"}
            </Button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Parsed Preview */}
        {parsedPreview && parsedPreview.length > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Parsed {parsedPreview.length} Programs ({totalPreviewUnits} Units)
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-600 font-medium">Mode:</span>
                <select
                  value={importMode}
                  onChange={(e) =>
                    setImportMode(e.target.value as "merge" | "replace")
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 font-medium"
                >
                  <option value="merge">Merge with existing</option>
                  <option value="replace">Replace all courses</option>
                </select>
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1">
              {parsedPreview.map((course, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg bg-white/80 px-2.5 py-1.5 text-xs text-slate-800 border border-emerald-100"
                >
                  <span className="font-semibold">{course.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {course.duration} {course.duration === 1 ? "Year" : "Years"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={!parsedPreview || parsedPreview.length === 0}
            onClick={handleConfirmImport}
            className="gap-1.5"
          >
            <Upload className="h-4 w-4" />
            Apply to Academic Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

