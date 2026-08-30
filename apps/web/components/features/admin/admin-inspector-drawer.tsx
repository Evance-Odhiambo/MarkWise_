"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface AdminInspectorDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AdminInspectorDrawer({
  open,
  onClose,
  title,
  subtitle,
  badge,
  children,
  footer,
}: AdminInspectorDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/40 backdrop-blur-xs transition-opacity duration-200">
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          className="w-screen max-w-lg border-l border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right duration-200 flex flex-col text-[11px]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/70">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-900 truncate">
                  {title}
                </h2>
                {badge}
              </div>
              {subtitle && (
                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {children}
          </div>

          {/* Drawer Footer */}
          {footer && (
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 flex items-center justify-end gap-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

