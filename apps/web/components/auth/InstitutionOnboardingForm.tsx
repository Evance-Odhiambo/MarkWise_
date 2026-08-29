"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
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

    if (
      !name.trim() ||
      !title.trim() ||
      !email.trim() ||
      !institutionName.trim()
    ) {
      setError(
        "Contact name, title/position, email, and institution name are required",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/admin/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: name,
          contactTitle: title,
          email,
          institutionName,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Unable to submit onboarding request");
        return;
      }

      setSubmitted(true);
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
                Institutional representative
              </p>
              <CardTitle className="mt-2 text-3xl tracking-tight">
                Request onboarding
              </CardTitle>
              <CardDescription className="mt-2 text-base leading-6">
                Submit your institution for review. A super admin creates access
                after approval.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-800">
                <CheckCircle2 className="mx-auto h-8 w-8" />
                <p className="font-semibold">Request submitted</p>
                <p className="text-sm">
                  A super admin will review the request and create your
                  institutional representative access.
                </p>
                <Link
                  href="/admin/institution/activate"
                  className="block pt-2 font-semibold text-emerald-700"
                >
                  Already approved? Create your admin access
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="contact-name"
                    className="text-sm font-medium text-slate-700"
                  >
                    Contact name
                  </label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="contact-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Jane Doe"
                      className="h-11 pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="contact-title"
                    className="text-sm font-medium text-slate-700"
                  >
                    Title/Position
                  </label>
                  <Input
                    id="contact-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Head of IT"
                    className="h-11"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Examples: Head of IT, Registrar, Vice Principal
                  </p>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="contact-email"
                    className="text-sm font-medium text-slate-700"
                  >
                    Contact email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="admin@institution.edu"
                      className="h-11 pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="institution-name"
                    className="text-sm font-medium text-slate-700"
                  >
                    Institution name
                  </label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="institution-name"
                      value={institutionName}
                      onChange={(event) =>
                        setInstitutionName(event.target.value)
                      }
                      placeholder="University of Nairobi"
                      className="h-11 pl-9"
                      required
                    />
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
                  className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {isSubmitting ? "Submitting..." : "Submit onboarding request"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
