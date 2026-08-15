"use client";
import React, { useState } from "react";
import Link from "next/link";
import RoleModal from "./RoleModal";
import Logo from "./Logo";

const AppHeader: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"signin" | "signup">("signin");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const openModal = (mode: "signin" | "signup") => {
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <header className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-gray-100 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Logo size={40} />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2 lg:space-x-4">
            <Link
              href="#features"
              className="px-4 py-2 rounded-xl text-gray-700 hover:text-gray-900 hover:bg-green-50 font-medium text-base transition-all duration-200"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="px-4 py-2 rounded-xl text-gray-700 hover:text-gray-900 hover:bg-green-50 font-medium text-base transition-all duration-200"
            >
              How it Works
            </Link>
            <Link
              href="/about"
              className="px-4 py-2 rounded-xl text-gray-700 hover:text-gray-900 hover:bg-green-50 font-medium text-base transition-all duration-200"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="px-4 py-2 rounded-xl text-gray-700 hover:text-gray-900 hover:bg-green-50 font-medium text-base transition-all duration-200"
            >
              Contact
            </Link>
          </nav>

          {/* Auth Buttons / Mobile Menu */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Desktop Auth */}
            <div className="hidden md:flex items-center gap-4">
              <button
                type="button"
                onClick={() => openModal("signin")}
                className="text-gray-700 hover:text-green-700 font-medium text-base px-4 py-2 rounded-xl hover:bg-green-50 transition-all duration-200"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => openModal("signup")}
                className="bg-linear-to-r from-green-600 to-teal-700 hover:from-green-700 hover:to-teal-800 text-white py-2 px-6 rounded-xl font-medium text-base transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Sign Up
              </button>
            </div>

            {/* Mobile Hamburger */}
            <div className="md:hidden shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-gray-700 hover:bg-green-50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label="Toggle menu"
                aria-expanded={isMobileMenuOpen}
              >
                <span className="block w-5 h-0.5 bg-gray-700 mb-1 transition-all"></span>
                <span className="block w-5 h-0.5 bg-gray-700 mb-1 transition-all"></span>
                <span className="block w-5 h-0.5 bg-gray-700 transition-all"></span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 shadow-lg absolute left-0 right-0 top-full z-30">
            <div className="container mx-auto px-4 py-3 space-y-1">
              <Link
                href="#features"
                className="block py-3 px-4 text-gray-700 hover:text-gray-900 hover:bg-green-50 font-medium text-base rounded-xl transition-all duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="block py-3 px-4 text-gray-700 hover:text-gray-900 hover:bg-green-50 font-medium text-base rounded-xl transition-all duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                How it Works
              </Link>
              <Link
                href="/about"
                className="block py-3 px-4 text-gray-700 hover:text-gray-900 hover:bg-green-50 font-medium text-base rounded-xl transition-all duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/contact"
                className="block py-3 px-4 text-gray-700 hover:text-gray-900 hover:bg-green-50 font-medium text-base rounded-xl transition-all duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact
              </Link>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    openModal("signin");
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex-1 text-gray-700 hover:text-green-700 font-medium text-base py-2 border border-gray-300 rounded-xl transition-all duration-200"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openModal("signup");
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex-1 bg-linear-to-r from-green-600 to-teal-700 hover:from-green-700 hover:to-teal-800 text-white font-medium text-base py-2 rounded-xl transition-all duration-200"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        )}
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
