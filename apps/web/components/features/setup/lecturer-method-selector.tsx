"use client";

import { FileText, PlusCircle, Server } from "lucide-react";
import type { ImportMethod } from "../../../types/setup-lecturer";

interface MethodSelectorProps {
  method: ImportMethod;
  onChange: (method: ImportMethod) => void;
}

const methods: {
  value: ImportMethod;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "manual",
    label: "Manual Entry",
    description: "Add faculty records individually with staff IDs",
    icon: PlusCircle,
  },
  {
    value: "csv",
    label: "CSV Batch Import",
    description: "Upload formatted CSV roster with staff numbers",
    icon: FileText,
  },
  {
    value: "api",
    label: "Institution LMS API",
    description: "Sync faculty directly from ERP / HR database",
    icon: Server,
  },
];

export function LecturerMethodSelector({
  method,
  onChange,
}: MethodSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
      {methods.map((m) => {
        const Icon = m.icon;
        const active = method === m.value;
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            className={`
              flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all
              ${
                active
                  ? "border-emerald-500/80 bg-emerald-50/60 shadow-2xs"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
              }
            `}
          >
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                active
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <h4
                className={`font-bold text-[11px] ${
                  active ? "text-emerald-900" : "text-slate-900"
                }`}
              >
                {m.label}
              </h4>
              <p className="text-[9.5px] text-slate-500 truncate mt-0.5">
                {m.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
