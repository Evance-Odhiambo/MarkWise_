"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ImportMethod } from "../types/academic";

interface MethodSelectorProps {
  method: ImportMethod;
  onChange: (method: ImportMethod) => void;
}

const methods: {
  value: ImportMethod;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "api",
    label: "Institution API",
    description:
      "Import data from your institution's LMS or student portal API",
    icon: "🔌",
  },
  {
    value: "csv",
    label: "CSV Import",
    description: "Upload a CSV file with your academic data",
    icon: "📁",
  },
  {
    value: "manual",
    label: "Manual Entry",
    description: "Add courses, years, semesters, and units manually",
    icon: "✏️",
  },
];

export function AcademicMethodSelector({
  method,
  onChange,
}: MethodSelectorProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {methods.map((m) => {
        const active = method === m.value;

        return (
          <Card
            key={m.value}
            className={cn(
              "cursor-pointer border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
              active
                ? "border-blue-500 bg-blue-50/80 shadow-sm ring-2 ring-blue-100"
                : "border-slate-200 bg-white/80 hover:border-slate-300",
            )}
            onClick={() => onChange(m.value)}
          >
            <div className="flex h-full flex-col p-5 text-left">
              <div
                className={cn(
                  "mb-3 flex h-11 w-11 items-center justify-center rounded-xl text-xl shadow-sm",
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700",
                )}
              >
                {m.icon}
              </div>

              <h3 className="text-base font-semibold text-slate-900">
                {m.label}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {m.description}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
