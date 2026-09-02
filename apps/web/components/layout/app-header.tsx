"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import RoleModal from "./role-modal";
import BrandMark from "@/components/shared/brand-mark";

const AppHeader: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"signin" | "signup">("signin");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Detect scroll for dynamic shadow/border
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const openModal = (mode: "signin" | "signup") => {
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Nav links data for DRY
  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How it Works" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-all duration-300 bg-gradient-to-b ${
          scrolled
            ? "from-sky-50/95 via-white/95 to-white/95 backdrop-blur-md shadow-sm border-b border-sky-200/50"
            : "from-sky-50/80 via-white/75 to-white/70 backdrop-blur-sm border-b border-transparent"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2 transition-transform duration-300 hover:scale-[1.02]">
            <BrandMark size={32} />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group relative px-3.5 py-2 rounded-lg text-slate-600 hover:text-emerald-700 font-medium text-xs transition-colors duration-200 overflow-hidden"
              >
                {/* Background sweep */}
                <span className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-teal-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                {/* Sliding underline */}
                <span className="absolute bottom-0.5 left-3.5 right-3.5 h-[1.5px] bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
                <span className="relative z-10">{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* Auth Buttons / Mobile Menu */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Desktop Auth */}
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => openModal("signin")}
                className="group relative text-slate-600 hover:text-emerald-700 font-medium text-xs px-4 py-2 rounded-lg transition-colors duration-200 overflow-hidden"
              >
                <span className="absolute inset-0 bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                <span className="absolute bottom-0.5 left-4 right-4 h-[1.5px] bg-emerald-500 rounded-full origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
                <span className="relative z-10">Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => openModal("signup")}
                className="group relative inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white h-9 px-5 rounded-lg font-medium text-xs shadow-sm transition-all duration-300 overflow-hidden hover:shadow-md hover:shadow-emerald-500/25 hover:-translate-y-[1px]"
              >
                {/* Shine effect on hover */}
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:left-[100%] transition-all duration-700 ease-out" />
                </span>
                <span className="relative z-10">Sign Up</span>
                <svg
                  className="relative z-10 w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
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
              </button>
            </div>

            {/* Mobile Hamburger */}
            <div className="md:hidden shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="relative p-2 rounded-lg text-slate-700 hover:bg-emerald-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                aria-label="Toggle menu"
                aria-expanded={isMobileMenuOpen}
              >
                <span
                  className={`block w-[18px] h-[1.5px] bg-current mb-1 transition-all duration-300 ${
                    isMobileMenuOpen
                      ? "transform rotate-45 translate-y-[3px]"
                      : ""
                  }`}
                />
                <span
                  className={`block w-[18px] h-[1.5px] bg-current mb-1 transition-all duration-300 ${
                    isMobileMenuOpen ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`block w-[18px] h-[1.5px] bg-current transition-all duration-300 ${
                    isMobileMenuOpen
                      ? "transform -rotate-45 -translate-y-[3px]"
                      : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden bg-gradient-to-b from-sky-50/95 via-white/95 to-white/95 backdrop-blur-md border-t border-sky-200/50 shadow-xl absolute left-0 right-0 top-full z-30 overflow-hidden transition-all duration-300 ease-out ${
            isMobileMenuOpen
              ? "max-h-[500px] opacity-100 translate-y-0"
              : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          <div className="container mx-auto px-4 py-3 space-y-1">
            {navLinks.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                className="group relative block py-2.5 px-3.5 text-slate-600 hover:text-emerald-700 font-medium text-xs rounded-lg transition-all duration-200 overflow-hidden"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ transitionDelay: `${index * 30}ms` }}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-teal-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                <span className="absolute bottom-1 left-3.5 right-3.5 h-[1px] bg-emerald-500/60 rounded-full origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                <span className="relative z-10 flex items-center justify-between">
                  {link.label}
                  <svg
                    className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
              </Link>
            ))}

            {/* Mobile Auth */}
            <div className="flex gap-2.5 pt-3 pb-1.5">
              <button
                type="button"
                onClick={() => {
                  openModal("signin");
                  setIsMobileMenuOpen(false);
                }}
                className="flex-1 text-slate-700 hover:text-emerald-700 font-medium text-xs py-2.5 border border-slate-300 hover:border-emerald-400 rounded-lg transition-all duration-200 hover:bg-emerald-50"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  openModal("signup");
                  setIsMobileMenuOpen(false);
                }}
                className="group relative flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium text-xs py-2.5 rounded-lg transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-emerald-500/25 overflow-hidden"
              >
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:left-[100%] transition-all duration-700 ease-out" />
                </span>
                <span className="relative z-10">Sign Up</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <RoleModal
        isOpen={isModalOpen}
        onClose={closeModal}
        mode={modalMode}
        onModeChange={setModalMode}
      />
    </>
  );
};

export default AppHeader;