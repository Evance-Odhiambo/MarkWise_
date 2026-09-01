"use client";
import React from "react";
import Link from "next/link";
import AppHeader from "@/components/layout/app-header";
import AppFooter from "@/components/layout/app-footer";

const AboutPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-linear-to-b from-slate-50 to-white">
      <AppHeader />
      <main className="grow">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="mx-auto max-w-3xl">
            <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-4">
              About
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">
              Attendance that adapts to the room, not the other way around
            </h1>
            <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
              <p>
                MarkWise is an attendance system built for real classrooms and
                real lecture halls — where not every student has the same
                phone, the same signal, or a seat near the front. Instead of
                betting on one check-in method, it layers several together:
                Bluetooth Low Energy, QR codes, and PIN entry for in-person
                sessions, with lecturer-assisted marking as a fallback for
                students without smartphones.
              </p>
              <p>
                For rooms too large for the lecturer&apos;s own signal to
                reach everyone, students who&apos;ve already checked in can
                relay coverage to classmates further away — extending BLE,
                QR, and PIN detection across the room without any extra
                hardware.
              </p>
              <p>
                For virtual lectures, MarkWise uses WebAuthn passkeys —
                Face ID, Touch ID, Windows Hello — for phishing-resistant,
                passwordless check-in, with a live dashboard so lecturers can
                see who&apos;s present as it happens.
              </p>
              <p>
                Every check-in is designed to keep working even without a
                live connection: in-person attendance is recorded locally
                first and syncs automatically once the device is back online.
              </p>
            </div>
            <div className="mt-10">
              <Link
                href="/admin/school-admin/register"
                className="inline-flex items-center gap-2 bg-linear-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
              >
                Request institution onboarding
              </Link>
            </div>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
};

export default AboutPage;
