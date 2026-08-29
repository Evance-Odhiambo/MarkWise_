"use client";

import type { SVGProps } from "react";

interface LogoIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  variant?: "default" | "light" | "dark" | "minimal";
  animated?: boolean;
  isHovered?: boolean;
}

export function LogoIcon({
  size = 32,
  variant = "default",
  animated = false,
  isHovered = false,
  ...props
}: LogoIconProps) {
  const colors = {
    default: {
      primary: "#10B981",
      secondary: "#059669",
      tertiary: "#047857",
      accent: "#6366F1",
      gradientStart: "#10B981",
      gradientEnd: "#06B6D4",
    },
    light: {
      primary: "#FFFFFF",
      secondary: "#E0E7FF",
      tertiary: "#C7D2FE",
      accent: "#A5B4FC",
      gradientStart: "#FFFFFF",
      gradientEnd: "#CBD5E1",
    },
    dark: {
      primary: "#059669",
      secondary: "#047857",
      tertiary: "#065F46",
      accent: "#4F46E5",
      gradientStart: "#059669",
      gradientEnd: "#0891B2",
    },
    minimal: {
      primary: "#1E293B",
      secondary: "#334155",
      tertiary: "#475569",
      accent: "#6366F1",
      gradientStart: "#1E2931",
      gradientEnd: "#475569",
    },
  };

  const color = colors[variant];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      {...props}
    >
      <defs>
        <linearGradient
          id="markwiseGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor={color.gradientStart} />
          <stop offset="100%" stopColor={color.gradientEnd} />
        </linearGradient>

        <linearGradient id="markwiseAccent" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color.accent} />
          <stop offset="100%" stopColor={color.primary} />
        </linearGradient>

        <filter id="markwiseGlow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="markwiseShadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
        </filter>
      </defs>

      <g filter="url(#markwiseShadow)">
        <path
          d="M32 2C16 2 2 12 2 12V24C2 40 16 56 32 62C48 56 62 40 62 24V12C62 12 48 2 32 2Z"
          fill={variant === "minimal" ? "none" : "url(#markwiseGradient)"}
          stroke={variant === "minimal" ? color.primary : "none"}
          strokeWidth={variant === "minimal" ? "2.5" : "0"}
        />

        {variant !== "minimal" && (
          <path
            d="M32 8C20 8 8 15.5 8 15.5V24C8 37.5 19 51 32 56C45 51 56 37.5 56 24V15.5C56 15.5 44 8 32 8Z"
            stroke="white"
            strokeOpacity="0.12"
            strokeWidth="1.5"
            fill="none"
          />
        )}
      </g>

      <g>
        <path
          d="M24 28L32 34L40 28"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        <path
          d="M32 22V40"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={animated && isHovered ? "0" : "2 2"}
          className={`transition-all duration-300 ${animated && isHovered ? "opacity-100" : "opacity-60"}`}
        />
      </g>

      <path
        d="M38 20L30 28L26 24"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter={animated && isHovered ? "url(#markwiseGlow)" : "none"}
        className={`transition-all duration-300 ${animated && isHovered ? "scale-110" : "scale-100"}`}
      />

      {variant !== "minimal" && (
        <>
          <circle cx="48" cy="16" r="3" fill={color.accent} opacity="0.6">
            <animate
              attributeName="r"
              values="3;4;3"
              dur="3s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.6;0.9;0.6"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>

          <circle
            cx="48"
            cy="16"
            r="6"
            fill="none"
            stroke={color.accent}
            strokeWidth="1"
            opacity="0.3"
          >
            <animate
              attributeName="r"
              values="6;8;6"
              dur="3s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.3;0;0.3"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>

          <circle
            cx="12"
            cy="48"
            r="2.5"
            fill="url(#markwiseAccent)"
            opacity="0.7"
          />
          <circle cx="52" cy="48" r="2" fill="white" opacity="0.15" />
          <circle cx="52" cy="12" r="2" fill="white" opacity="0.15" />
        </>
      )}
    </svg>
  );
}

export default LogoIcon;
