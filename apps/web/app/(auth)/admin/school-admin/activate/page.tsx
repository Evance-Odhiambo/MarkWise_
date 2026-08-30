"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function InstitutionAdminActivatePage() {
  const router = useRouter();
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [email, setEmail] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setContactName(params.get("contactName") ?? "");
    setContactTitle(params.get("contactTitle") ?? "");
    setEmail(params.get("email") ?? "");
    setInstitutionName(params.get("institutionName") ?? "");
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/admin/auth/institution/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactName, contactTitle, email, institutionName, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error ?? "Unable to complete registration"); return; }
      localStorage.setItem("user", JSON.stringify({
        id: data.admin.id,
        email: data.admin.email,
        role: "INSTITUTION_ADMIN",
        institutionId: data.admin.institutionId,
        token: data.token,
        name: contactName,
        contactTitle: data.contactTitle ?? contactTitle,
        institutionName,
      }));
      router.replace("/admin/school-admin/dashboard");
    } catch {
      setError("Unable to connect to the server");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 flex items-center justify-center px-4 py-8">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-teal-200/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                Institutional representative
              </p>
              <Badge className="mt-0.5 bg-emerald-50 border-emerald-200 text-emerald-700 text-[9px] font-mono px-1.5 py-0">
                Account Activation
              </Badge>
            </div>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Activate your account</h1>
          <p className="mt-1 text-[11px] text-slate-500">
            Your request was approved. Set a password to complete access setup.
          </p>
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

            {/* Pre-filled info banner */}
            {(institutionName || email) && (
              <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 space-y-1">
                {institutionName && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <Building2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-emerald-800 truncate">{institutionName}</span>
                  </div>
                )}
                {email && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <Mail className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="text-emerald-700 font-mono truncate">{email}</span>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={submit} className="space-y-3">
              {/* Contact name — editable fallback if not in URL */}
              <div className="space-y-1">
                <label htmlFor="contact-name" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Contact name
                </label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                  <input
                    id="contact-name"
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Jane Doe"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[12px] text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20 transition"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label htmlFor="password" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-[12px] text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="space-y-1">
                <label htmlFor="confirm-password" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Confirm password
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                  <input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-[12px] text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[12px] font-bold shadow-lg shadow-emerald-500/25 gap-1.5 transition-all mt-1"
              >
                {isSubmitting ? "Activating..." : "Activate account"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <span className="text-[11px] text-slate-500">Have an account already? </span>
              <Link
                href="/admin/school-admin/login"
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition"
              >
                Sign in →
              </Link>
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
