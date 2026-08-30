"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AdminLoginFormProps {
  role: "SUPER_ADMIN" | "INSTITUTION_ADMIN";
  title: string;
  description: string;
  footer: React.ReactNode;
}

const roleContent = {
  SUPER_ADMIN: {
    eyebrow: "Platform owner",
    accent: "sky" as const,
    redirect: "/admin/super-admin/onboarding",
  },
  INSTITUTION_ADMIN: {
    eyebrow: "Institutional representative",
    accent: "emerald" as const,
    redirect: "/admin/school-admin/dashboard",
  },
} as const;

export function AdminLoginForm({ role, title, description, footer }: AdminLoginFormProps) {
  const router = useRouter();
  const content = roleContent[role];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!email || !password) { setError("Email and password are required"); return; }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error || "Login failed"); return; }
      if (data.role !== role) {
        setError(`This account is not a ${content.eyebrow.toLowerCase()} account.`);
        return;
      }
      localStorage.setItem("user", JSON.stringify({
        id: data.id, name: data.name, role: data.role,
        email: data.email, institutionId: data.institutionId,
        institutionName: data.institutionName, token: data.token,
      }));
      router.push(content.redirect);
    } catch {
      setError("Unable to connect to the server");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 flex items-center justify-center px-4 py-8">
      {/* Decorative blur blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-teal-200/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
              {role === "INSTITUTION_ADMIN"
                ? <Building2 className="h-5 w-5" />
                : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                {content.eyebrow}
              </p>
              <Badge className="mt-0.5 bg-emerald-50 border-emerald-200 text-emerald-700 text-[9px] font-mono px-1.5 py-0">
                MarkWise Admin
              </Badge>
            </div>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-[11px] text-slate-500">{description}</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-emerald-100 bg-white/90 shadow-xl shadow-emerald-900/5 backdrop-blur-sm overflow-hidden">
          {/* Top accent bar */}
          <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500" />

          <div className="p-5">
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Email */}
              <div className="space-y-1">
                <label htmlFor={`${role}-email`} className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                  <input
                    id={`${role}-email`}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@institution.edu"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[12px] text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20 transition"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label htmlFor={`${role}-password`} className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                  <input
                    id={`${role}-password`}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-[12px] text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20 transition"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[12px] font-bold shadow-lg shadow-emerald-500/25 gap-1.5 transition-all"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              {footer}
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono">Secure connection</span>
        </div>
      </div>
    </main>
  );
}
