"use client";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import Link from "next/link";
import { useState, useEffect } from "react";

// ─── Feature Data ────────────────────────────────────────────
const IN_PERSON_FEATURES = [
  {
    icon: "⚡",
    title: "Instant BLE Detection",
    description:
      "Bluetooth Low Energy automatically detects which students are physically present — no action required.",
    color: "from-green-500 to-teal-600",
  },
  {
    icon: "📱",
    title: "QR Code Check-in",
    description:
      "Students scan a unique QR code from the lecturer or already marked students for fast, secure attendance capture.",
    color: "from-green-500 to-teal-600",
  },
  {
    icon: "🔢",
    title: "Manual PIN Entry",
    description:
      "Students enter a session-specific PIN on their phone — simple, fast, and works with any device. Suitable where student device doesn't support BLE or QR scanning.",
    color: "from-green-500 to-teal-600",
  },
  {
    icon: "👤",
    title: "Lecturer Assisted",
    description:
      "Lecturers can manually mark students present directly from their device- perfect for studennts without smartphones or in case of technical issues.",
    color: "from-green-500 to-teal-600",
  },  
  {
    icon: "🌐",
    title: "Self-Extending Relay Mesh",
    description:
      "Our system self-extends its BLE/QR/PIN coverage through a relay mesh network — devices in the room act as relays, extending the detection range across all three methods seamlessly.",
    color: "from-green-500 to-teal-600",
  },
  {
    icon: "🔒",
    title: "Offline First",
    description:
      "No internet? No problem. In-person attendance is recorded locally and syncs automatically when online.",
    color: "from-green-500 to-teal-600",
  },
];

const ONLINE_FEATURES = [
  {
    icon: "💻",
    title: "Live Session Tracking",
    description:
      "Real-time dashboard shows who's marked present, who's left, and who's missing — as it happens.",
    color: "from-green-500 to-teal-600",
  },
  {
    icon: "🔗",
    title: "Shareable Links",
    description:
      "Lecturers generate unique, secure links that students tap to instantly join the attendance session — no app download needed on desktop.",
    color: "from-green-500 to-teal-600",
  },
  {
    icon: "📱",
    title: "Seamless Mobile Handoff",
    description:
      "On mobile, links automatically open the MarkWise app via deep linking, submit attendance with secure credentials, and show instant confirmation.",
    color: "from-green-500 to-teal-600",
  },
  {
    icon: "🔐",
    title: "Passwordless WebAuthn",
    description:
      "On desktop, students authenticate via Touch ID, Face ID, Windows Hello, or passkeys — secure, phishing-resistant, and frictionless.",
    color: "from-green-500 to-teal-600",
  },
  {
    icon: "🛡️",
    title: "Multi-Layer Proxy Protection",
    description:
      "IP address checks, device ID verification, WebAuthn counters, and browser fingerprints block proxy attendance and replay attacks.",
    color: "from-green-500 to-teal-600",
  },
  {
    icon: "🎥",
    title: "Video Platform Integration",
    description:
      "Works seamlessly with Zoom, Teams, Google Meet, and more — share links directly in chat for instant check-in.",
    color: "from-green-500 to-teal-600",
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    icon: "📝",
    title: "Start Attendance Session",
    description:
      "Lecturer launches a session in seconds. Students get instant secure access — no setup, no queues, just go.",
    number: "01",
  },
  {
    icon: "📚",
    title: "Mark Attendance",
    description:
      "Students check in with a single tap using BLE, QR, or PIN. Lecturers see who's present live — no more guessing or chasing students after class.",
    number: "02",
  },
  {
    icon: "📱",
    title: "Instant Check-in",
    description:
      "Attendance recorded in real time, synced automatically when online. Students get instant confirmation, and lecturers leave class with clean reports — every time.",
    number: "03",
  },
];

const TESTIMONIALS = [
  {
    quote: "MarkWise has completely transformed how we manage attendance. Our lecturers save 5+ hours every week — hours they now spend on actual teaching.",
    author: "Dr. Lawrence Nderu",
    role: "Head of Computer Sciences",
    institution: "Jomo Kenyatta University of Agriculture and Technology",
  },
  {
    quote: "Switching from paper sheets to MarkWise was instant. The check-in takes seconds, and we've cut attendance time by 90%.",
    author: "Prof. Michael Chen",
    role: "Dean of Academics",
    institution: "Oxford University",
  },
  {
    quote: "Students love the convenience, and I love the real-time dashboard. I can see exactly who's present before the lecture even starts.",
    author: "Eng. Emily Rodriguez",
    role: "Head of Student Services",
    institution: "Stanford University",
  },
];

const STATS = [
  { value: "99.9%", label: "Successful check-ins" },
  { value: "< 30s", label: "Average check-in time" },
  { value: "10x", label: "Faster than paper roll calls" },
  { value: "1M+", label: "Records processed" },
];

// ─── HomePage Component ─────────────────────────────────────
const HomePage: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const [activeFlowStep, setActiveFlowStep] = useState(0);
  const [activeMode, setActiveMode] = useState<"in-person" | "online">("in-person");

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const cardId = entry.target.getAttribute('data-card-id');
          if (cardId) {
            setVisibleCards(prev => new Set(prev).add(cardId));
          }
        }
      });
    }, { threshold: 0.3 });

    const cards = document.querySelectorAll('[data-card-id]');
    cards.forEach(card => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveFlowStep((prev) => (prev + 1) % 3);
    }, 2200);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-b from-slate-50 to-white">
      <AppHeader />

      {/* ─── Hero Section ───────────────────────────────────── */}
      <section className="relative overflow-hidden bg-linear-to-br from-emerald-600 via-emerald-700 to-indigo-800 py-20 px-4">
        {/* Decorative Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-400 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-indigo-400 rounded-full blur-3xl opacity-30" />
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `radial-gradient(circle at 20px 20px, white 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />

        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 border border-white/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-sm font-medium text-white/90">
                🎯 Faster, secure and inclusive.
              </span>
            </div>

            <h1 
              className={`text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight mb-6 transition-all duration-700 ${
                isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'
              }`}
            >
              Transform Your Campus
              <span className="block text-emerald-200">Attendance</span>
            </h1>

            <p 
              className={`text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 transition-all duration-700 delay-100 ${
                isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'
              }`}
            >
              MarkWise provides a comprehensive, secure, and intuitive solution for 
              managing campus attendance efficiently — from classrooms to virtual lectures.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/system-admin/register"
                className="group relative inline-flex items-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5"
              >
                <span>Get Started Free</span>
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-white/30 text-white hover:bg-white/10 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Book a  Demo
              </Link>
            </div>

            {/* ─── Stats ──────────────────────────────────────── */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
              {STATS.map((stat, index) => (
                <div 
                  key={index}
                  className={`bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 transition-all duration-700 delay-${index * 100} ${
                    isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'
                  }`}
                >
                  <div className="text-2xl md:text-3xl font-bold text-white">
                    {stat.value}
                  </div>
                  <div className="text-sm text-white/60 font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* ─── Impact Badges ────────────────────────────────────── */}
            <div className="mt-16 flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                <span className="text-green-300 text-xl">✓</span>
                <span className="text-sm font-medium text-white">Secure by default</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                <span className="text-blue-300 text-xl">✓</span>
                <span className="text-sm font-medium text-white">Zero hardware</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                <span className="text-purple-300 text-xl">✓</span>
                <span className="text-sm font-medium text-white">Offline resilient</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                <span className="text-amber-300 text-xl">✓</span>
                <span className="text-sm font-medium text-white">Real-time tracking</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120H360C240 120 120 120 60 120H0Z" fill="#F8FAFC" />
          </svg>
        </div>
      </section>

      {/* ─── Features Section ─────────────────────────────────- */}
      <section id="features" className="py-20 px-4 bg-slate-100">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-4">
              Features
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Everything You Need for Modern Attendance
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Whether your lectures are in-person or online, MarkWise adapts to your teaching style with specialized tools for every scenario.
            </p>
          </div>

          {/* ─── In-Person Features ────────────────────────────── */}
          <div className="mb-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-linear-to-br from-green-500 to-green-600 rounded-xl w-14 h-14 flex items-center justify-center text-3xl shadow-lg">
                📱
              </div>
              <div>
                <h3 className="text-3xl font-bold text-slate-900 mb-1">In-Person Attendance</h3>
                <p className="text-slate-600">For physical classes — BLE, QR, PIN, lecturer-assisted, and relay mesh coverage.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {IN_PERSON_FEATURES.map((feature, index) => {
                const cardId = `in-person-${index}`;
                const isAnimated = visibleCards.has(cardId);
                return (
                  <div
                    key={index}
                    data-card-id={cardId}
                    className={`group relative bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-500 border-2 border-slate-200 hover:border-green-300 ${
                      isAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                    style={{ transitionDelay: `${index * 100}ms` }}
                  >
                    <div className={`w-16 h-16 rounded-2xl bg-linear-to-br ${feature.color} flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-lg relative`}>
                      {feature.icon}
                      {isAnimated && (
                        <svg 
                          className="absolute -top-1 -right-1 w-5 h-5 text-green-500"
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          style={{
                            animation: 'checkmarkDraw 0.6s ease-out 0.3s both'
                          }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <h4 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-green-700 transition-colors">
                      {feature.title}
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-base">
                      {feature.description}
                    </p>
                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H7" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Online Features ─────────────────────────────── */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-linear-to-br from-green-500 to-teal-600 rounded-xl w-14 h-14 flex items-center justify-center text-3xl shadow-lg">
                💻
              </div>
              <div>
                <h3 className="text-3xl font-bold text-slate-900 mb-1">Online Attendance</h3>
                <p className="text-slate-600">For virtual lectures — live tracking, seamless video integration.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {ONLINE_FEATURES.map((feature, index) => {
                const cardId = `online-${index}`;
                const isAnimated = visibleCards.has(cardId);
                return (
                  <div
                    key={index}
                    data-card-id={cardId}
                    className={`group relative bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-500 border-2 border-slate-200 hover:border-green-300 ${
                      isAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                    style={{ transitionDelay: `${index * 100 + 300}ms` }}
                  >
                    <div className={`w-16 h-16 rounded-2xl bg-linear-to-br ${feature.color} flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-lg relative`}>
                      {feature.icon}
                      {isAnimated && (
                        <svg 
                          className="absolute -top-1 -right-1 w-5 h-5 text-green-500"
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          style={{
                            animation: 'checkmarkDraw 0.6s ease-out 0.3s both'
                          }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <h4 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-green-700 transition-colors">
                      {feature.title}
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-base">
                      {feature.description}
                    </p>
                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H7" />
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
      <section id="how-it-works" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-semibold mb-4">
              Getting Started
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Dead Simple. Powerful Results.
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              MarkWise simplifies attendance management in three effortless steps. No training, no hardware — just fast, secure and accurate check-ins for every lecture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-20 left-1/6 right-1/6 h-0.5 bg-linear-to-r from-green-200 via-green-300 to-green-200" />

            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <div
                key={index}
                className="relative bg-slate-50 rounded-2xl p-8 text-center hover:shadow-xl transition-all hover:-translate-y-1 border border-slate-100"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-linear-to-br from-green-500 to-green-600 flex items-center justify-center text-2xl mx-auto mb-4 relative z-10">
                    {step.icon}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-green-400 opacity-20 blur-xl" />
                </div>
                <div className="text-sm font-bold text-green-600 mb-2">
                  Step {step.number}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-slate-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ────────────────────────────────────── */}
      <section className="py-20 px-4 bg-linear-to-br from-slate-50 to-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-semibold mb-4">
              What They Say
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Trusted by Leading Educators
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              See what lecturers, administrators, and institutions are achieving with MarkWise.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {TESTIMONIALS.map((testimonial, index) => (
              <div
                key={index}
                className="relative bg-white rounded-2xl p-8 shadow-md border border-slate-100 hover:shadow-xl transition-shadow"
              >
                <div className="flex text-green-400 mb-5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-slate-700 text-lg leading-relaxed mb-6 italic">
                  <span className="text-4xl text-green-200 leading-none mr-2">“</span>
                  {testimonial.quote}
                  <span className="text-4xl text-green-200 leading-none ml-2">”</span>
                </blockquote>
                <div className="border-t border-green-100 pt-4">
                  <p className="font-semibold text-green-800">{testimonial.author}</p>
                  <p className="text-sm text-slate-500">{testimonial.role}</p>
                  <p className="text-sm text-slate-400">{testimonial.institution}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ────────────────────────────────────── */}
      <section className="py-20 px-4 bg-linear-to-br from-green-800 via-green-900 to-teal-800">
        <div className="container mx-auto text-center relative">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-green-400 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 text-white text-sm font-semibold mb-4 backdrop-blur-sm">
              🚀 Ready to Transform?
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Start Managing Attendance the Smart Way
            </h2>
            <p className="text-lg text-white/80 mb-8">
              Join thousands of educators who have simplified their attendance management with MarkWise.
            </p>
            <Link
              href="/setup"
              className="inline-flex items-center gap-2 bg-white text-green-700 hover:bg-green-50 px-10 py-4 rounded-xl font-extrabold text-lg transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5"
            >
              Get Started Free
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
            <p className="text-sm text-white/60 mt-4">
              No credit card required • Free 14-day trial
            </p>
          </div>
        </div>
      </section>

      <AppFooter />
    </div>
  );
};

export default HomePage;