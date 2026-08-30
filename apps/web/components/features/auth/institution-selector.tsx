"use client";

import { useState, useEffect } from "react";
import type { Institution } from "@/types/auth";

interface InstitutionSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

export function InstitutionSelector({
  value,
  onChange,
  error,
}: InstitutionSelectorProps) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const response = await fetch("/api/v1/institutions/public");
        if (!response.ok) throw new Error("Failed to fetch institutions");
        const data = await response.json();
        setInstitutions(data.institutions || []);
      } catch (err) {
        setFetchError(
          err instanceof Error ? err.message : "Failed to load institutions",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInstitutions();
  }, []);

  return (
    <div className="mb-6">
      <label
        htmlFor="institution"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        Institution
      </label>
      <select
        id="institution"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className={`
          w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
          ${error ? "border-red-500" : "border-gray-300"}
          ${loading ? "opacity-50" : ""}
        `}
        required
      >
        <option value="">
          {loading
            ? "Loading institutions..."
            : fetchError
              ? "Failed to load institutions"
              : "Select your institution"}
        </option>
        {institutions.map((inst) => (
          <option key={inst.id} value={inst.id}>
            {inst.name}
          </option>
        ))}
      </select>
      {fetchError && <p className="text-sm text-red-600 mt-1">{fetchError}</p>}
    </div>
  );
}
