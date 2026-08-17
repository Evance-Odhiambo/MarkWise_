"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const PASSWORD_REQUIREMENTS = [
  { key: "length", label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { key: "number", label: "One number", test: (value: string) => /\d/.test(value) },
  { key: "special", label: "One special character", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export default function AdminRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    institutionName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordChecks = PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    valid: requirement.test(formData.password),
  }));

  const passwordValid = passwordChecks.every((requirement) => requirement.valid);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Full name is required");
      return;
    }

    if (!formData.institutionName.trim()) {
      setError("Institution name is required");
      return;
    }

    if (!passwordValid) {
      setError("Password must include at least 8 characters, one uppercase letter, one number, and one special character");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: "system-admin",
          institution: {
            name: formData.institutionName,
          },
        }),
      });

      if (response.ok) {
        router.push("/admin/system-admin/login");
        return;
      }

      const data = await response.json().catch(() => ({ error: "Registration failed" }));
      setError(data.error || "Registration failed");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.12),_transparent_35%),linear-gradient(135deg,#f8fafc_0%,#ecfeff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="hidden rounded-[2rem] border border-emerald-200 bg-slate-900 p-8 text-slate-50 shadow-2xl shadow-emerald-900/20 lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              System admin setup
            </div>

            <div>
              <p className="text-sm font-medium text-emerald-200">Start your institution</p>
              <h1 className="mt-3 max-w-md text-4xl font-semibold tracking-tight text-white">
                Launch a secure digital campus with a single administrator account.
              </h1>
            </div>
          </div>

          <div className="mt-10 space-y-4">
            {[
              "Create your institution profile and governance scope",
              "Set permissions for students, lecturers, and academic operations",
              "Launch a unified administration dashboard for total visibility",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
                <p className="text-sm text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex justify-center">
          <Card className="w-full max-w-xl border-slate-200 bg-white/90 shadow-[0_25px_60px_rgba(15,118,110,0.12)] backdrop-blur-sm">
            <CardHeader className="space-y-3 pb-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-3xl font-semibold tracking-tight text-slate-900">Create account</CardTitle>
                <CardDescription className="mt-2 text-base text-slate-600">
                  Set up your institution and system administration access.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <label htmlFor="name" className="text-sm font-medium text-slate-700">
                      Username
                    </label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                        placeholder="Jane Doe"
                        className="h-11 pl-9 text-base"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label htmlFor="email" className="text-sm font-medium text-slate-700">
                      Work email
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                        placeholder="admin@institution.edu"
                        className="h-11 pl-9 text-base"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label htmlFor="institutionName" className="text-sm font-medium text-slate-700">
                      Institution name
                    </label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="institutionName"
                        type="text"
                        value={formData.institutionName}
                        onChange={(event) => setFormData({ ...formData, institutionName: event.target.value })}
                        placeholder="University of Nairobi"
                        className="h-11 pl-9 text-base"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-slate-700">
                      Password
                    </label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                        placeholder="Create password"
                        className="h-11 pl-9 pr-10 text-base"
                        required
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                      Confirm password
                    </label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
                        placeholder="Repeat password"
                        className="h-11 pl-9 pr-10 text-base"
                        required
                      />
                      <button
                        type="button"
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {formData.password.length > 0 && (
                  <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    {passwordChecks.map((requirement) => (
                      <div key={requirement.key} className="flex items-center gap-2">
                        <span className={requirement.valid ? "text-emerald-600" : "text-slate-400"}>
                          {requirement.valid ? "✓" : "○"}
                        </span>
                        <span className={requirement.valid ? "text-emerald-700" : "text-slate-600"}>{requirement.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={isSubmitting} className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700">
                  {isSubmitting ? "Creating account..." : "Create account"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-5 text-sm text-slate-600">
                <span>Already have an account?</span>
                <Link href="/admin/system-admin/login" className="font-medium text-emerald-700 transition hover:text-emerald-800">
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

