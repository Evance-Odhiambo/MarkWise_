"use client";

import React, { Fragment, useEffect, useState, Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, GraduationCap, Users, Building2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
    description: "Mark attendance and track your progress",
    Icon: GraduationCap,
    signInPath: "/student/login",
    signUpPath: "/student/register",
    iconBg: "from-emerald-500 to-teal-600",
    iconShadow: "shadow-emerald-500/30",
    hoverBorder: "hover:border-emerald-300",
    hoverBg: "hover:bg-emerald-50/60",
    badge: "Student",
    badgeColor: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  {
    id: "lecturer",
    name: "Lecturer",
    description: "Run sessions and generate attendance reports",
    Icon: Users,
    signInPath: "/lecturer/login",
    signUpPath: "/lecturer/register",
    iconBg: "from-sky-500 to-blue-600",
    iconShadow: "shadow-sky-500/30",
    hoverBorder: "hover:border-sky-300",
    hoverBg: "hover:bg-sky-50/60",
    badge: "Staff",
    badgeColor: "bg-sky-50 border-sky-200 text-sky-700",
  },
  {
    id: "admin",
    name: "Institution Administrator",
    description: "Manage institution, staff, and academic data",
    Icon: Building2,
    signInPath: "/admin/school-admin/login",
    signUpPath: "/admin/school-admin/register",
    iconBg: "from-violet-500 to-purple-600",
    iconShadow: "shadow-violet-500/30",
    hoverBorder: "hover:border-violet-300",
    hoverBg: "hover:bg-violet-50/60",
    badge: "Administrator",
    badgeColor: "bg-violet-50 border-violet-200 text-violet-700",
  },
];

export const RoleModal: React.FC<RoleModalProps> = ({ isOpen, onClose, mode, onModeChange }) => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  const handleSelect = (path: string) => { router.push(path); onClose(); };
  const handleOverlayClick = (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); };

  if (!isOpen || !mounted) return null;

  return (
    <Fragment>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={handleOverlayClick}
        style={{ animation: "mw-fade 0.2s ease-out" }}
      >
        <div
          className="relative w-full max-w-xs bg-white rounded-2xl shadow-2xl shadow-emerald-900/10 overflow-hidden flex flex-col"
          style={{ animation: "mw-slide 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top accent bar */}
          <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 shrink-0" />

          {/* Header */}
          <div className="px-4 pt-4 pb-3 shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                    MarkWise
                  </span>
                  <Badge className="bg-emerald-50 border-emerald-200 text-emerald-700 text-[9px] font-mono px-1.5 py-0">
                    {mode === "signin" ? "Sign In" : "Sign Up"}
                  </Badge>
                </div>
                <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                  {mode === "signin" ? "Welcome back" : "Join MarkWise"}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {mode === "signin" ? "Choose your role to continue" : "Select your role to get started"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Role list */}
          <div className="px-3 pb-3 space-y-1.5 overflow-y-auto">
            {roles.map((role) => {
              const path = mode === "signin" ? role.signInPath : role.signUpPath;
              return (
                <button
                  key={role.id}
                  onClick={() => handleSelect(path)}
                  className={`w-full group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-all active:scale-[0.98] ${role.hoverBg} ${role.hoverBorder}`}
                >
                  {/* Icon */}
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${role.iconBg} text-white shadow-md ${role.iconShadow}`}>
                    <role.Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-bold text-slate-900 leading-none">
                        {role.name}
                      </span>
                      <Badge className={`text-[9px] font-mono px-1 py-0 border ${role.badgeColor}`}>
                        {role.badge}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[10.5px] text-slate-500 leading-tight truncate">
                      {role.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
            <p className="text-[11px] text-slate-400">
              {mode === "signin" ? "Don't have an account?" : "Already have an account?"}
            </p>
            <button
              onClick={() => onModeChange?.(mode === "signin" ? "signup" : "signin")}
              className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition"
            >
              {mode === "signin" ? "Sign Up →" : "Sign In →"}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes mw-fade {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes mw-slide {
            from { opacity: 0; transform: scale(0.96) translateY(12px); }
            to   { opacity: 1; transform: scale(1)    translateY(0);    }
          }
        `}</style>
      </div>
    </Fragment>
  );
};

export default RoleModal;
