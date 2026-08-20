"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Presentation } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LecturerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/lecturer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("user", JSON.stringify({
          id: data.userId,
          name: data.name,
          role: "lecturer",
          institutionId: data.institutionId,
        }));
        router.push("/lecturer/dashboard");
      } else {
        const data = await response.json().catch(() => ({ error: "Login failed" }));
        setError(data.error || "Login failed");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      role="lecturer"
      icon={Presentation}
      eyebrow="Lecturer access"
      title="Welcome back"
      description="Sign in to continue."
      footer={
        <p className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">
          Don't have an account?{" "}
          <Link href="/lecturer/register" className="font-semibold text-sky-700 hover:text-sky-800">
            Sign up
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">Email address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-11 pl-9 text-base" required />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">Password</label>
          <PasswordInput id="password" value={password} onChange={setPassword} className="h-11 text-base" placeholder="Enter your password" label="Password" required />
        </div>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={isSubmitting || !email || !password} className="h-11 w-full bg-sky-600 text-white hover:bg-sky-700">
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
