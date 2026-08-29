"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/admin/auth/institution/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName,
          contactTitle,
          email,
          institutionName,
          password,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Unable to complete registration");
        return;
      }

      localStorage.setItem(
        "user",
        JSON.stringify({
          id: data.admin.id,
          email: data.admin.email,
          role: "INSTITUTION_ADMIN",
          institutionId: data.admin.institutionId,
          token: data.token,
          name: contactName,
          contactTitle: data.contactTitle ?? contactTitle,
          institutionName,
        }),
      );
      router.replace("/admin/institution/dashboard");
    } catch {
      setError("Unable to connect to the server");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-4 py-8 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md items-center">
        <Card className="w-full border-white/80 bg-white/90 shadow-xl">
          <CardHeader className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-700">
                Approved institution
              </p>
              <CardTitle className="mt-2 text-3xl tracking-tight">
                Create your admin access
              </CardTitle>
              <CardDescription className="mt-2 text-base leading-6">
                Use the same contact and institution details from your approved
                onboarding request.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Contact name
                <Input
                  value={contactName}
                  readOnly
                  className="mt-2 h-11 bg-slate-50"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Title/Position
                <Input
                  value={contactTitle}
                  readOnly
                  className="mt-2 h-11 bg-slate-50"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Contact email
                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    readOnly
                    className="h-11 bg-slate-50 pl-9"
                    required
                  />
                </div>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Institution name
                <div className="relative mt-2">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={institutionName}
                    readOnly
                    className="h-11 bg-slate-50 pl-9"
                    required
                  />
                </div>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Password
                <div className="relative mt-2">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 pl-9 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Confirm password
                <div className="relative mt-2">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-11 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    aria-label="Toggle confirmation visibility"
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </label>
              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {isSubmitting
                  ? "Creating access..."
                  : "Create access and continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
