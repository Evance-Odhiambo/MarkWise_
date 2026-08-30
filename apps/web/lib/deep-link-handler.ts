/**
 * Deep Link Handler for MarkWise Mobile App
 * Handles smart detection and fallback to web
 */

export interface DeepLinkConfig {
  scheme: string; // e.g., "markwise"
  path: string; // e.g., "attend"
  timeout: number; // milliseconds, default 2500
}

export interface DeepLinkAttemptResult {
  attempted: boolean; // Whether deep link was attempted
  opened: boolean; // Whether app appeared to open
  platform: "ios" | "android" | "desktop" | "unknown";
  fallbackNeeded: boolean; // Whether to show WebAuthn
}

export interface MobileDetectionResult {
  isMobile: boolean;
  platform: "ios" | "android" | "desktop" | "unknown";
  userAgent: string;
}

// Patterns for mobile detection
const IOS_PATTERN = /iPhone|iPad|iPod/i;
const ANDROID_PATTERN = /Android/i;

/**
 * Detects if the current device is mobile and which platform
 */
export function detectMobile(): MobileDetectionResult {
  if (typeof window === "undefined") {
    return { isMobile: false, platform: "unknown", userAgent: "" };
  }

  const ua = window.navigator.userAgent;

  if (IOS_PATTERN.test(ua)) {
    return { isMobile: true, platform: "ios", userAgent: ua };
  }

  if (ANDROID_PATTERN.test(ua)) {
    return { isMobile: true, platform: "android", userAgent: ua };
  }

  return { isMobile: false, platform: "desktop", userAgent: ua };
}

/**
 * Constructs a deep link URL with query parameters
 */
export function buildDeepLinkUrl(
  config: DeepLinkConfig,
  params: Record<string, string>
): string {
  const query = new URLSearchParams(params).toString();
  return `${config.scheme}://${config.path}?${query}`;
}

/**
 * Attempts to open a deep link and monitors for success
 * Returns a promise that resolves when either:
 * - App opens (visibility change detected)
 * - Timeout expires (fallback needed)
 */
export function attemptDeepLink(
  url: string,
  timeout: number
): Promise<DeepLinkAttemptResult> {
  return new Promise((resolve) => {
    let resolved = false;
    let visibilityHandler: (() => void) | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (visibilityHandler) {
        document.removeEventListener("visibilitychange", visibilityHandler);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    const handleSuccess = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve({
        attempted: true,
        opened: true,
        platform: detectMobile().platform,
        fallbackNeeded: false,
      });
    };

    const handleTimeout = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve({
        attempted: true,
        opened: false,
        platform: detectMobile().platform,
        fallbackNeeded: true,
      });
    };

    // Monitor visibility changes
    visibilityHandler = () => {
      if (document.hidden) {
        handleSuccess();
      }
    };
    document.addEventListener("visibilitychange", visibilityHandler);

    // Set timeout for fallback
    timeoutId = setTimeout(handleTimeout, timeout);

    // Attempt to open the deep link using iframe approach for better compatibility
    try {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);

      // Clean up iframe after a brief delay
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (e) {
          // Ignore cleanup errors
        }
      }, 100);
    } catch (error) {
      // If deep link fails entirely, treat as timeout
      handleTimeout();
    }
  });
}

/**
 * Main entry point for deep linking flow
 * Handles detection, attempt, and fallback decision
 */
export async function handleDeepLinkFlow(
  sessionId: string,
  config?: Partial<DeepLinkConfig>
): Promise<DeepLinkAttemptResult> {
  const defaultConfig: DeepLinkConfig = {
    scheme: "markwise",
    path: "attend",
    timeout: 2500,
  };

  const finalConfig = { ...defaultConfig, ...config };

  // Detect mobile
  const detection = detectMobile();

  // If not mobile, skip deep linking
  if (!detection.isMobile) {
    return {
      attempted: false,
      opened: false,
      platform: detection.platform,
      fallbackNeeded: true,
    };
  }

  // Build deep link URL
  const url = buildDeepLinkUrl(finalConfig, { session: sessionId });

  // Attempt deep link
  return attemptDeepLink(url, finalConfig.timeout);
}

/**
 * Returns user-friendly messages based on device type
 */
export function getAttendanceInstructions(): {
  title: string;
  description: string;
} {
  if (typeof window === "undefined") {
    return {
      title: "Mark Attendance",
      description: "Verify your attendance for this online lecture",
    };
  }

  const detection = detectMobile();

  if (!detection.isMobile) {
    return {
      title: "Use Biometric Authentication",
      description:
        "Verify your attendance using Face ID, Touch ID, or Windows Hello",
    };
  }

  if (detection.platform === "ios") {
    return {
      title: "Opening MarkWise App...",
      description:
        "If the app doesn't open, you can mark attendance here with Face ID",
    };
  }

  if (detection.platform === "android") {
    return {
      title: "Opening MarkWise App...",
      description:
        "If the app doesn't open, you can mark attendance here with fingerprint",
    };
  }

  return {
    title: "Mark Attendance",
    description: "Verify your attendance for this online lecture",
  };
}
