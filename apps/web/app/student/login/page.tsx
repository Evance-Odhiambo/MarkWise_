"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function StudentLoginPage() {
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
      const response = await fetch("/api/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("user", JSON.stringify({
          id: data.userId,
          name: data.name,
          role: "student",
          institutionId: data.institutionId,
        }));
        router.push("/student/dashboard");
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
    <div className="min-h-screen bg-linear-to-br from-emerald-400 via-cyan-400 to-indigo-500 flex items-center justify-center py-8">
      <div className="w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-xl border border-white/20">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Student Login</h2>
            <p className="text-sm text-gray-600 mt-1">Welcome back! Sign in to your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="Enter your password"
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting || !email || !password}
              className="w-full bg-linear-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-medium py-2 px-4 rounded-lg transition transform hover:-translate-y-0.5"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              Don't have an account?{" "}
              <Link
                href="/student/register"
                className="text-cyan-700 hover:text-cyan-900 font-medium"
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
