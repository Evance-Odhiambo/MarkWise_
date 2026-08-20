"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Presentation } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { InstitutionSelector } from "@/components/auth/InstitutionSelector";
import { NumberInput } from "@/components/auth/NumberInput";
import { PasswordInput } from "@/components/auth/PasswordInput";

export default function LecturerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"verify" | "register">("verify");
  const [institutionId, setInstitutionId] = useState("");
  const [staffNumber, setStaffNumber] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedData, setVerifiedData] = useState<{ name: string } | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionId || !staffNumber) {
      setVerificationError("Please select an institution and enter your staff number");
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const response = await fetch("/api/lecturer/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId, staffNumber }),
      });

      const data = await response.json();

      if (response.ok && data.valid && data.name) {
        setVerifiedData({ name: data.name });
        setStep("register");
      } else {
        setVerificationError(data.error || "Verification failed - invalid staff number");
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
      const response = await fetch("/api/lecturer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId,
          staffNumber,
          name: verifiedData.name,
          email,
          password,
        }),
      });

      if (response.ok) {
        router.push("/lecturer/login");
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
    <AuthLayout
      role="lecturer"
      icon={Presentation}
      eyebrow="Lecturer registration"
      title={step === "verify" ? "Set up your teaching space" : "Create your account"}
      description={step === "verify" ? "Verify your staff identity first, then create secure access to your teaching tools." : "Your identity is verified. Choose the credentials you will use to sign in."}
      footer={
        <p className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/lecturer/login" className="font-semibold text-sky-700 hover:text-sky-800">Sign in</Link>
        </p>
      }
    >

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
                label="Staff Number"
                placeholder="Enter your staff number"
                value={staffNumber}
                onChange={setStaffNumber}
                error={verificationError}
                helperText="Find this on your staff ID or payroll records"
                autoComplete="off"
              />

              <button
                type="submit"
                disabled={isVerifying || !institutionId || !staffNumber}
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
                  Username (verified)
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
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={setPassword}
                  className={inputClass}
                  placeholder="Enter a password"
                  label="Password"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>
                  Confirm Password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  className={inputClass}
                  placeholder="Confirm your password"
                  label="Confirm Password"
                  required
                />
              </div>

              {registerError && <p className="text-sm text-red-600">{registerError}</p>}

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
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
                  {isSubmitting ? "Signing up..." : "Sign Up"}
                </button>
              </div>
            </form>
          )}

    </AuthLayout>
  );
}
