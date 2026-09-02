"use client";
import React from "react";
import Link from "next/link";
import { BrandMarkGlyph } from "@/components/shared/brand-mark";

const AppFooter: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="container mx-auto px-4 sm:px-6 py-8 text-[11px]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Brand & Description */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <BrandMarkGlyph size={24} />
              <h3 className="text-sm font-bold text-white">MarkWise</h3>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Digitised attendance for higher learning institutions. Fast,
              secure, and reliable.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold mb-2.5 text-[10px] uppercase tracking-wider">
              Product
            </h4>
            <ul className="space-y-1.5">
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
            <h4 className="text-white font-semibold mb-2.5 text-[10px] uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-1.5">
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
            <h4 className="text-white font-semibold mb-2.5 text-[10px] uppercase tracking-wider">
              Legal
            </h4>
            <ul className="space-y-1.5">
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
        <div className="border-t border-slate-800 mt-6 pt-4 text-center text-[10px] text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} MarkWise. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
