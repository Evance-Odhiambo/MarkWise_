"use client";
import React from "react";
import Link from "next/link";
import LogoIcon from "./LogoIcon";

const AppFooter: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Description */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <LogoIcon className="w-10 h-10" />
              <h3 className="text-xl font-bold text-white">MarkWise</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Digitised attendance for higher learning institutions. Fast, secure, and reliable.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              Product
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/features"
                  className="hover:text-white transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/how-it-works"
                  className="hover:text-white transition-colors"
                >
                  How it Works
                </Link>
              </li>
              <li>
                <Link
                  href="/setup"
                  className="hover:text-white transition-colors"
                >
                  Academic Setup
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="hover:text-white transition-colors"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/about"
                  className="hover:text-white transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="hover:text-white transition-colors"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="hover:text-white transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-white transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Social */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              Legal
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/terms"
                  className="hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="hover:text-white transition-colors"
                >
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/security"
                  className="hover:text-white transition-colors"
                >
                  Security
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 mt-8 pt-6 text-center text-sm text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} MarkWise. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
