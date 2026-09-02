"use client";
import AppHeader from "../components/layout/app-header";
import AppFooter from "../components/layout/app-footer";
import Link from "next/link";
import { useState, useEffect } from "react";

// ─── Feature Data ────────────────────────────────────────────
// Each card gets its own identity within the emerald/teal/green family,
// rather than every card in a group sharing one flat color - rotating
// through the three hues (plus diagonal blends between them) keeps every
// individual method visually distinct while staying strictly on-brand.
const IN_PERSON_FEATURES = [
  {
    icon: "⚡",
    title: "Instant BLE Detection",
    description:
      "Bluetooth Low Energy automatically detects which students are physically present — no action required.",
    color: "from-emerald-400 to-emerald-600",
    accent: "group-hover:border-emerald-400/50",
    glow: "group-hover:shadow-emerald-500/15",
    iconShadow: "shadow-emerald-500/20",
    text: "group-hover:text-emerald-700",
    bar: "group-hover:from-emerald-400 group-hover:via-emerald-500",
    check: "text-emerald-500",
    arrow: "group-hover:text-emerald-400",
  },
  {
    icon: "📱",
    title: "QR Code Check-in",
    description:
      "Students scan a unique QR code from the lecturer or already marked students for fast, secure attendance capture.",
    color: "from-teal-400 to-teal-600",
    accent: "group-hover:border-teal-400/50",
    glow: "group-hover:shadow-teal-500/15",
    iconShadow: "shadow-teal-500/20",
    text: "group-hover:text-teal-700",
    bar: "group-hover:from-teal-400 group-hover:via-teal-500",
    check: "text-teal-500",
    arrow: "group-hover:text-teal-400",
  },
  {
    icon: "🔢",
    title: "Manual PIN Entry",
    description:
      "Students enter a session-specific PIN on their phone — simple, fast, and works with any device. Suitable where student device doesn't support BLE or QR scanning.",
    color: "from-green-400 to-green-600",
    accent: "group-hover:border-green-400/50",
    glow: "group-hover:shadow-green-500/15",
    iconShadow: "shadow-green-500/20",
    text: "group-hover:text-green-700",
    bar: "group-hover:from-green-400 group-hover:via-green-500",
    check: "text-green-500",
    arrow: "group-hover:text-green-400",
  },
  {
    icon: "👤",
    title: "Lecturer Assisted",
    description:
      "Lecturers can manually mark students present directly from their device — perfect for students without smartphones or in case of technical issues.",
    color: "from-emerald-400 to-teal-600",
    accent: "group-hover:border-emerald-400/50",
    glow: "group-hover:shadow-emerald-500/15",
    iconShadow: "shadow-emerald-500/20",
    text: "group-hover:text-emerald-700",
    bar: "group-hover:from-emerald-400 group-hover:via-teal-500",
    check: "text-emerald-500",
    arrow: "group-hover:text-emerald-400",
  },
  {
    icon: "🌐",
    title: "Self-Extending Relay Mesh",
    description:
      "Our system self-extends its BLE and QR coverage through a relay mesh network — devices in the room act as relays, extending detection range beyond a single beacon or scan.",
    color: "from-teal-400 to-green-600",
    accent: "group-hover:border-teal-400/50",
    glow: "group-hover:shadow-teal-500/15",
    iconShadow: "shadow-teal-500/20",
    text: "group-hover:text-teal-700",
    bar: "group-hover:from-teal-400 group-hover:via-green-500",
    check: "text-teal-500",
    arrow: "group-hover:text-teal-400",
  },
  {
    icon: "🔒",
    title: "Offline First",
    description:
      "No internet? No problem. In-person attendance is recorded locally and syncs automatically when online.",
    color: "from-green-400 to-emerald-600",
    accent: "group-hover:border-green-400/50",
    glow: "group-hover:shadow-green-500/15",
    iconShadow: "shadow-green-500/20",
    text: "group-hover:text-green-700",
    bar: "group-hover:from-green-400 group-hover:via-emerald-500",
    check: "text-green-500",
    arrow: "group-hover:text-green-400",
  },
];

const ONLINE_FEATURES = [
  {
    icon: "💻",
    title: "Live Session Tracking",
    description:
      "Real-time dashboard shows who's marked present and who's still missing — as it happens.",
    color: "from-emerald-400 to-emerald-600",
    accent: "group-hover:border-emerald-400/50",
    glow: "group-hover:shadow-emerald-500/15",
    iconShadow: "shadow-emerald-500/20",
    text: "group-hover:text-emerald-700",
    bar: "group-hover:from-emerald-400 group-hover:via-emerald-500",
    check: "text-emerald-500",
    arrow: "group-hover:text-emerald-400",
  },
  {
    icon: "🔗",
    title: "Shareable Links",
    description:
      "Lecturers generate unique, secure links that students tap to instantly join the attendance session — no app download needed on desktop.",
    color: "from-teal-400 to-teal-600",
    accent: "group-hover:border-teal-400/50",
    glow: "group-hover:shadow-teal-500/15",
    iconShadow: "shadow-teal-500/20",
    text: "group-hover:text-teal-700",
    bar: "group-hover:from-teal-400 group-hover:via-teal-500",
    check: "text-teal-500",
    arrow: "group-hover:text-teal-400",
  },
  {
    icon: "📱",
    title: "Seamless Mobile Handoff",
    description:
      "On mobile, links automatically open the MarkWise app via deep linking, submit attendance with secure credentials, and show instant confirmation.",
    color: "from-green-400 to-green-600",
    accent: "group-hover:border-green-400/50",
    glow: "group-hover:shadow-green-500/15",
    iconShadow: "shadow-green-500/20",
    text: "group-hover:text-green-700",
    bar: "group-hover:from-green-400 group-hover:via-green-500",
    check: "text-green-500",
    arrow: "group-hover:text-green-400",
  },
  {
    icon: "🔐",
    title: "Passwordless WebAuthn",
    description:
      "On desktop, students authenticate via Touch ID, Face ID, Windows Hello, or passkeys — secure, phishing-resistant, and frictionless.",
    color: "from-emerald-400 to-teal-600",
    accent: "group-hover:border-emerald-400/50",
    glow: "group-hover:shadow-emerald-500/15",
    iconShadow: "shadow-emerald-500/20",
    text: "group-hover:text-emerald-700",
    bar: "group-hover:from-emerald-400 group-hover:via-teal-500",
    check: "text-emerald-500",
    arrow: "group-hover:text-emerald-400",
  },
  {
    icon: "🛡️",
    title: "Multi-Layer Proxy Protection",
    description:
      "IP address checks, device ID verification, WebAuthn counters, and browser fingerprints block proxy attendance and replay attacks.",
    color: "from-teal-400 to-green-600",
    accent: "group-hover:border-teal-400/50",
    glow: "group-hover:shadow-teal-500/15",
    iconShadow: "shadow-teal-500/20",
    text: "group-hover:text-teal-700",
    bar: "group-hover:from-teal-400 group-hover:via-green-500",
    check: "text-teal-500",
    arrow: "group-hover:text-teal-400",
  },
  {
    icon: "🎥",
    title: "Works With Any Platform",
    description:
      "Paste your attendance link straight into Zoom, Teams, Google Meet chat, or anywhere else — no plugins, no setup, just instant check-in.",
    color: "from-green-400 to-emerald-600",
    accent: "group-hover:border-green-400/50",
    glow: "group-hover:shadow-green-500/15",
    iconShadow: "shadow-green-500/20",
    text: "group-hover:text-green-700",
    bar: "group-hover:from-green-400 group-hover:via-emerald-500",
    check: "text-green-500",
    arrow: "group-hover:text-green-400",
  },
];

const HERO_SHOWCASE_FEATURES = [
  {
    icon: "⚡",
    title: "Instant BLE Detection",
    description: "Bluetooth auto-detects who's in the room — zero taps needed.",
    stat: "< 1s",
    statLabel: "check-in time",
  },
  {
    icon: "📱",
    title: "QR Code Check-in",
    description: "One scan, instantly verified and recorded.",
    stat: "fast scan",
    statLabel: "to mark present",
  },
  {
    icon: "🔢",
    title: "PIN Check-in",
    description: "Enter a simple code to verify your presence — fast and secure.",
    stat: "fast entry",
    statLabel: "to mark present",
  },
  {
    icon: "🔒",
    title: "Offline First",
    description: "No internet? No problem. Syncs the moment you're back online.",
    stat: "100%",
    statLabel: "offline ready",
  },
  {
    icon: "🌐",
    title: "Cross-Platform Compatibility",
    description: "Works seamlessly across devices and operating systems — no compatibility issues.",
    stat: "All Devices",
    statLabel: "supported",
  },
  {
    icon: "🛡️",
    title: "Multi-Layer Proxy Protection",
    description: "IP address checks, device ID verification, WebAuthn counters, and browser fingerprints block proxy attendance and replay attacks.",
    stat: "100%",
    statLabel: "secure",
  },
  {
    icon: "🎥",
    title: "Video Platform Integration",
    description: "Works seamlessly with Zoom, Teams, Google Meet, and more — share links directly in chat for instant check-in.",
    stat: "100%",
    statLabel: "integration",
  },
  {
    icon: "🔗",
    title: "Seamless Integration",
    description: "Connects effortlessly with your existing tools and workflows — no disruption to your routine.",
    stat: "100%",
    statLabel: "integration",
  },
  {
    icon: "📊",
    title: "Real-Time Analytics",
    description: "Get insights into your attendance data with real-time reporting and analytics.",
    stat: "24/7",
    statLabel: "available",
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    icon: "📝",
    title: "Start Attendance Session",
    description:
      "Lecturer starts a session in seconds — in person or online. Students get instant, secure access, no setup required.",
    number: "01",
    gradient: "from-emerald-400 to-teal-500",
    glowColor: "bg-emerald-400/25",
  },
  {
    icon: "📚",
    title: "Mark Attendance",
    description:
      "Students check in with BLE, QR, or PIN in person — or a secure link online. Lecturers see who's present live, either way.",
    number: "02",
    gradient: "from-teal-400 to-green-500",
    glowColor: "bg-teal-400/25",
  },
  {
    icon: "📱",
    title: "Track & Report",
    description:
      "Every check-in is recorded in real time and synced the moment you're back online. Lecturers leave class with clean, ready-to-export reports.",
    number: "03",
    gradient: "from-green-400 to-emerald-500",
    glowColor: "bg-green-400/25",
  },
];

// ─── HomePage Component ─────────────────────────────────────
const HomePage: React.FC = () => {
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);

  // Auto-advance the hero showcase card
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!isHeroHovered) {
        setActiveFeatureIndex(
          (prev) => (prev + 1) % HERO_SHOWCASE_FEATURES.length,
        );
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [isHeroHovered]);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cardId = entry.target.getAttribute("data-card-id");
            if (cardId) {
              setVisibleCards((prev) => new Set(prev).add(cardId));
            }
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -30px 0px" },
    );

    const cards = document.querySelectorAll("[data-card-id]");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9] text-[13px] antialiased">
      <style jsx global>{`
        @keyframes checkmarkDraw {
          from {
            stroke-dashoffset: 24;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes floatY {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        @keyframes floatYDelayed {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        @keyframes pulseGlow {
          0%,
          100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }
        @keyframes shimmerText {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
        .floating-badge {
          animation: floatY 4s ease-in-out infinite;
        }
        .floating-badge-delayed {
          animation: floatYDelayed 4s ease-in-out 1.5s infinite;
        }
        .pulse-glow {
          animation: pulseGlow 3s ease-in-out infinite;
        }
        .shimmer-text {
          background-size: 200% auto;
          animation: shimmerText 4s linear infinite;
        }
      `}</style>

      <AppHeader />

      {/* ─── Hero Section ───────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a1f1a] via-[#0f2d26] to-[#1a3d3a] pt-10 pb-24 md:pt-14 md:pb-32 px-4">
        {/* ─── Background Layers ─── */}
        {/* Deep gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1f1a] via-[#0f2d26] to-[#1a3d3a]" />

        {/* Radial orbs */}
        <div className="absolute -top-40 -right-32 w-[550px] h-[550px] rounded-full bg-emerald-400/10 blur-[130px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-32 w-[500px] h-[500px] rounded-full bg-teal-500/8 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-cyan-400/6 blur-[100px] pointer-events-none" />

        {/* Fine grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
            backgroundSize: "44px 44px",
          }}
        />

        {/* Subtle noise texture via CSS gradient */}
        <div
          className="absolute inset-0 opacity-[0.015] pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.2) 2px, rgba(255,255,255,0.2) 3px)`,
          }}
        />

        <div className="container mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-center">
            {/* ─── Left: Copy ──────────────────────────────────── */}
            <div className="lg:col-span-3 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/[0.07] border border-white/15 rounded-full pl-3 pr-3.5 py-1.5 mb-4 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-[11px] font-medium text-emerald-100/90 tracking-wide">
                  Faster, secure & inclusive attendance
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-[1.12] tracking-tight mb-4">
                Transform Your Campus
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 shimmer-text">
                  Attendance
                </span>
              </h1>

              <p className="text-sm md:text-base text-emerald-100/70 max-w-xl mx-auto lg:mx-0 mb-6 leading-relaxed">
                MarkWise provides a comprehensive, secure, and intuitive
                solution for managing campus attendance efficiently — from
                classrooms to virtual lectures.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <Link
                  href="/admin/school-admin/register"
                  className="group relative inline-flex items-center gap-2 bg-gradient-to-r from-emerald-400 to-teal-400 text-[#0a1f1a] hover:from-emerald-300 hover:to-teal-300 h-11 px-6 rounded-lg font-semibold text-xs transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-400/40 hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto justify-center"
                >
                  <span>Request institution onboarding</span>
                  <svg
                    className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 h-11 px-6 rounded-lg font-semibold text-xs border border-white/25 text-emerald-100 hover:bg-white/10 hover:border-white/40 hover:text-white transition-all w-full sm:w-auto justify-center backdrop-blur-sm"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Book a Demo
                </Link>
              </div>

              {/* Impact Badges */}
              <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-2.5">
                {[
                  { icon: "✓", text: "Secure by default", color: "text-emerald-300" },
                  { icon: "✓", text: "Zero hardware", color: "text-teal-300" },
                  { icon: "✓", text: "Offline resilient", color: "text-green-300" },
                  { icon: "✓", text: "Real-time tracking", color: "text-emerald-200" },
                ].map((badge, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 bg-white/[0.07] border border-white/12 rounded-full px-3.5 py-1.5 backdrop-blur-md"
                  >
                    <span className={`${badge.color} text-xs font-bold`}>
                      {badge.icon}
                    </span>
                    <span className="text-[11px] font-medium text-emerald-100/80">
                      {badge.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── Right: Animated Feature Showcase ───────────────── */}
            <div
              className="lg:col-span-2 relative mx-auto w-full max-w-sm lg:max-w-none"
              onMouseEnter={() => setIsHeroHovered(true)}
              onMouseLeave={() => setIsHeroHovered(false)}
            >
              {/* Outer glow pulse */}
              <div className="absolute -inset-5 bg-gradient-to-br from-emerald-400/20 via-teal-400/10 to-cyan-400/20 rounded-[2rem] blur-2xl pulse-glow pointer-events-none" />

              {/* Main glassmorphic card */}
              <div className="relative rounded-2xl border border-white/15 bg-white/[0.08] backdrop-blur-xl shadow-2xl p-6 overflow-hidden">
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />

                {/* Inner glow corner */}
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

                {/* Header row */}
                <div className="relative flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-100/60">
                      Powerful Features
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-1">
                    <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                      Active
                    </span>
                  </span>
                </div>

                {/* Slides */}
                <div className="relative grid min-h-[150px]">
                  {HERO_SHOWCASE_FEATURES.map((feature, index) => (
                    <div
                      key={feature.title}
                      className={`[grid-area:1/1] transition-all duration-600 ease-out ${
                        index === activeFeatureIndex
                          ? "opacity-100 translate-x-0 scale-100"
                          : "opacity-0 translate-x-4 scale-[0.97] pointer-events-none"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon tile */}
                        <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400/30 to-teal-400/15 border border-emerald-400/25 flex items-center justify-center text-2xl shadow-inner">
                          {feature.icon}
                        </div>
                        {/* Text content */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-white mb-1 leading-snug">
                            {feature.title}
                          </h3>
                          <p className="text-emerald-100/70 text-xs leading-relaxed">
                            {feature.description}
                          </p>
                          {/* Stat row */}
                          <div className="flex items-baseline gap-1.5 mt-3">
                            <span className="text-[28px] font-bold bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent leading-none">
                              {feature.stat}
                            </span>
                            <span className="text-[11px] text-emerald-100/50 font-medium">
                              {feature.statLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress dots */}
                <div className="relative flex items-center gap-1.5 mt-4 pt-3 border-t border-white/10">
                  {HERO_SHOWCASE_FEATURES.map((feature, index) => (
                    <button
                      key={feature.title}
                      onClick={() => setActiveFeatureIndex(index)}
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        index === activeFeatureIndex
                          ? "w-8 bg-gradient-to-r from-emerald-400 to-teal-400"
                          : "w-1.5 bg-white/25 hover:bg-white/45"
                      }`}
                      aria-label={`Go to ${feature.title}`}
                    />
                  ))}
                  <span className="ml-auto text-[10px] text-emerald-100/50 font-medium tabular-nums">
                    {String(activeFeatureIndex + 1).padStart(2, "0")}/
                    {String(HERO_SHOWCASE_FEATURES.length).padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* Floating badges */}
              <div className="floating-badge absolute -bottom-4 -left-4 bg-[#0d2822]/90 border border-emerald-400/25 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-xl hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔒</span>
                  <div>
                    <div className="text-[11px] font-bold text-white leading-tight">
                      End-to-end encrypted
                    </div>
                    <div className="text-[10px] text-emerald-100/50">
                      AES-256 + TLS 1.3
                    </div>
                  </div>
                </div>
              </div>
              <div className="floating-badge-delayed absolute -top-4 -right-4 bg-[#0d2822]/90 border border-teal-400/25 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-xl hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚡</span>
                  <div>
                    <div className="text-[11px] font-bold text-white leading-tight">
                      Sub-second check-in
                    </div>
                    <div className="text-[10px] text-emerald-100/50">
                      Average response time
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Curved bottom divider ─── */}
        <div className="absolute bottom-0 left-0 right-0 w-full pointer-events-none z-10">
          <svg
            viewBox="0 0 1440 80"
            preserveAspectRatio="none"
            className="w-full h-[40px] md:h-[60px]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0,48 C240,80 480,80 720,56 C960,32 1200,16 1440,40 L1440,80 L0,80 Z"
              fill="#f8faf9"
            />
            <path
              d="M0,60 C240,88 480,88 720,64 C960,40 1200,24 1440,48 L1440,80 L0,80 Z"
              fill="#f8faf9"
              opacity="0.5"
            />
          </svg>
        </div>
      </section>

      {/* ─── Features Section ─────────────────────────────────- */}
      <section id="features" className="py-10 md:py-12 px-4 bg-gradient-to-b from-sky-50 via-white to-white">
        <div className="container mx-auto">
          {/* Section header */}
          <div className="text-center mb-8">
            <span className="inline-block px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold mb-3 border border-emerald-200/60">
              Features
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2.5 tracking-tight">
              Everything You Need for Modern Attendance
            </h2>
            <p className="text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Whether your lectures are in-person or online, MarkWise adapts to
              your teaching style with specialized tools for every scenario.
            </p>
          </div>

          {/* ─── In-Person Features ────────────────────────────── */}
          <div className="mb-8">
            {/* Section label */}
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl w-10 h-10 flex items-center justify-center text-lg shadow-md shadow-emerald-500/20 shrink-0">
                📱
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-800 mb-0.5 tracking-tight">
                  In-Person Attendance
                </h3>
                <p className="text-xs text-slate-500">
                  For physical classes — BLE, QR, PIN, lecturer-assisted, and
                  relay mesh coverage.
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                6 methods
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {IN_PERSON_FEATURES.map((feature, index) => {
                const cardId = `in-person-${index}`;
                const isAnimated = visibleCards.has(cardId);
                return (
                  <div
                    key={index}
                    data-card-id={cardId}
                    className={`group relative bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-500 ${feature.accent} ${feature.glow} ${
                      isAnimated
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-6"
                    }`}
                    style={{ transitionDelay: `${index * 80}ms` }}
                  >
                    {/* Hover top accent */}
                    <div className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-xl bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 group-hover:to-transparent transition-all duration-500 ${feature.bar}`} />

                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center text-lg mb-3 group-hover:scale-110 transition-transform shadow-sm ${feature.iconShadow} relative`}
                    >
                      {feature.icon}
                      {isAnimated && (
                        <svg
                          className={`absolute -top-1.5 -right-1.5 w-4 h-4 ${feature.check}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          style={{
                            strokeDasharray: 24,
                            animation: "checkmarkDraw 0.6s ease-out 0.3s both",
                          }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>

                    <h4 className={`text-sm font-bold text-slate-800 mb-1.5 transition-colors tracking-tight ${feature.text}`}>
                      {feature.title}
                    </h4>
                    <p className="text-slate-500 leading-relaxed text-xs">
                      {feature.description}
                    </p>

                    {/* Arrow indicator */}
                    <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5">
                      <svg
                        className={`w-3.5 h-3.5 text-slate-300 ${feature.arrow}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 8l4 4m0 0l-4 4m4-4H7"
                        />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Online Features ─────────────────────────────── */}
          <div>
            {/* Section label */}
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-gradient-to-br from-teal-400 to-green-500 rounded-xl w-10 h-10 flex items-center justify-center text-lg shadow-md shadow-teal-500/20 shrink-0">
                💻
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-800 mb-0.5 tracking-tight">
                  Online Attendance
                </h3>
                <p className="text-xs text-slate-500">
                  For virtual lectures — live tracking, seamless video
                  integration.
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2.5 py-1">
                6 layers
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ONLINE_FEATURES.map((feature, index) => {
                const cardId = `online-${index}`;
                const isAnimated = visibleCards.has(cardId);
                return (
                  <div
                    key={index}
                    data-card-id={cardId}
                    className={`group relative bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-500 ${feature.accent} ${feature.glow} ${
                      isAnimated
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-6"
                    }`}
                    style={{ transitionDelay: `${index * 80 + 300}ms` }}
                  >
                    {/* Hover top accent */}
                    <div className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-xl bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 group-hover:to-transparent transition-all duration-500 ${feature.bar}`} />

                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center text-lg mb-3 group-hover:scale-110 transition-transform shadow-sm ${feature.iconShadow} relative`}
                    >
                      {feature.icon}
                      {isAnimated && (
                        <svg
                          className={`absolute -top-1.5 -right-1.5 w-4 h-4 ${feature.check}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          style={{
                            strokeDasharray: 24,
                            animation: "checkmarkDraw 0.6s ease-out 0.3s both",
                          }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>

                    <h4 className={`text-sm font-bold text-slate-800 mb-1.5 transition-colors tracking-tight ${feature.text}`}>
                      {feature.title}
                    </h4>
                    <p className="text-slate-500 leading-relaxed text-xs">
                      {feature.description}
                    </p>

                    {/* Arrow indicator */}
                    <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5">
                      <svg
                        className={`w-3.5 h-3.5 text-slate-300 ${feature.arrow}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 8l4 4m0 0l-4 4m4-4H7"
                        />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="py-10 md:py-12 px-4 bg-gradient-to-b from-white via-sky-50/60 to-white border-y border-sky-100 relative overflow-hidden"
      >
        {/* Subtle background accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-sky-100/60 rounded-full blur-[100px] pointer-events-none" />

        <div className="container mx-auto relative z-10">
          <div className="text-center mb-8">
            <span className="inline-block px-3.5 py-1.5 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold mb-3 border border-teal-200/60">
              Getting Started
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2.5 tracking-tight">
              Dead Simple. Powerful Results.
            </h2>
            <p className="text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed">
              MarkWise simplifies attendance management in three effortless
              steps. No training, no hardware — just fast, secure and accurate
              check-ins for every lecture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative max-w-4xl mx-auto">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-11 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-emerald-200 via-teal-300 to-green-200" />

            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <div
                key={index}
                className="relative bg-slate-50/80 rounded-xl p-5 text-center hover:shadow-lg transition-all hover:-translate-y-1 border border-slate-200/60 hover:border-teal-300/50 group"
              >
                {/* Step icon */}
                <div className="relative inline-block">
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center text-lg mx-auto relative z-10 shadow-md group-hover:scale-110 transition-transform`}
                  >
                    {step.icon}
                  </div>
                  <div
                    className={`absolute inset-0 rounded-full ${step.glowColor} blur-xl opacity-70 group-hover:opacity-100 transition-opacity`}
                  />
                </div>

                {/* Step number */}
                <div className="text-[11px] font-bold text-teal-600 mb-1.5 mt-3 tracking-wider">
                  STEP {step.number}
                </div>

                <h3 className="text-[15px] font-bold text-slate-800 mb-2 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {step.description}
                </p>

                {/* Bottom accent */}
                <div
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[2px] rounded-full bg-gradient-to-r ${step.gradient} opacity-60 group-hover:opacity-100 group-hover:w-20 transition-all duration-500`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ────────────────────────────────────── */}
      <section className="py-12 md:py-14 px-4 bg-[#0a1f1a] relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1f1a] via-[#0f2d26] to-[#1a3d3a]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[650px] h-[300px] bg-emerald-400/10 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-teal-500/8 rounded-full blur-[100px] pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-xl mx-auto">
            {/* Badge */}
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-emerald-100 text-xs font-semibold mb-3.5 border border-white/15 backdrop-blur-md">
              🚀 Ready to Transform?
            </span>

            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
              Start Managing Attendance{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                the Smart Way
              </span>
            </h2>
            <p className="text-sm text-emerald-100/70 mb-6 leading-relaxed">
              Get your institution set up with layered, offline-resilient
              attendance in-person and online.
            </p>
            <Link
              href="/admin/school-admin/register"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-emerald-400 to-teal-400 text-[#0a1f1a] hover:from-emerald-300 hover:to-teal-300 h-12 px-7 rounded-lg font-bold text-sm transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-400/40 hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Request institution onboarding
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <AppFooter />
    </div>
  );
};

export default HomePage;