# Attendance Deep Linking Bugfix Design

## Overview

The current `/attend` page forces all users to use WebAuthn authentication in the browser, even when mobile users have the MarkWise native app installed. This creates a suboptimal experience as mobile users cannot leverage native app capabilities. This bugfix introduces intelligent deep linking detection that attempts to open the native app for mobile users with a 2.5 second timeout, while maintaining WebAuthn as a reliable fallback. The solution uses the Document Visibility API to detect successful app launches and provides visual feedback during the detection phase.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when mobile users with the MarkWise app installed are forced to use WebAuthn in the browser instead of being redirected to the native app
- **Property (P)**: The desired behavior - mobile users with the app should be seamlessly redirected to the native app, with graceful fallback to WebAuthn if the app is not installed or the redirect fails
- **Preservation**: Existing WebAuthn authentication flow, desktop user experience, and all attendance recording functionality that must remain unchanged
- **Deep Link**: A URI scheme (`markwise://attend?session={SESSION_ID}`) that opens the native mobile app when available
- **Document Visibility API**: Browser API that detects when the page becomes hidden (indicating a potential app switch)
- **Mobile Detection**: User agent parsing to identify iOS and Android devices
- **Timeout Period**: 2.5 second window to detect if the app opened successfully before falling back to WebAuthn
- **AttendPage**: The React component at `app/attend/page.tsx` that handles attendance flow
- **DeepLinkHandler**: Utility module at `lib/deep-link-handler.ts` that encapsulates deep linking logic
- **DeepLinkLoading**: Component at `components/features/attendance/deep-link-loading.tsx` that displays loading state during deep link attempt

## Bug Details

### Bug Condition

The bug manifests when a mobile user (iOS or Android) with the MarkWise native app installed clicks an attendance link or navigates to `/attend?session={id}`. The system does not detect the mobile device, does not attempt to open the native app via deep link, and immediately presents the WebAuthn authentication flow instead.

**Formal Specification:**
```
FUNCTION isBugCondition(context)
  INPUT: context of type { userAgent: string, hasNativeApp: boolean, sessionId: string, platform: string }
  OUTPUT: boolean
  
  RETURN (context.platform IN ['iOS', 'Android'])
         AND context.hasNativeApp == true
         AND context.sessionId != null
         AND NOT deepLinkAttempted(context)
END FUNCTION
```

### Examples

- **Example 1**: iOS user with MarkWise app installed clicks attendance link
  - **Expected**: App opens with session ID, marks attendance in native UI
  - **Actual**: Browser shows WebAuthn prompt, user marks attendance in browser

- **Example 2**: Android user with MarkWise app installed navigates to `/attend?session=abc123`
  - **Expected**: System attempts deep link `markwise://attend?session=abc123`, waits 2.5s for app to open
  - **Actual**: WebAuthn flow starts immediately, no deep link attempted

- **Example 3**: Mobile user without app clicks attendance link
  - **Expected**: System attempts deep link, detects failure after 2.5s timeout, falls back to WebAuthn seamlessly
  - **Actual**: (This is correct behavior post-fix, but currently there's no deep link attempt at all)

- **Edge Case**: Mobile user has app installed but it's not responding
  - **Expected**: System waits 2.5s, detects no visibility change, falls back to WebAuthn without error

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Desktop users must continue to use WebAuthn authentication directly without any deep linking attempts
- Mobile users without the app must successfully authenticate using browser-based WebAuthn after the timeout
- All attendance recording must continue to work correctly regardless of authentication method
- Session token validation and security must remain unchanged
- Error handling for network issues must continue to work as before
- Manual navigation to `/attend` must continue to allow attendance via WebAuthn

**Scope:**
All inputs that do NOT involve mobile devices with the native app installed should be completely unaffected by this fix. This includes:
- Desktop browsers (Windows, macOS, Linux)
- Mobile browsers when app is not installed
- Direct WebAuthn fallback flow
- Backend attendance recording
- Session expiration and validation
- Error states and edge cases in existing flow

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Missing Mobile Detection**: The AttendPage component has no logic to detect mobile user agents
   - No user agent parsing for iOS/Android detection
   - No platform-specific behavior differentiation

2. **No Deep Link Implementation**: The system lacks deep linking infrastructure
   - No URI scheme handler invocation
   - No timeout mechanism for fallback
   - No Document Visibility API integration

3. **No Loading State**: There is no UI feedback during deep link detection
   - Users would see WebAuthn immediately with no indication of app launch attempt
   - No loading component or transition state

4. **Monolithic Component Design**: AttendPage handles all logic inline
   - Difficult to test deep linking behavior in isolation
   - No separation of concerns between detection, UI, and fallback logic

## Correctness Properties

Property 1: Bug Condition - Deep Link Attempt for Mobile Users

_For any_ user on a mobile device (iOS or Android) who navigates to `/attend?session={id}`, the system SHALL attempt to open the native app via deep link `markwise://attend?session={id}`, display a loading screen, monitor for successful app launch using the Document Visibility API, and fall back to WebAuthn after 2.5 seconds if the app does not open.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - Desktop and Fallback Behavior

_For any_ user on a desktop device OR any user on mobile without the app installed, the system SHALL produce exactly the same behavior as the original code, using WebAuthn authentication directly without attempting deep linking, preserving all existing authentication flows, attendance recording, and error handling.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      AttendPage Component                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 1. Check session ID exists                            │  │
│  │ 2. Verify user authentication                         │  │
│  │ 3. Detect mobile device (new)                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│         ┌─────────────────┴─────────────────┐               │
│         │                                   │               │
│    [Desktop/No App]                   [Mobile + App]        │
│         │                                   │               │
│         ▼                                   ▼               │
│  ┌──────────────┐              ┌──────────────────────┐    │
│  │   WebAuthn   │              │  DeepLinkHandler     │    │
│  │     Flow     │              │  - attemptDeepLink() │    │
│  │  (Original)  │              │  - detectMobile()    │    │
│  └──────────────┘              │  - monitorVisibility()│    │
│                                └──────────────────────┘    │
│                                           │                 │
│                          ┌────────────────┴────────────┐   │
│                          │                             │   │
│                    [App Opened]                  [Timeout]  │
│                          │                             │   │
│                          ▼                             ▼   │
│                  ┌──────────────┐            ┌──────────┐  │
│                  │ Page Hidden  │            │ WebAuthn │  │
│                  │ (Success)    │            │ Fallback │  │
│                  └──────────────┘            └──────────┘  │
└─────────────────────────────────────────────────────────────┘

                    State Flow Diagram
                           
    [Page Load] 
        │
        ▼
    [Auth Check] ──No Auth──> [Redirect to Login]
        │
        │ Authenticated
        ▼
    [Mobile Detection]
        │
        ├──Desktop──> [Show WebAuthn UI]
        │
        └──Mobile──> [Show Loading State]
                          │
                          ▼
                     [Invoke Deep Link]
                          │
                          ├──Visibility Hidden (App Opened)──> [Success - Stay Hidden]
                          │
                          └──Timeout (2.5s)──> [Hide Loading, Show WebAuthn UI]
```

### Module Designs

#### 1. Deep Link Handler (`lib/deep-link-handler.ts`)

**Purpose**: Encapsulates all deep linking logic including mobile detection, URI invocation, and visibility monitoring.

**TypeScript Interfaces:**
```typescript
export interface DeepLinkConfig {
  scheme: string;           // e.g., "markwise"
  path: string;            // e.g., "attend"
  timeout: number;         // milliseconds, default 2500
}

export interface DeepLinkAttemptResult {
  attempted: boolean;      // Whether deep link was attempted
  opened: boolean;         // Whether app appeared to open
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  fallbackNeeded: boolean; // Whether to show WebAuthn
}

export interface MobileDetectionResult {
  isMobile: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  userAgent: string;
}
```

**Function Signatures:**
```typescript
/**
 * Detects if the current device is mobile and which platform
 */
export function detectMobile(): MobileDetectionResult;

/**
 * Constructs a deep link URL with query parameters
 */
export function buildDeepLinkUrl(
  config: DeepLinkConfig,
  params: Record<string, string>
): string;

/**
 * Attempts to open a deep link and monitors for success
 * Returns a promise that resolves when either:
 * - App opens (visibility change detected)
 * - Timeout expires (fallback needed)
 */
export function attemptDeepLink(
  url: string,
  timeout: number
): Promise<DeepLinkAttemptResult>;

/**
 * Monitors document visibility changes to detect app launch
 * Internal helper used by attemptDeepLink
 */
function monitorVisibilityChange(
  timeout: number,
  onHidden: () => void,
  onTimeout: () => void
): () => void;

/**
 * Main entry point for deep linking flow
 * Handles detection, attempt, and fallback decision
 */
export async function handleDeepLinkFlow(
  sessionId: string,
  config?: Partial<DeepLinkConfig>
): Promise<DeepLinkAttemptResult>;
```

**Implementation Details:**
```typescript
// Mobile detection using user agent patterns
const IOS_PATTERN = /iPhone|iPad|iPod/i;
const ANDROID_PATTERN = /Android/i;

export function detectMobile(): MobileDetectionResult {
  if (typeof window === 'undefined') {
    return { isMobile: false, platform: 'unknown', userAgent: '' };
  }
  
  const ua = window.navigator.userAgent;
  
  if (IOS_PATTERN.test(ua)) {
    return { isMobile: true, platform: 'ios', userAgent: ua };
  }
  
  if (ANDROID_PATTERN.test(ua)) {
    return { isMobile: true, platform: 'android', userAgent: ua };
  }
  
  return { isMobile: false, platform: 'desktop', userAgent: ua };
}

export function buildDeepLinkUrl(
  config: DeepLinkConfig,
  params: Record<string, string>
): string {
  const query = new URLSearchParams(params).toString();
  return `${config.scheme}://${config.path}?${query}`;
}

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
        document.removeEventListener('visibilitychange', visibilityHandler);
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
    document.addEventListener('visibilitychange', visibilityHandler);
    
    // Set timeout for fallback
    timeoutId = setTimeout(handleTimeout, timeout);
    
    // Attempt to open the deep link
    // Using iframe approach for better compatibility
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    
    // Clean up iframe after a brief delay
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 100);
  });
}

export async function handleDeepLinkFlow(
  sessionId: string,
  config?: Partial<DeepLinkConfig>
): Promise<DeepLinkAttemptResult> {
  const defaultConfig: DeepLinkConfig = {
    scheme: 'markwise',
    path: 'attend',
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
```

#### 2. Enhanced Attend Page (`app/attend/page.tsx`)

**Changes Required:**

**Import Additions:**
```typescript
import { handleDeepLinkFlow } from "@/lib/deep-link-handler";
import { DeepLinkLoading } from "@/components/features/attendance/deep-link-loading";
```

**New State Variables:**
```typescript
const [deepLinkAttempting, setDeepLinkAttempting] = useState(false);
const [deepLinkResult, setDeepLinkResult] = useState<DeepLinkAttemptResult | null>(null);
```

**Modified useEffect Logic:**
```typescript
useEffect(() => {
  if (!id) {
    setMessage("This online check-in link is missing a session token...");
    setAuthReady(true);
    return;
  }

  let user: { token?: string; role?: string } = {};
  try {
    user = JSON.parse(localStorage.getItem("user") ?? "{}");
  } catch {
    localStorage.removeItem("user");
  }

  if (!user.token || user.role !== "student") {
    const returnTo = `/attend?session=${encodeURIComponent(id)}`;
    router.replace(`/student/login?returnTo=${encodeURIComponent(returnTo)}`);
    return;
  }

  // NEW: Attempt deep link before showing WebAuthn
  setAuthReady(true);
  setDeepLinkAttempting(true);
  
  handleDeepLinkFlow(id)
    .then((result) => {
      setDeepLinkResult(result);
      setDeepLinkAttempting(false);
      
      if (result.fallbackNeeded) {
        // Proceed with normal session fetch for WebAuthn
        return getOnlineSession(id);
      }
      // If app opened successfully, page will remain hidden
      return null;
    })
    .then((result) => {
      if (result) {
        setSession(result.data);
        setMessage("Online lecture session verified. You may mark remote attendance.");
      }
    })
    .catch((error) =>
      setMessage(
        error instanceof Error
          ? error.message
          : "This online attendance session is currently unavailable.",
      ),
    );
}, [id, router]);
```

**Conditional Rendering:**
```typescript
// Show loading state during deep link attempt
if (deepLinkAttempting) {
  return <DeepLinkLoading />;
}

// If deep link succeeded, don't render anything (page is hidden)
if (deepLinkResult && deepLinkResult.opened) {
  return null;
}

// Otherwise, show original WebAuthn UI
if (!authReady) return null;

return (
  <RoleWorkspaceShell role="student" eyebrow="Student Portal" title="Online Lecture Check-in">
    {/* Existing UI */}
  </RoleWorkspaceShell>
);
```

#### 3. Loading Component (`components/features/attendance/deep-link-loading.tsx`)

**Purpose**: Displays a clean loading screen while the deep link attempt is in progress.

**Full Component:**
```typescript
import { Smartphone, Loader2 } from "lucide-react";

export function DeepLinkLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50">
      <div className="text-center space-y-4 px-6">
        <div className="flex justify-center">
          <div className="relative">
            <Smartphone className="h-16 w-16 text-emerald-600" />
            <Loader2 className="h-6 w-6 text-emerald-500 absolute -right-1 -bottom-1 animate-spin" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">
            Opening MarkWise App...
          </h2>
          <p className="text-sm text-slate-600 max-w-sm">
            We're launching the app for a better attendance experience.
            If it doesn't open, we'll continue in your browser.
          </p>
        </div>
        
        <div className="flex justify-center gap-1 pt-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse delay-75" />
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse delay-150" />
        </div>
      </div>
    </div>
  );
}
```

**Styling Notes:**
- Uses existing Tailwind classes from the project
- Matches the emerald color scheme of the attendance flow
- Provides clear messaging about what's happening
- Includes visual indication of progress

### Integration Points

**1. Deep Link Handler → Attend Page:**
- AttendPage imports `handleDeepLinkFlow` function
- Calls it early in the auth flow, before fetching session data
- Receives `DeepLinkAttemptResult` to determine next action
- Uses result to conditionally render loading, nothing, or WebAuthn UI

**2. Attend Page → Loading Component:**
- AttendPage conditionally renders `<DeepLinkLoading />` when `deepLinkAttempting === true`
- Loading component is self-contained with no props needed
- Component unmounts when deep link attempt completes

**3. Deep Link Handler → Document Visibility API:**
- Handler sets up event listener on `document.visibilitychange`
- Monitors for `document.hidden` state to detect app launch
- Cleans up listener when attempt completes or times out

**4. WebAuthn Fallback Integration:**
- If `result.fallbackNeeded === true`, proceed with existing flow
- No changes to WebAuthn functions (`mark`, `registerPasskey`)
- Session fetch and UI rendering continue as before
- Error handling remains unchanged

### State Management Approach

**Component State (React useState):**
- `deepLinkAttempting: boolean` - Controls loading screen visibility
- `deepLinkResult: DeepLinkAttemptResult | null` - Stores attempt outcome
- Existing state variables remain unchanged

**State Transitions:**
```
Initial: deepLinkAttempting = false, deepLinkResult = null
    ↓
Auth Check Passes → deepLinkAttempting = true
    ↓
handleDeepLinkFlow() called
    ↓
[Desktop Detected] → deepLinkAttempting = false, result.fallbackNeeded = true
    ↓
[Mobile + App Opens] → deepLinkAttempting = false, result.opened = true
    ↓
[Mobile + Timeout] → deepLinkAttempting = false, result.fallbackNeeded = true
```

**No Global State Required:**
- All state is component-local
- No Redux/Zustand/Context needed
- Deep link handler is stateless utility
- Clean functional approach

### Error Handling Strategy

**Error Categories and Responses:**

1. **Network Failures During Deep Link:**
   - Deep link attempt itself doesn't require network
   - If session fetch fails after fallback, existing error handling applies
   - Error message: Existing behavior preserved

2. **Browser Permissions Issues:**
   - Deep link invocation doesn't require permissions
   - If WebAuthn requires permissions, existing flow handles it
   - No new permission-related errors introduced

3. **Tab Visibility Edge Cases:**
   - User switches back to browser before timeout: Continues to show loading until timeout
   - User opens app then immediately returns: App gets session ID, browser falls back to WebAuthn (both work, no conflict)
   - Visibility API not supported: Timeout always triggers (graceful degradation)

4. **Multiple Rapid Attempts:**
   - Each attempt is independent
   - Previous attempt's listeners are cleaned up before new attempt
   - No race conditions due to Promise-based design

**Error Handling Implementation:**

```typescript
// In attemptDeepLink function
export function attemptDeepLink(
  url: string,
  timeout: number
): Promise<DeepLinkAttemptResult> {
  return new Promise((resolve) => {
    // Promise always resolves, never rejects
    // This ensures fallback always works
    
    try {
      // Attempt deep link invocation
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      
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

// In AttendPage component
handleDeepLinkFlow(id)
  .then((result) => {
    // Always succeeds, no .catch needed
    setDeepLinkResult(result);
    setDeepLinkAttempting(false);
    
    if (result.fallbackNeeded) {
      return getOnlineSession(id);
    }
    return null;
  })
  .then((result) => {
    if (result) {
      setSession(result.data);
      setMessage("Online lecture session verified...");
    }
  })
  .catch((error) => {
    // Only catches session fetch errors, not deep link errors
    setMessage(
      error instanceof Error
        ? error.message
        : "This online attendance session is currently unavailable.",
    );
  });
```

**Key Principles:**
- Deep link attempt never throws errors
- Always resolves to a result object
- Fallback is always available
- Existing error handling is preserved
- No new error states introduced

## Edge Cases & Error Handling

### Edge Case 1: Network Failures During Deep Link

**Scenario**: User's network drops while deep link is attempted

**Behavior**:
- Deep link invocation is local (no network required)
- If app opens successfully, network status irrelevant
- If fallback to WebAuthn occurs, session fetch may fail
- Existing error handling catches session fetch failures

**Implementation**: No additional handling needed, existing code covers this

### Edge Case 2: Browser Permissions Issues

**Scenario**: Browser blocks iframe creation or deep link invocation

**Behavior**:
- Try-catch in `attemptDeepLink` catches iframe errors
- Treat as timeout case (fallback needed)
- User sees loading screen for 2.5s, then WebAuthn appears

**Implementation**:
```typescript
try {
  const iframe = document.createElement('iframe');
  iframe.src = url;
  document.body.appendChild(iframe);
} catch (error) {
  // Treat as immediate timeout
  handleTimeout();
}
```

### Edge Case 3: Tab Visibility Edge Cases

**Scenario 3a**: User switches back to browser tab before timeout

**Behavior**:
- Loading screen continues to display until timeout
- After timeout, WebAuthn UI appears
- No visual glitch or flash

**Implementation**: State remains `deepLinkAttempting = true` until Promise resolves

**Scenario 3b**: App opens but user immediately returns to browser

**Behavior**:
- App receives session ID and can mark attendance
- Browser detects visibility hidden, marks as success
- Browser renders nothing (returns `null`)
- No duplicate attendance (backend handles idempotency)

**Implementation**: 
```typescript
if (deepLinkResult && deepLinkResult.opened) {
  return null; // Don't render anything
}
```

**Scenario 3c**: Visibility API not supported (old browsers)

**Behavior**:
- Visibility change listener never fires
- Timeout always occurs after 2.5s
- Falls back to WebAuthn every time
- Still better than no attempt at all

**Implementation**: Timeout ensures fallback always happens

### Edge Case 4: Multiple Rapid Attempts

**Scenario**: User clicks attendance link multiple times quickly

**Behavior**:
- Each page load triggers new deep link attempt
- Previous attempt's cleanup runs on component unmount
- No memory leaks or duplicate listeners

**Implementation**:
```typescript
useEffect(() => {
  // ... deep link logic
  
  return () => {
    // Cleanup runs on unmount
    // Though cleanup is also in attemptDeepLink Promise
  };
}, [id, router]);
```

### Edge Case 5: Session ID Missing or Invalid

**Scenario**: User navigates to `/attend` without session parameter

**Behavior**:
- Early return in useEffect before deep link attempt
- Message: "This online check-in link is missing a session token..."
- No deep link attempted
- Existing behavior preserved

**Implementation**: Already handled by existing code, no changes needed

### Edge Case 6: User Not Authenticated

**Scenario**: User clicks link but isn't logged in

**Behavior**:
- Auth check happens before deep link attempt
- Redirects to login with returnTo parameter
- After login, returns to `/attend?session={id}`
- Deep link attempt happens after successful auth

**Implementation**: Auth check occurs before `handleDeepLinkFlow` call

### Edge Case 7: App Installed But Not Responding

**Scenario**: App is installed but crashes or doesn't handle deep link

**Behavior**:
- Visibility change may or may not occur
- Timeout ensures fallback happens within 2.5s
- User sees loading screen, then WebAuthn UI
- No error message (seamless fallback)

**Implementation**: Timeout is the safety net for all app failures

### Edge Case 8: Slow Network on Session Fetch

**Scenario**: Deep link times out, session fetch takes a long time

**Behavior**:
- Loading screen hides after deep link timeout
- User sees WebAuthn UI immediately
- Session data may still be loading (existing behavior)
- Existing loading states handle this

**Implementation**: No changes needed, existing async handling works

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Manually test the current `/attend` page on mobile devices (iOS and Android) with and without the app installed. Run automated tests on the UNFIXED code to observe that deep linking is never attempted and WebAuthn is always shown immediately.

**Test Cases**:
1. **iOS Mobile User Test**: Navigate to `/attend?session=test123` on iPhone Safari (will show WebAuthn immediately on unfixed code)
2. **Android Mobile User Test**: Navigate to `/attend?session=test123` on Chrome Android (will show WebAuthn immediately on unfixed code)
3. **Desktop User Test**: Navigate to `/attend?session=test123` on desktop Chrome (will show WebAuthn, which is correct)
4. **Missing Session Test**: Navigate to `/attend` without session parameter (will show error message, which is correct)

**Expected Counterexamples**:
- Mobile users see WebAuthn UI immediately with no loading screen
- No deep link invocation occurs (can be verified with network/console logs)
- No visibility change monitoring happens
- Possible root causes: No mobile detection logic, no deep link handler module, no conditional rendering

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (mobile users with app), the fixed function produces the expected behavior (deep link attempt with fallback).

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := handleDeepLinkFlow_fixed(input.sessionId)
  ASSERT result.attempted == true
  ASSERT result.platform IN ['ios', 'android']
  ASSERT (result.opened == true) OR (result.fallbackNeeded == true)
  ASSERT loadingScreenWasDisplayed == true
END FOR
```

**Test Cases**:
1. **iOS Deep Link Success**: Mock visibility change, verify result.opened = true
2. **Android Deep Link Success**: Mock visibility change, verify result.opened = true
3. **iOS Deep Link Timeout**: Wait 2.5s, verify result.fallbackNeeded = true
4. **Android Deep Link Timeout**: Wait 2.5s, verify result.fallbackNeeded = true
5. **Loading Screen Display**: Verify DeepLinkLoading component renders during attempt

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (desktop users, non-mobile), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT handleDeepLinkFlow_original(input) = handleDeepLinkFlow_fixed(input)
  ASSERT webAuthnFlowStartsImmediately == true
  ASSERT noLoadingScreenShown == true
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for desktop users and edge cases, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Desktop User Preservation**: Verify desktop users see WebAuthn immediately, no deep link attempted
2. **Missing Session Preservation**: Verify error message shown, no deep link attempted
3. **Unauthenticated User Preservation**: Verify redirect to login, no deep link attempted
4. **WebAuthn Flow Preservation**: Verify mark attendance and register passkey functions unchanged
5. **Session Fetch Preservation**: Verify getOnlineSession still called and handled correctly
6. **Error Handling Preservation**: Verify network errors still show appropriate messages

### Unit Tests

**Deep Link Handler Module** (`lib/deep-link-handler.ts`):
- Test `detectMobile()` with various user agent strings (iOS, Android, Desktop, Unknown)
- Test `buildDeepLinkUrl()` with different configs and parameters
- Test `attemptDeepLink()` with mocked visibility events
- Test `attemptDeepLink()` timeout behavior
- Test `handleDeepLinkFlow()` for mobile vs desktop branching
- Test cleanup of event listeners and iframes

**Attend Page Component** (`app/attend/page.tsx`):
- Test rendering of DeepLinkLoading component when `deepLinkAttempting = true`
- Test rendering of nothing when `deepLinkResult.opened = true`
- Test rendering of WebAuthn UI when `deepLinkResult.fallbackNeeded = true`
- Test that session fetch only occurs when fallback is needed
- Test that existing WebAuthn functions still work

**Loading Component** (`components/features/attendance/deep-link-loading.tsx`):
- Test component renders without errors
- Test displays correct loading message
- Test includes expected icon elements

### Property-Based Tests

**Mobile Detection Properties**:
- Generate random user agent strings, verify mobile detection returns consistent results
- Verify iOS pattern matching never misclassifies Android or Desktop
- Verify Android pattern matching never misclassifies iOS or Desktop

**Deep Link URL Construction Properties**:
- Generate random session IDs with special characters, verify proper URL encoding
- Generate random config objects, verify valid URI scheme format
- Verify query parameters are correctly formatted

**Timeout Behavior Properties**:
- Generate random timeout values (500ms - 5000ms), verify fallback always occurs
- Verify cleanup always happens regardless of timeout value
- Verify no memory leaks with multiple rapid attempts

**Preservation Properties**:
- Generate random desktop user agents, verify no deep link attempt
- Generate random session fetch responses, verify correct handling
- Generate random error scenarios, verify existing error handling works

### Integration Tests

**Full Mobile Flow Integration**:
- Test complete flow from page load to deep link to fallback on mobile device
- Test complete flow from page load to deep link to success on mobile device
- Verify session data is fetched only when needed
- Verify WebAuthn UI appears after timeout

**Desktop Flow Integration**:
- Test complete flow from page load to WebAuthn on desktop
- Verify no deep link attempt occurs
- Verify session data fetched immediately
- Verify existing attendance marking works

**Error State Integration**:
- Test network failure during session fetch after deep link fallback
- Test invalid session ID with deep link attempt
- Test unauthenticated user flow with deep link in URL
- Verify all error messages display correctly

**Cross-Browser Integration**:
- Test on Chrome (desktop and mobile)
- Test on Safari (desktop and mobile)
- Test on Firefox (desktop and mobile)
- Test on Edge (desktop)
- Verify visibility API support and fallback

### Manual Testing Checklist

**Mobile Testing (Requires Physical Devices or Emulators)**:
- [ ] iOS Safari with app installed - verify app opens
- [ ] iOS Safari without app - verify WebAuthn fallback
- [ ] Android Chrome with app installed - verify app opens
- [ ] Android Chrome without app - verify WebAuthn fallback
- [ ] Loading screen displays during attempt
- [ ] Timeout occurs within 2.5 seconds
- [ ] No error messages on fallback

**Desktop Testing**:
- [ ] Chrome on Windows - verify WebAuthn immediately
- [ ] Firefox on Windows - verify WebAuthn immediately
- [ ] Safari on macOS - verify WebAuthn immediately
- [ ] Edge on Windows - verify WebAuthn immediately
- [ ] No loading screen shown
- [ ] No deep link attempted

**Edge Case Testing**:
- [ ] Missing session parameter - verify error message
- [ ] Invalid session ID - verify error handling
- [ ] Network offline during fallback - verify error message
- [ ] Multiple rapid clicks - verify no crashes
- [ ] User switches tabs during loading - verify behavior correct
- [ ] User returns to browser after app opens - verify no duplicate UI
