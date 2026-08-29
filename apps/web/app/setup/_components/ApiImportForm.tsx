"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AcademicCourse } from "../types/academic";

interface ApiImportFormProps {
  onDataImported: (data: AcademicCourse[]) => void;
}

const commonApiFormats = [
  "Moodle",
  "Canvas",
  "Blackboard",
  "Brightspace",
  "Blackboard Learn",
  "Custom",
];

interface NormalizedCourse extends AcademicCourse {
  courseYears?: never;
  years: AcademicCourse["years"];
}

export function ApiImportForm({ onDataImported }: ApiImportFormProps) {
  const [apiUrl, setApiUrl] = useState("");
  const [apiFormat, setApiFormat] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiUrl) {
      setError("Please enter an API endpoint URL");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const storedUser = JSON.parse(localStorage.getItem("user") ?? "{}") as {
        token?: string;
      };
      const response = await fetch("/api/v1/academic/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(storedUser.token
            ? { Authorization: `Bearer ${storedUser.token}` }
            : {}),
        },
        body: JSON.stringify({
          apiUrl,
          apiFormat,
          apiKey: apiKey || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response
          .json()
          .catch(() => ({ error: "Import failed" }));
        throw new Error(err.error || "Import failed");
      }

      const result = await response.json();
      setSuccessMessage(
        `Successfully imported ${result.importedCourses} courses with ${result.importedUnits} units`,
      );
      onDataImported(result.data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          API Endpoint URL
        </label>
        <Input
          type="url"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          placeholder="https://your-institution.com/api/academic-data"
          className="h-11 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-blue-100"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          System / Format
        </label>
        <select
          value={apiFormat}
          onChange={(e) => setApiFormat(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">Select a system format</option>
          {commonApiFormats.map((format) => (
            <option key={format} value={format}>
              {format}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          API Key (optional)
        </label>
        <Input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="••••••••••"
          className="h-11 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-blue-100"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {successMessage && (
        <p className="text-sm text-emerald-600">{successMessage}</p>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full justify-center"
        size="lg"
      >
        {isLoading ? "Importing..." : "Import Academic Data"}
      </Button>
    </form>
  );
}
