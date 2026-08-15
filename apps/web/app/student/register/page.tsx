"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { InstitutionSelector } from "@/components/auth/InstitutionSelector";
import { NumberInput } from "@/components/auth/NumberInput";
import type { VerificationResponse } from "@/app/types/auth";

export default function StudentRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"verify" | "register">("verify");
  const [institutionId, setInstitutionId] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedData, setVerifiedData] = useState<{ name: string; course: string } | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionId || !admissionNumber) {
      setVerificationError("Please select an institution and enter your admission number");
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const response = await fetch("/api/student/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId, admissionNumber }),
      });

      const data = await response.json();

      if (response.ok && data.valid && data.name) {
        setVerifiedData({
          name: data.name,
          course: data.course || "",
        });
        setStep("register");
      } else {
        setVerificationError(data.error || "Verification failed - invalid admission number");
      }
    } catch {
      setVerificationError("Failed to connect to server");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    if (password !== confirmPassword) {
      setRegisterError("Passwords do not match");
      return;
    }

    if (!email || !password) {
      setRegisterError("Email and password are required");
      return;
    }

    if (!verifiedData) {
      setRegisterError("Verification data missing");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/student/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId,
          admissionNumber,
          name: verifiedData.name,
          course: verifiedData.course,
          email,
          password,
        }),
      });

      if (response.ok) {
        router.push("/student/login");
      } else {
        const data = await response.json().catch(() => ({ error: "Registration failed" }));
        setRegisterError(data.error || "Registration failed");
      }
    } catch {
      setRegisterError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep("verify");
    setVerifiedData(null);
    setRegisterError(null);
  };

  const inputClass =
    "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const buttonClass =
    "w-full bg-linear-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-medium py-2 px-4 rounded-lg transition transform hover:-translate-y-0.5";

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-400 via-cyan-400 to-indigo-500 flex items-center justify-center py-8">
      <div className="w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-xl border border-white/20">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">
              {step === "verify" ? "Student Registration" : "Create Account"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {step === "verify"
                ? "Enter your institution and admission number to verify your identity"
                : "Set up your account credentials"}
            </p>
          </div>

          {step === "verify" && verificationError && (
            <p className="text-sm text-red-600 text-center mb-4">{verificationError}</p>
          )}

          {step === "verify" && (
            <form onSubmit={handleVerify} className="space-y-5">
              <InstitutionSelector
                value={institutionId}
                onChange={setInstitutionId}
                error={verificationError}
              />

              <NumberInput
                label="Admission Number"
                placeholder="Enter your admission number"
                value={admissionNumber}
                onChange={setAdmissionNumber}
                error={verificationError}
                helperText="Find this on your student ID card"
                autoComplete="off"
              />

              <button
                type="submit"
                disabled={isVerifying || !institutionId || !admissionNumber}
                className={buttonClass}
              >
                {isVerifying ? "Verifying..." : "Verify Identity"}
              </button>
            </form>
          )}

          {step === "register" && verifiedData && (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className={labelClass}>
                  Full Name (verified)
                </label>
                <input
                  type="text"
                  value={verifiedData.name}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Course (verified)
                </label>
                <input
                  type="text"
                  value={verifiedData.course}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Enter a password"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Confirm your password"
                  required
                />
              </div>

              {registerError && <p className="text-sm text-red-600">{registerError}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !email || !password}
                  className="flex-1 bg-linear-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-medium py-2 px-4 rounded-lg transition"
                >
                  {isSubmitting ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link
                href="/student/login"
                className="text-cyan-700 hover:text-cyan-900 font-medium"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
