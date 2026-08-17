"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, ShieldCheck, Building2, Mail, LockKeyhole, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(
          "user",
          JSON.stringify({
            id: data.userId,
            name: data.name,
            role: data.role,
            email: data.email,
            institutionId: data.institutionId,
            institutionName: data.institutionName,
          })
        );
        router.push("/admin/system-admin/institutions");
        return;
      }

      const data = await response.json().catch(() => ({ error: "Login failed" }));
      setError(data.error || "Login failed");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.18),_transparent_35%),linear-gradient(135deg,#f8fafc_0%,#e0f2fe_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden rounded-[2rem] border border-sky-200/80 bg-slate-950 p-8 text-slate-50 shadow-2xl shadow-sky-900/20 lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-sky-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Enterprise access
            </div>

            <div>
              <p className="text-sm font-medium text-sky-200">MarkWise Control Center</p>
              <h1 className="mt-3 max-w-md text-4xl font-semibold tracking-tight text-white">
                Manage institutions, staff, and academic operations from one secure hub.
              </h1>
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <Building2 className="mb-3 h-8 w-8 text-sky-300" />
              <p className="text-lg font-semibold">Institution oversight</p>
              <p className="mt-2 text-sm text-slate-300">Monitor registration, setup, and operational health across your network.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <ShieldCheck className="mb-3 h-8 w-8 text-sky-300" />
              <p className="text-lg font-semibold">Role-based security</p>
              <p className="mt-2 text-sm text-slate-300">Keep access controlled for admins, lecturers, and students with clear governance.</p>
            </div>
          </div>
        </section>

        <section className="flex justify-center">
          <Card className="w-full max-w-xl border-slate-200 bg-white/90 shadow-[0_25px_60px_rgba(8,47,73,0.12)] backdrop-blur-sm">
            <CardHeader className="space-y-3 pb-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 ring-1 ring-sky-200">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-3xl font-semibold tracking-tight text-slate-900">System admin login</CardTitle>
                <CardDescription className="mt-2 text-base text-slate-600">
                  Sign in to continue managing your MarkWise ecosystem.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-slate-700">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="admin@markwise.edu"
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
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
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

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={isSubmitting} className="h-11 w-full bg-sky-600 text-white hover:bg-sky-700">
                  {isSubmitting ? "Signing in..." : "Sign in"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-5 text-sm text-slate-600">
                <span>Need a new system admin account?</span>
                <Link href="/admin/system-admin/register" className="font-medium text-sky-700 transition hover:text-sky-800">
                  Create account
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
