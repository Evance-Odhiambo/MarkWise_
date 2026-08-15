"use client";

import type { ImportMethod } from "../types/student";

interface MethodSelectorProps {
  method: ImportMethod;
  onChange: (method: ImportMethod) => void;
}

const methods: { value: ImportMethod; label: string; description: string; icon: string }[] = [
  {
    value: "api",
    label: "Institution API",
    description: "Import students from your institution's LMS or student portal API",
    icon: "🔌",
  },
  {
    value: "csv",
    label: "CSV Import",
    description: "Upload a CSV file with your student data",
    icon: "📁",
  },
  {
    value: "manual",
    label: "Manual Entry",
    description: "Add students one by one",
    icon: "✏️",
  },
];

export function StudentMethodSelector({ method, onChange }: MethodSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {methods.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={`
            flex flex-col items-center text-center p-4 rounded-lg border-2 transition-all
            ${
              method === m.value
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }
          `}
        >
          <span className="text-2xl mb-2">{m.icon}</span>
          <h3 className="font-semibold text-gray-900">{m.label}</h3>
          <p className="text-sm text-gray-600 mt-1">{m.description}</p>
        </button>
      ))}
    </div>
  );
}
