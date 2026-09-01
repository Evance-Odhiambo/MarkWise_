"use client";
import React from "react";
import Link from "next/link";
import AppHeader from "@/components/layout/app-header";
import AppFooter from "@/components/layout/app-footer";

const PricingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-linear-to-b from-slate-50 to-white">
      <AppHeader />
      <main className="grow">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-4">
              Pricing
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
              Built around your institution
            </h1>
            <p className="text-lg text-slate-600 mb-10">
              MarkWise is deployed per institution, not sold as a fixed
              self-serve plan — pricing depends on how many students and
              lecturers you&apos;re onboarding and which attendance methods
              you need. Tell us about your institution and we&apos;ll put a
              quote together for you.
            </p>
            <Link
              href="/admin/school-admin/register"
              className="inline-flex items-center gap-2 bg-linear-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
            >
              Request institution onboarding
            </Link>
            <p className="mt-4 text-sm text-slate-500">
              Prefer to ask questions first?{" "}
              <Link
                href="/contact"
                className="font-medium text-emerald-700 hover:text-emerald-800"
              >
                Get in touch
              </Link>
            </p>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
};

export default PricingPage;
