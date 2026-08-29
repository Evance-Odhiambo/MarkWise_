"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface AdminLoginFormProps {
  role: "SUPER_ADMIN" | "INSTITUTION_ADMIN";
  title: string;
  description: string;
  footer: React.ReactNode;
}

const roleContent = {
  SUPER_ADMIN: {
    eyebrow: "Platform owner",
    accent: "sky",
    redirect: "/admin/super-admin/onboarding",
  },
  INSTITUTION_ADMIN: {
    eyebrow: "Institutional representative",
    accent: "emerald",
    redirect: "/admin/institution/dashboard",
  },
} as const;

export function AdminLoginForm({
  role,
  title,
  description,
  footer,
}: AdminLoginFormProps) {
  const router = useRouter();
  const content = roleContent[role];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const accentButton =
    content.accent === "emerald"
      ? "bg-emerald-600 hover:bg-emerald-700"
      : "bg-sky-600 hover:bg-sky-700";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }

      if (data.role !== role) {
        setError(
          `This account is not a ${content.eyebrow.toLowerCase()} account.`,
        );
        return;
      }

      localStorage.setItem(
        "user",
        JSON.stringify({
          id: data.id,
          name: data.name,
          role: data.role,
          email: data.email,
          institutionId: data.institutionId,
          institutionName: data.institutionName,
          token: data.token,
        }),
      );
      router.push(content.redirect);
    } catch {
      setError("Unable to connect to the server");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-4 py-8 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md items-center">
        <Card className="w-full border-white/80 bg-white/90 shadow-[0_25px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <CardHeader className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 ring-1 ring-sky-200">
              {role === "INSTITUTION_ADMIN" ? (
                <Building2 className="h-6 w-6" />
              ) : (
                <ShieldCheck className="h-6 w-6" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                {content.eyebrow}
              </p>
              <CardTitle className="mt-2 text-3xl tracking-tight text-slate-950">
                {title}
              </CardTitle>
              <CardDescription className="mt-2 text-base leading-6 text-slate-600">
                {description}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor={`${role}-email`}
                  className="text-sm font-medium text-slate-700"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id={`${role}-email`}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-11 pl-9 text-base"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor={`${role}-password`}
                  className="text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id={`${role}-password`}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="h-11 pl-9 pr-10 text-base"
                    required
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={isSubmitting}
                className={`h-11 w-full text-white ${accentButton}`}
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
            {footer}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
