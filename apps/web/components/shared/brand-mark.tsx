"use client";

import Link from "next/link";

interface BrandMarkGlyphProps {
  size?: number;
  className?: string;
}

/**
 * Just the placeholder shape, no wordmark — for spots (like the footer)
 * that already render their own "MarkWise" text next to it. Deliberately
 * plain/geometric rather than another elaborate custom icon, so it reads as
 * a placeholder standing in until the real designed logo is ready, not as a
 * second finished logo to redesign around.
 */
export function BrandMarkGlyph({ size = 40, className = "" }: BrandMarkGlyphProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-xl bg-emerald-600 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

interface BrandMarkProps {
  size?: number;
  className?: string;
}

/**
 * Full lockup (placeholder glyph + wordmark) for the header.
 */
export function BrandMark({ size = 40, className = "" }: BrandMarkProps) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-3 group ${className}`}
    >
      <span className="transition-transform duration-200 group-hover:scale-105">
        <BrandMarkGlyph size={size} />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-base font-bold tracking-tight text-gray-900 transition-colors duration-200 group-hover:text-emerald-600">
          Mark<span className="text-emerald-600">Wise</span>
        </span>
        <span className="text-[8px] font-medium uppercase tracking-[0.2em] text-gray-500">
          Attendance Intelligence
        </span>
      </span>
    </Link>
  );
}

export default BrandMark;
