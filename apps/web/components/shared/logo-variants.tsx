"use client";

import { Logo } from "./logo";

interface LogoVariantsProps {
  showAll?: boolean;
  className?: string;
}

export function LogoVariants({
  showAll = false,
  className = "",
}: LogoVariantsProps) {
  if (showAll) {
    return (
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 p-8 ${className}`}
      >
        {/* Default */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h4 className="text-sm font-semibold text-gray-400 mb-6">Default</h4>
          <Logo variant="default" size={48} />
        </div>

        {/* Light */}
        <div className="bg-linear-to-br from-gray-900 to-gray-800 rounded-2xl p-8 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-400 mb-6">Light</h4>
          <Logo variant="light" size={48} />
        </div>

        {/* Dark */}
        <div className="bg-gray-50 rounded-2xl p-8 shadow-sm border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-400 mb-6">Dark</h4>
          <Logo variant="dark" size={48} />
        </div>

        {/* Minimal */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-400 mb-6">Minimal</h4>
          <Logo variant="minimal" size={48} />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-8 ${className}`}>
      <Logo variant="default" />
      <Logo variant="light" />
      <Logo variant="dark" />
      <Logo variant="minimal" />
    </div>
  );
}

export default LogoVariants;


