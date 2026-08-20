"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
  required?: boolean;
  label?: string;
}

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  className = "",
  autoComplete,
  required,
  label,
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const inputClassName = `${className} pr-11`.trim();

  return (
    <div className="relative">
      {label && (
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
      )}
      <Input
        id={id}
        type={isVisible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className={inputClassName}
      />
      <button
        type="button"
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        title={isVisible ? "Hide password" : "Show password"}
        onClick={() => setIsVisible((visible) => !visible)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
      >
        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
