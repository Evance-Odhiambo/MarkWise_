"use client";

import { useState } from "react";
import type { Lecturer } from "../types/lecturer";

interface ApiImportFormProps {
  institutionId: string;
  onDataImported: (data: Lecturer[]) => void;
}

const commonApiFormats = [
  "Moodle",
  "Canvas",
  "Blackboard",
  "Brightspace",
  "Blackboard Learn",
  "Custom",
];

export function LecturerApiImportForm({
  institutionId,
  onDataImported,
}: ApiImportFormProps) {
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
      const response = await fetch("/api/v1/lecturers/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(storedUser.token
            ? { Authorization: `Bearer ${storedUser.token}` }
            : {}),
        },
        body: JSON.stringify({
          institutionId,
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
        `Successfully imported ${result.importedLecturers} lecturers`,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          API Endpoint URL
        </label>
        <input
          type="url"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          placeholder="https://your-institution.com/api/lecturers"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          System / Format
        </label>
        <select
          value={apiFormat}
          onChange={(e) => setApiFormat(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select a system format</option>
          {commonApiFormats.map((format) => (
            <option key={format} value={format}>
              {format}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          API Key (optional, if required)
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {successMessage && (
        <p className="text-sm text-green-600">{successMessage}</p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition disabled:opacity-50"
      >
        {isLoading ? "Importing..." : "Import Lecturers"}
      </button>
    </form>
  );
}
