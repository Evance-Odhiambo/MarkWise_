"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import {
  ArrowLeft,
  CheckCircle2,
  Fingerprint,
  Globe,
  GraduationCap,
  KeyRound,
  Radio,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getOnlineSession,
  getPasskeyAttendanceOptions,
  getPasskeyRegistrationOptions,
  verifyPasskeyAttendance,
  verifyPasskeyRegistration,
  type OnlineSession,
} from "@/lib/attendance/online-attendance";
import { RoleWorkspaceShell } from "@/components/layout/role-workspace-shell";
import {
  handleDeepLinkFlow,
  type DeepLinkAttemptResult,
} from "@/lib/deep-link-handler";
import { DeepLinkLoading } from "@/components/features/attendance/deep-link-loading";

export default function AttendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("session");
  const [session, setSession] = useState<OnlineSession | null>(null);
  const [message, setMessage] = useState("Establishing secure session handshake…");
  const [authReady, setAuthReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [passkeyExists, setPasskeyExists] = useState(false);
  const [hasAttemptedMark, setHasAttemptedMark] = useState(false);
  
  // Deep link state
  const [deepLinkAttempting, setDeepLinkAttempting] = useState(false);
  const [deepLinkResult, setDeepLinkResult] = useState<DeepLinkAttemptResult | null>(null);

  useEffect(() => {
    // Check for session ID first
    if (!id) {
      setMessage("This online check-in link is missing a session token. Please enter via your lecturer's shared remote link.");
      setAuthReady(true);
      return;
    }

    // Check if student is logged in
    let user: { token?: string; role?: string } = {};
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        user = JSON.parse(storedUser);
      }
    } catch (error) {
      // Invalid stored data, clear it
      localStorage.removeItem("user");
    }

    // If not logged in as student, redirect to login with return URL
    if (!user.token || user.role !== "student") {
      const returnTo = `/attend?session=${encodeURIComponent(id)}`;
      router.replace(`/student/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    // Student is logged in, proceed with attendance marking
    setAuthReady(true);
    setMessage("Verifying session... Please wait.");
    setDeepLinkAttempting(true);

    // Try deep link first (for mobile app), then fallback to web
    handleDeepLinkFlow(id)
      .then((result) => {
        setDeepLinkResult(result);
        setDeepLinkAttempting(false);

        if (result.fallbackNeeded) {
          // Proceed with normal session fetch for WebAuthn
          setMessage("Loading attendance session...");
          return getOnlineSession(id);
        }
        // If app opened successfully, page will remain hidden
        return null;
      })
      .then((result) => {
        if (result) {
          setSession(result.data);
          setMessage("Online lecture session verified. Attempting automatic attendance marking...");
          
          // Automatically attempt to mark attendance
          setTimeout(() => {
            mark();
          }, 500); // Small delay to ensure UI is ready
        }
      })
      .catch((error) => {
        setMessage(
          error instanceof Error
            ? error.message
            : "This online attendance session is currently unavailable.",
        );
      });
  }, [id, router]);

  async function registerPasskey() {
    setBusy(true);
    setPasskeyMessage("");
    setMessage("Starting passkey registration...");
    
    try {
      const options = await getPasskeyRegistrationOptions();
      
      setMessage("Please authenticate to register your device...");
      const credential = await startRegistration({ optionsJSON: options.data });
      
      setMessage("Verifying registration...");
      await verifyPasskeyRegistration(credential);
      
      setPasskeyExists(true);
      setMessage("Passkey registered successfully. Marking attendance...");
      setPasskeyMessage("Biometric Passkey successfully linked to this browser.");
      
      // Automatically attempt to mark attendance after successful registration
      setHasAttemptedMark(false);
      setBusy(false);
      
      setTimeout(() => {
        mark();
      }, 100);
      
    } catch (error) {
      if (error instanceof Error && error.message.includes("409")) {
        // Passkey already exists, attempt to mark attendance
        setPasskeyExists(true);
        setPasskeyMessage("A passkey is already registered for this account.");
        
        // Important: Reset hasAttemptedMark to allow mark() to run
        setHasAttemptedMark(false);
        setBusy(false);
        
        setMessage("Passkey already registered. Marking attendance...");
        
        // Attempt mark immediately
        setTimeout(() => {
          mark();
        }, 100);
      } else {
        setMessage("Passkey registration failed.");
        setPasskeyMessage(
          error instanceof Error ? error.message : "Biometric passkey registration failed.",
        );
        setBusy(false);
      }
    }
  }

  async function mark() {
    if (!id) return;
    
    // Prevent multiple simultaneous attempts
    if (busy) {
      console.log("Mark: Already busy, skipping...");
      return;
    }
    
    if (hasAttemptedMark) {
      console.log("Mark: Already attempted, skipping...");
      return;
    }
    
    console.log("Mark: Starting attendance marking...");
    setBusy(true);
    setHasAttemptedMark(true);
    setPasskeyMessage("");
    setMessage("Verifying your device credentials...");
    
    try {
      // Get WebAuthn challenge options
      const optionsResponse = await getPasskeyAttendanceOptions(id);
      
      // Check if no credential is registered
      if ('noCredential' in optionsResponse && optionsResponse.noCredential) {
        setMessage("No passkey registered on this device.");
        setPasskeyMessage("To mark attendance automatically, please register your device biometrics first by clicking the button below.");
        setBusy(false);
        return;
      }
      
      // TypeScript type guard: at this point we know optionsResponse has data
      if (!('data' in optionsResponse)) {
        throw new Error("Invalid response from server");
      }
      
      setMessage("Please authenticate with your biometric...");
      
      // Perform WebAuthn authentication
      const assertion = await startAuthentication({
        optionsJSON: optionsResponse.data,
      });
      
      setMessage("Verifying attendance...");
      
      // Debug logging
      console.log("Sending passkey verification:", {
        id,
        assertion,
        assertionKeys: Object.keys(assertion),
        assertionId: assertion.id
      });
      
      // Verify the passkey attendance with device fingerprinting
      const result = await verifyPasskeyAttendance(id, assertion);
      
      // Only mark success if verification succeeded
      if (result.success) {
        setSuccess(true);
        setMessage("Your online attendance has been cryptographically signed and verified.");
        
        // Trigger a dashboard refresh by dispatching a storage event
        window.dispatchEvent(new Event('attendance-updated'));
        
        // Auto-redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/student/dashboard');
        }, 3000);
      } else {
        setMessage("Attendance verification failed.");
        setPasskeyMessage("Attendance verification failed. Please try again by clicking the button below.");
      }
    } catch (error) {
      console.error("Mark error:", error);
      // Handle specific error cases
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        // Handle duplicate attendance (409 Conflict)
        if (errorMsg.includes("409") || errorMsg.includes("duplicate") || errorMsg.includes("already marked")) {
          setSuccess(true);
          setMessage("You have already marked attendance for this session.");
          
          // Auto-redirect to dashboard after 3 seconds
          setTimeout(() => {
            router.push('/student/dashboard');
          }, 3000);
          return;
        }
        
        // Handle Bad Request (400) - most common issue
        if (errorMsg.includes("bad request") || errorMsg.includes("400")) {
          setMessage("Authentication failed.");
          
          if (errorMsg.includes("passkey response is required")) {
            setPasskeyMessage("The passkey response was invalid. Please ensure your backend server is accessible and try again.");
          } else if (errorMsg.includes("verification failed")) {
            setPasskeyMessage("Passkey verification failed. This may be due to WebAuthn configuration issues. Please check your backend configuration.");
          } else {
            setPasskeyMessage("Backend returned Bad Request (400). Please ensure:\n1. Backend server is accessible\n2. WebAuthn configuration is correct\n3. Browser cache is cleared\nThen click 'Try Again' below.");
          }
          setBusy(false);
          return;
        }
        
        if (errorMsg.includes("passkey response is required")) {
          setMessage("Authentication failed.");
          setPasskeyMessage("Invalid passkey response. Please try marking attendance again.");
        } else if (errorMsg.includes("no passkey") || errorMsg.includes("credential") || errorMsg.includes("not registered")) {
          setMessage("No passkey registered on this device.");
          setPasskeyMessage("To mark attendance automatically, please register your device biometrics first by clicking the button below.");
        } else if (errorMsg.includes("cancelled") || errorMsg.includes("abort")) {
          setMessage("Authentication cancelled.");
          setPasskeyMessage("You cancelled the biometric authentication. Click the button below to try again.");
        } else if (errorMsg.includes("timeout")) {
          setMessage("Authentication timed out.");
          setPasskeyMessage("The authentication request timed out. Click the button below to try again.");
        } else if (errorMsg.includes("challenge")) {
          setMessage("Session expired.");
          setPasskeyMessage("The authentication challenge has expired. Please refresh the page and try again.");
        } else if (errorMsg.includes("failed to fetch") || errorMsg.includes("network")) {
          setMessage("Cannot connect to backend server.");
          setPasskeyMessage("Failed to connect to the backend server. Please check your internet connection and try again.");
        } else {
          setMessage("An error occurred.");
          setPasskeyMessage(`Error: ${error.message}`);
        }
      } else {
        setMessage("Attendance verification failed.");
        setPasskeyMessage("Attendance verification failed. Please ensure you have registered your device passkey.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!authReady) return null;

  // Show loading state during deep link attempt
  if (deepLinkAttempting) {
    return <DeepLinkLoading />;
  }

  // If deep link succeeded, don't render anything (page is hidden, app is open)
  if (deepLinkResult && deepLinkResult.opened) {
    return null;
  }

  return (
    <RoleWorkspaceShell role="student" eyebrow="Student Portal" title="Online Lecture Check-in">
      <main className="p-3 sm:p-6 flex items-center justify-center min-h-[calc(100vh-60px)] text-[11px]">
        <div className="w-full max-w-md space-y-3">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Return to Student Dashboard</span>
          </Link>

          <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
            <CardHeader className="border-b border-slate-100 px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/30 text-emerald-400 border border-emerald-400/40">
                    <Globe className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-bold text-white">
                      Online Lecture Attendance Check-in
                    </CardTitle>
                    <CardDescription className="text-[10px] text-emerald-300">
                      Cryptographic attendance verification
                    </CardDescription>
                  </div>
                </div>

                <Badge variant="outline" className="border-emerald-400/40 bg-emerald-500/20 text-emerald-300 font-mono text-[9px]">
                  VERIFIED
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {/* Unit Card */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 font-mono text-sm">
                    {session?.unitCode ?? "UNIT-LECTURE"}
                  </span>
                  <span className="rounded bg-emerald-600 text-white text-[8.5px] font-bold px-1.5 py-0.2">
                    ACTIVE SESSION
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-800">
                  {session?.unitName ?? "Lecture Session"}
                </p>
                <p className="text-[9.5px] text-slate-500">
                  Expires at: {session?.expiresAt ? new Date(session.expiresAt).toLocaleTimeString() : "Active Window"}
                </p>
              </div>

              {/* Status Message */}
              {success ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center space-y-2 text-emerald-900">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                  <p className="font-bold text-sm">Attendance Verified!</p>
                  <p className="text-[10.5px] text-emerald-800">{message}</p>
                  <div className="pt-2 border-t border-emerald-200">
                    <p className="text-[10px] text-emerald-700">
                      Redirecting to dashboard...
                    </p>
                    <Link href="/student/dashboard">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 mt-2 text-[10.5px] text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 font-semibold"
                      >
                        Go to Dashboard Now →
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {busy && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <Fingerprint className="h-5 w-5 text-blue-600 animate-pulse" />
                      </div>
                      <p className="text-[10.5px] font-semibold text-blue-900">{message}</p>
                    </div>
                  )}
                  
                  {!busy && (
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px] text-slate-600 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{message}</span>
                    </div>
                  )}
                </>
              )}

              {/* Action Buttons */}
              {!success && hasAttemptedMark && !busy && (
                <div className="space-y-2 pt-1">
                  {/* Show retry button for retriable errors */}
                  {(passkeyMessage.toLowerCase().includes("cancelled") || 
                    passkeyMessage.toLowerCase().includes("timed out") || 
                    passkeyMessage.toLowerCase().includes("try again") ||
                    passkeyMessage.toLowerCase().includes("backend") ||
                    passkeyMessage.toLowerCase().includes("bad request") ||
                    passkeyMessage.toLowerCase().includes("verification failed")) && (
                    <Button
                      onClick={() => {
                        setHasAttemptedMark(false);
                        mark();
                      }}
                      disabled={busy}
                      className="w-full h-8 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-xs"
                    >
                      <Fingerprint className="h-3.5 w-3.5" />
                      <span>{busy ? "Verifying..." : "Try Again"}</span>
                    </Button>
                  )}

                  {/* Show passkey registration button if no passkey exists */}
                  {passkeyMessage.toLowerCase().includes("register") && (
                    <Button
                      variant={passkeyMessage.toLowerCase().includes("cancelled") ? "outline" : "default"}
                      onClick={registerPasskey}
                      disabled={busy}
                      className={`w-full h-8 text-[11px] font-bold gap-1.5 shadow-xs ${
                        passkeyMessage.toLowerCase().includes("cancelled") 
                          ? "border-slate-200 text-slate-700 hover:bg-slate-50" 
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>{busy ? "Registering..." : "Register Device Biometrics"}</span>
                    </Button>
                  )}
                </div>
              )}

              {passkeyMessage && (
                <p className={`rounded-md border p-2 text-[10px] font-medium ${
                  passkeyExists 
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800" 
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}>
                  {passkeyMessage}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </RoleWorkspaceShell>
  );
}
