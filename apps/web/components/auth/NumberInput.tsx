"use client";

import { useState } from "react";

interface NumberInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  helperText?: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
}

export function NumberInput({
  label,
  placeholder,
  value,
  onChange,
  error,
  helperText,
  required = true,
  type = "text",
  autoComplete = "off",
}: NumberInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={`
            w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all
            ${
              error
                ? "border-red-500 focus:ring-red-500"
                : isFocused
                  ? "border-emerald-500 focus:ring-emerald-500"
                  : "border-gray-300"
            }
          `}
        />
        {isFocused && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>
      {helperText && <p className="text-sm text-gray-500 mt-1">{helperText}</p>}
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
