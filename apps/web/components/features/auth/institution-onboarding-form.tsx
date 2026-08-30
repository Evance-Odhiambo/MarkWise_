"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Building2, CheckCircle2, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function InstitutionOnboardingForm() {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!name.trim() || !title.trim() || !email.trim() || !institutionName.trim()) {
      setError("All fields are required");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/admin/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactName: name, contactTitle: title, email, institutionName }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error ?? "Unable to submit onboarding request"); return; }
      setSubmitted(true);
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
                MarkWise Admin
              </Badge>
            </div>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Request onboarding</h1>
          <p className="mt-1 text-[11px] text-slate-500">
            Submit your institution for review. A super admin creates access after approval.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-emerald-100 bg-white/90 shadow-xl shadow-emerald-900/5 backdrop-blur-sm overflow-hidden">
          {/* Top accent bar */}
          <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500" />

          <div className="p-5">
            {submitted ? (
              /* Success state */
              <div className="space-y-4 text-center py-2">
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Request submitted</p>
                  <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
                    A super admin will review your request and create your institutional representative access.
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-[10.5px] text-emerald-700 font-medium">
                    Already approved?
                  </p>
                  <Link
                    href="/admin/school-admin/activate"
                    className="mt-1 flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 transition"
                  >
                    Create your admin access
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              /* Form */
              <form onSubmit={submit} className="space-y-3">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                    {error}
                  </div>
                )}

                {/* Contact name */}
                <div className="space-y-1">
                  <label htmlFor="contact-name" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                    Contact name
                  </label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                    <input
                      id="contact-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[12px] text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20 transition"
                      required
                    />
                  </div>
                </div>

                {/* Title / position */}
                <div className="space-y-1">
                  <label htmlFor="contact-title" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                    Title / Position
                  </label>
                  <input
                    id="contact-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Head of IT, Registrar…"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20 transition"
                    required
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label htmlFor="contact-email" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                    Contact email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                    <input
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@institution.edu"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[12px] text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20 transition"
                      required
                    />
                  </div>
                </div>

                {/* Institution name */}
                <div className="space-y-1">
                  <label htmlFor="institution-name" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                    Institution name
                  </label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                    <input
                      id="institution-name"
                      type="text"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      placeholder="University of Nairobi"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[12px] text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20 transition"
                      required
                    />
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[12px] font-bold shadow-lg shadow-emerald-500/25 gap-1.5 transition-all mt-1"
                >
                  {isSubmitting ? "Submitting..." : "Submit onboarding request"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>

                {/* Footer link */}
                <div className="pt-3 border-t border-slate-100 text-center">
                  <span className="text-[11px] text-slate-500">Already approved? </span>
                  <Link
                    href="/admin/school-admin/activate"
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition"
                  >
                    Activate your account →
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Bottom status */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono">Secure connection</span>
        </div>
      </div>
    </main>
  );
}
