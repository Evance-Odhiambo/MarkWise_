import { Smartphone, Loader2 } from "lucide-react";

/**
 * Loading screen displayed while attempting to open the mobile app via deep link
 * Shows for up to 2.5 seconds before falling back to WebAuthn
 */
export function DeepLinkLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50">
      <div className="text-center space-y-4 px-6 max-w-md">
        {/* Animated icon */}
        <div className="flex justify-center">
          <div className="relative">
            <Smartphone className="h-16 w-16 text-emerald-600" />
            <Loader2 className="h-6 w-6 text-emerald-500 absolute -right-1 -bottom-1 animate-spin" />
          </div>
        </div>

        {/* Loading text */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">
            Opening MarkWise App...
          </h2>
          <p className="text-sm text-slate-600">
            We&apos;re launching the app for a better attendance experience.
            If it doesn&apos;t open, we&apos;ll continue in your browser.
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1 pt-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
          <div
            className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"
            style={{ animationDelay: "0.2s" }}
          />
          <div
            className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"
            style={{ animationDelay: "0.4s" }}
          />
        </div>
      </div>
    </div>
  );
}
