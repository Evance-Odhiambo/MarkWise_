"use client";

import Link from "next/link";
import { LogoIcon } from "./LogoIcon";
import { useState } from "react";

interface LogoProps {
  showText?: boolean;
  size?: number;
  variant?: "default" | "light" | "dark" | "minimal";
  animated?: boolean;
  className?: string;
}

export function Logo({ 
  showText = true, 
  size = 32, 
  variant = "default",
  animated = false,
  className = ""
}: LogoProps) {
  const [isHovered, setIsHovered] = useState(false);

  const textColors = {
    default: "text-gray-900 group-hover:text-emerald-600",
    light: "text-white group-hover:text-emerald-200",
    dark: "text-gray-900 group-hover:text-emerald-600",
    minimal: "text-gray-900 group-hover:text-emerald-600",
  };

  const subtitleColors = {
    default: "text-gray-500",
    light: "text-white/60",
    dark: "text-gray-500",
    minimal: "text-gray-400",
  };

  return (
    <Link 
      href="/" 
      className={`inline-flex items-center gap-4 group transition-transform duration-300 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="transition-transform duration-300 group-hover:scale-[1.04] group-hover:-rotate-1">
        <LogoIcon 
          size={size} 
          variant={variant}
          animated={animated}
          isHovered={isHovered}
        />
      </div>
      
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`text-2xl font-bold tracking-tight transition-colors duration-300 ${textColors[variant]}`}>
            Mark<span className="text-emerald-600">Wise</span>
          </span>
          <p className={`text-[10px] font-medium tracking-[0.25em] uppercase transition-colors duration-300 ${subtitleColors[variant]}`}>
            Attendance Intelligence
          </p>
        </div>
      )}
    </Link>
  );
}

export default Logo;