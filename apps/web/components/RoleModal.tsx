"use client";
import React, { Fragment, useEffect, useState, Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "signin" | "signup";
  onModeChange?: Dispatch<SetStateAction<"signin" | "signup">>;
}

const roles = [
  {
    id: "student",
    name: "Student",
    description: "Mark your own attendance and track progress",
    icon: "🎓",
    signInPath: "/student/login",
    signUpPath: "/student/register",
    gradient: "from-emerald-500 to-emerald-600",
    bgHover: "hover:bg-emerald-50",
    borderHover: "hover:border-emerald-300",
    textHover: "group-hover:text-emerald-700",
  },
  {
    id: "lecturer",
    name: "Lecturer",
    description: "Take attendance and generate reports for your classes",
    icon: "👨‍🏫",
    signInPath: "/lecturer/login",
    signUpPath: "/lecturer/register",
    gradient: "from-blue-500 to-indigo-600",
    bgHover: "hover:bg-blue-50",
    borderHover: "hover:border-blue-300",
    textHover: "group-hover:text-blue-700",
  },
  {
    id: "admin",
    name: "Institution Administrator",
    description: "Manage your institution, staff, students, and academic data",
    icon: "⚙️",
    signInPath: "/admin/institution/login",
    signUpPath: "/admin/institution/register",
    gradient: "from-violet-500 to-purple-600",
    bgHover: "hover:bg-violet-50",
    borderHover: "hover:border-violet-300",
    textHover: "group-hover:text-violet-700",
  },
];

export const RoleModal: React.FC<RoleModalProps> = ({ isOpen, onClose, mode, onModeChange }) => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSelect = (path: string) => {
    router.push(path);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !mounted) return null;

  const title = mode === "signin" ? "Welcome Back" : "Join MarkWise";
  const subtitle = mode === "signin" 
    ? "Choose your role to sign in" 
    : "Select your role to get started";

  return (
    <Fragment>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
        onClick={handleOverlayClick}
        style={{
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        {/* ─── Modal Container ────────────────────────────────── */}
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-auto overflow-hidden transform transition-all"
          style={{
            animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            maxHeight: '90vh',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ─── Header ────────────────────────────────────────── */}
          <div className="relative p-6 pb-4">
            {/* Decorative Gradient Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-400 via-blue-400 to-violet-400" />
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all duration-200"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-100 to-emerald-50 flex items-center justify-center mb-3">
              <span className="text-2xl">👋</span>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-extrabold text-slate-900">
              {title}
            </h2>
            
            {/* Subtitle */}
            <p className="text-sm font-semibold text-slate-500 mt-1">
              {subtitle}
            </p>
          </div>

          {/* ─── Role Cards ────────────────────────────────────── */}
          <div className="px-6 pb-6 space-y-3">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleSelect(mode === "signin" ? role.signInPath : role.signUpPath)}
                className={`
                  w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-200 
                  ${role.bgHover} ${role.borderHover} 
                  transition-all duration-200 group
                  active:scale-[0.98]
                `}
              >
                {/* Icon */}
                <div className={`
                  w-12 h-12 rounded-xl bg-linear-to-br ${role.gradient} 
                  flex items-center justify-center text-xl
                  shadow-md group-hover:shadow-lg transition-shadow
                  shrink-0
                `}>
                  <span>{role.icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1 text-left">
                  <h3 className={`
                    font-bold text-slate-900 text-base
                    ${role.textHover} transition-colors
                  `}>
                    {role.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {role.description}
                  </p>
                </div>

                {/* Arrow */}
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all shrink-0">
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {/* ─── Footer ────────────────────────────────────────── */}
          <div className="px-6 pb-6 pt-2 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {mode === "signin" ? "Don't have an account?" : "Already have an account?"}
            </p>
            <button
              onClick={() => {
                const newMode: "signin" | "signup" = mode === "signin" ? "signup" : "signin";
                onModeChange?.(newMode);
              }}
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              {mode === "signin" ? "Sign Up" : "Sign In"}
            </button>
          </div>
        </div>

        {/* ─── CSS Animations ──────────────────────────────────── */}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(20px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          @media (max-width: 640px) {
            .w-full {
              margin: 16px;
            }
          }
        `}</style>
      </div>
    </Fragment>
  );
};

export default RoleModal;