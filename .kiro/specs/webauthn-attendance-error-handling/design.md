# WebAuthn Attendance Error Handling Bugfix Design

## Overview

This design addresses multiple error handling and API communication issues in the WebAuthn attendance marking system. The bugs manifest as mismatched error response structures between frontend and backend, unclear error messages, inconsistent duplicate attendance handling, and missing feedback for expired authentication challenges. The fix will standardize error response structures, improve error message clarity, ensure consistent duplicate handling as a success case, add challenge expiration detection, and enhance WebAuthn configuration validation. This ensures students receive actionable feedback when attendance marking fails and the system properly handles edge cases like expired sessions and duplicate submissions.

## Glossary

- **Bug_Condition (C)**: The condition that triggers error handling bugs - when WebAuthn operations fail but the system returns inconsistent error structures, unclear messages, or treats success cases as errors
- **Property (P)**: The desired behavior for error cases - consistent error response structures with actionable user guidance
- **Preservation**: Existing successful WebAuthn authentication and core attendance functionality that must remain unchanged
- **Error Response Structure**: The JSON format returned by backend endpoints (currently inconsistent: `{error: "..."}`, `{error: "...", code: "..."}`, `{error: "...", detail: "..."}`)
- **Challenge**: Time-limited WebAuthn authentication token (expires after 5 minutes)
- **Duplicate Attendance**: When a student has already marked attendance for a session (currently inconsistently treated as error)
- **request() Function**: Frontend utility in `online-attendance.ts` that makes API calls and extracts error messages
- **WebAuthn Configuration**: Backend environment variables (`WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN`) required for passkey operations
- **noCredential Indicator**: Response flag indicating no passkey is registered (currently incorrectly uses `{error: "...", code: "PASSKEY_REQUIRED"}`)

## Bug Details

### Bug Condition

The bug manifests when WebAuthn operations encounter errors (missing credentials, expired challenges, configuration issues, duplicate submissions). The backend returns error responses with inconsistent structures across different endpoints, the frontend error parser only extracts partial information losing important context, challenge expiration is not properly communicated to users, duplicate attendance is inconsistently treated as an error instead of success, and WebAuthn configuration errors provide no specific guidance for resolution.

**Formal Specification:**
```
FUNCTION isBugCondition(operation)
  INPUT: operation of type WebAuthnOperation
  OUTPUT: boolean
  
  RETURN (operation.type == "getPasskeyAttendanceOptions" AND 
          operation.response.status == 409 AND 
          operation.response.body.code == "PASSKEY_REQUIRED")
         OR
         (operation.type IN ["attendanceOptions", "verifyPasskeyAttendance", "verifyPasskeyRegistration"] AND
          operation.response.error_structure NOT IN [STANDARD_ERROR_FORMAT])
         OR
         (operation.type == "verifyAttendance" AND
          operation.response.reason == "CHALLENGE_EXPIRED" AND
          frontend.error_display NOT INCLUDES "refresh" OR "retry")
         OR
         (operation.type == "submitOnlineAttendance" AND
          operation.response.status == 409 AND
          operation.response.body.duplicate == true AND
          frontend.treats_as_error == true)
         OR
         (operation.type == "attendanceOptions" AND
          operation.throws_exception AND
          backend.returns_400_without_structured_error)
         OR
         (operation.type IN ["any_webauthn_endpoint"] AND
          frontend.request_function.extracts ONLY error OR message AND
          IGNORES code, reason, detail)
         
  WHERE STANDARD_ERROR_FORMAT = {error: string, code?: string, detail?: string}
END FUNCTION
```

### Examples

**Example 1: API Error Response Structure Mismatch - No Credential Case**
- **Current Behavior**: Backend returns 409 with `{error: "No passkey registered", code: "PASSKEY_REQUIRED"}`, but frontend checks for `noCredential` flag and doesn't detect this condition
- **Expected Behavior**: Backend returns 409 with `{noCredential: true}` structure that frontend recognizes
- **Impact**: User sees generic error instead of being prompted to register passkey

**Example 2: Challenge Expiration - No User Guidance**
- **Current Behavior**: Backend returns 403 with `{error: "Passkey verification failed", reason: "CHALLENGE_EXPIRED"}`, frontend displays "Passkey verification failed" without explaining that challenge expired
- **Expected Behavior**: Frontend detects `CHALLENGE_EXPIRED` reason and displays "Session expired. Please refresh and try again" with actionable guidance
- **Impact**: User repeatedly attempts authentication without understanding the need to refresh

**Example 3: Duplicate Attendance - Inconsistent Error Handling**
- **Current Behavior**: Backend returns 409 with `{duplicate: true}`, frontend sometimes catches this and displays success, but handling is inconsistent across code paths
- **Expected Behavior**: All code paths consistently treat duplicate attendance as success case with appropriate message "You have already marked attendance for this session"
- **Impact**: Students receive error messages when attendance was actually successful

**Example 4: Bad Request (400) - Lost Configuration Details**
- **Current Behavior**: `attendanceOptions()` endpoint throws WebAuthn library error (e.g., "RP ID mismatch"), backend returns 400, frontend only extracts `body.error` and displays "Backend returned Bad Request (400)"
- **Expected Behavior**: Backend catches WebAuthn errors, logs full details, returns structured response with `{error: string, detail: string}`, frontend displays configuration-specific guidance
- **Impact**: Developers and users cannot diagnose WebAuthn configuration issues

**Example 5: Frontend Error Parser - Lost Context**
- **Current Behavior**: Backend returns `{error: "Verification failed", code: "INVALID_SIGNATURE", detail: "Counter mismatch detected"}`, frontend `request()` function only extracts `body.error ?? body.message` and loses `code` and `detail`
- **Expected Behavior**: Frontend parses all error fields (`error`, `code`, `reason`, `detail`) and includes them in thrown error message
- **Impact**: Detailed error context is lost, making debugging difficult

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Successful WebAuthn authentication with valid passkeys must continue to verify assertions and mark attendance correctly
- Passkey registration with valid biometrics must continue to store credentials and allow immediate attendance
- Session validation for expired/ended sessions must continue to reject attendance with appropriate errors
- Authentication and authorization (login redirects, JWT validation) must continue to work as before
- Audit logging for all attendance operations must continue to create log entries with full context
- Device credential tracking (lastUsedAt, counter updates) must continue to function correctly

**Scope:**
All successful WebAuthn operations, valid session flows, and proper authentication should be completely unaffected by this fix. This includes:
- Valid passkey authentication and attendance marking
- Successful registration flows
- Properly configured WebAuthn environments
- Non-duplicate attendance submissions
- Valid (non-expired) authentication challenges

**Note:** The actual expected correct behavior for error cases is defined in the Correctness Properties section. This section focuses on what must NOT change.

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Inconsistent Error Response Patterns**: Different endpoints evolved independently with different error structures
   - `/passkey/options` endpoint uses `{error: "...", code: "PASSKEY_REQUIRED"}` for missing credentials
   - `/passkey/verify` endpoint uses `{error: "...", reason: "..."}` for verification failures
   - Some endpoints return `{error: "...", detail: "..."}` for exceptions
   - No standardized error response type enforced across attendance routes

2. **Frontend Error Parser Incomplete**: The `request()` function in `online-attendance.ts` (line 32-33) only extracts:
   ```typescript
   const detail = body.error ?? body.message ?? `HTTP ${response.status}`;
   ```
   This loses `code`, `reason`, and `detail` fields that backend provides

3. **Missing noCredential Detection Logic**: Route handler checks for `'noCredential' in options` but service returns different structure
   - `webauthn.attendanceOptions()` returns `{noCredential: true}` correctly
   - But route handler at line 467-491 may have been modified to return error structure instead

4. **Challenge Expiration Not Parsed**: Frontend error handling in `attend\page.tsx` (lines 302-346) checks for many error patterns but doesn't specifically detect `CHALLENGE_EXPIRED` reason code

5. **Duplicate Attendance Handling Inconsistency**: 
   - `submitOnlineAttendance()` correctly returns `{success: false, duplicate: true}` with 409 status
   - Route handler at line 538-547 forwards this correctly
   - But frontend error handling at line 306-316 only catches duplicate in one specific error message pattern, not consistently across all code paths

6. **WebAuthn Configuration Validation Missing**: 
   - `attendanceOptions()` endpoint (line 467-491) catches exceptions and logs them but doesn't validate configuration proactively
   - WebAuthn library throws generic errors when `WEBAUTHN_RP_ID` or `WEBAUTHN_ORIGIN` misconfigured
   - No early validation of environment variables on server startup

## Correctness Properties

Property 1: Bug Condition - Consistent Error Response Structure

_For any_ WebAuthn API call that encounters an error, the backend SHALL return a consistent error response structure with `{error: string, code?: string, detail?: string}` format, and the frontend SHALL parse all three fields to provide complete error context to the user.

**Validates: Requirements 2.1, 2.2, 2.3, 2.13**

Property 2: Bug Condition - No Credential Detection

_For any_ attendance options request where no passkey is registered, the backend SHALL return 409 status with `{noCredential: true}` (not an error structure with code field), and the frontend SHALL detect this specific flag to prompt passkey registration.

**Validates: Requirements 2.1**

Property 3: Bug Condition - Challenge Expiration Feedback

_For any_ WebAuthn verification request with an expired challenge, the backend SHALL return 403 status with `{error: string, code: "CHALLENGE_EXPIRED", detail: string}` structure, and the frontend SHALL detect this specific code to display a user-friendly message with refresh guidance.

**Validates: Requirements 2.7, 2.8, 2.9**

Property 4: Bug Condition - Duplicate Attendance Success Handling

_For any_ attendance submission where the student has already marked attendance, the backend SHALL return 409 status with `{duplicate: true, message: string}`, and the frontend SHALL consistently treat this as a success case displaying "You have already marked attendance for this session" with success UI and auto-redirect.

**Validates: Requirements 2.10, 2.11, 2.12**

Property 5: Bug Condition - Configuration Error Guidance

_For any_ WebAuthn operation that fails due to configuration issues (RP_ID mismatch, Origin mismatch), the backend SHALL catch the error, log full details, and return 400 status with `{error: string, detail: string}` containing specific configuration guidance, and the frontend SHALL display this detail to help diagnose the issue.

**Validates: Requirements 2.4, 2.5, 2.6**

Property 6: Bug Condition - Enhanced Error Messages

_For any_ WebAuthn-specific error (credential not registered, assertion failed, timeout, cancellation), the frontend SHALL provide user-friendly messages with actionable guidance instead of technical error text, mapping error codes/reasons to helpful instructions.

**Validates: Requirements 2.14, 2.15**

Property 7: Preservation - Successful WebAuthn Operations

_For any_ input where a student successfully authenticates with a valid passkey, the fixed code SHALL produce exactly the same behavior as the original code, preserving the complete authentication and attendance marking flow.

**Validates: Requirements 3.1, 3.2**

Property 8: Preservation - Session Validation

_For any_ input involving session validation (expired sessions, ended sessions, invalid sessions), the fixed code SHALL produce exactly the same rejection behavior as the original code with appropriate error messages.

**Validates: Requirements 3.4, 3.5**

Property 9: Preservation - Audit Logging

_For any_ attendance operation (success or failure), the fixed code SHALL continue to create audit log entries with the same event types, actor IDs, success status, and reason fields as the original code.

**Validates: Requirements 3.10, 3.11, 3.12**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

#### File 1: `apps/web/lib/attendance/online-attendance.ts`

**Function**: `request()`

**Specific Changes**:
1. **Enhanced Error Parsing**: Modify error extraction logic to capture all error fields
   - Change from: `const detail = body.error ?? body.message ?? \`HTTP ${response.status}\`;`
   - Change to: Parse and include `code`, `reason`, and `detail` fields in error message
   - Format: `${body.error ?? body.message} [Code: ${body.code}] [Detail: ${body.detail}]` (omit if undefined)

2. **Error Context Logging**: Add comprehensive error logging before throwing
   - Include full response body in console.error output
   - Log: path, status, body, extracted detail for debugging

**Implementation Details**:
```typescript
// Before throwing error, construct detailed message
let detail = body.error ?? body.message ?? `HTTP ${response.status}`;
const errorParts = [detail];
if (body.code) errorParts.push(`[Code: ${body.code}]`);
if (body.reason) errorParts.push(`[Reason: ${body.reason}]`);
if (body.detail) errorParts.push(`[Detail: ${body.detail}]`);
const fullDetail = errorParts.join(' ');
throw new Error(`${fullDetail} (${response.status})`);
```

#### File 2: `apps/web/app/attend/page.tsx`

**Component**: `AttendPage` - `mark()` function

**Specific Changes**:

1. **Challenge Expiration Detection**: Add specific check for CHALLENGE_EXPIRED in error handling
   - After line 305, add check: `if (errorMsg.includes("challenge_expired") || errorMsg.includes("challenge expired"))`
   - Set message: "Session expired."
   - Set passkeyMessage: "The authentication challenge has expired. Please refresh the page and try again."
   - Provide "Refresh Page" button instead of "Try Again"

2. **Duplicate Attendance Consistency**: Improve duplicate detection pattern
   - Current check at line 306-316 handles some cases
   - Ensure catch block consistently checks for: `errorMsg.includes("409")` OR `errorMsg.includes("duplicate")` OR `errorMsg.includes("already marked")`
   - Always set `success = true` and auto-redirect when duplicate detected

3. **Configuration Error Guidance**: Enhance Bad Request (400) error messages
   - Current handling at lines 319-336 provides some guidance
   - Add check for: `errorMsg.includes("rp") || errorMsg.includes("origin") || errorMsg.includes("configuration")`
   - Display specific message: "System configuration error. The WebAuthn settings may be incorrect. Please contact support or check backend logs."

4. **Error Code-Based Mapping**: Add helper function to map error codes to user-friendly messages
   - Extract `[Code: ...]` pattern from error message using regex
   - Map codes to messages:
     - `CHALLENGE_EXPIRED` → "Your session expired. Please refresh and try again."
     - `CREDENTIAL_NOT_REGISTERED` → "No passkey found. Please register your device biometrics first."
     - `ASSERTION_FAILED` → "Authentication failed. Please ensure you're using the correct biometric."
     - `INVALID_SIGNATURE` → "Security verification failed. Please try again."

5. **Retriable Error Button Logic**: Expand conditions for showing "Try Again" button
   - Current logic at line 352-365 shows button for some cases
   - Add conditions for: `CHALLENGE_EXPIRED` (show "Refresh Page" instead), configuration errors (show "Contact Support"), network errors (show "Try Again")

#### File 3: `apps/backend/src/modules/attendance/attendance.route.ts`

**Endpoint**: `/online/sessions/:sessionId/passkey/options`

**Specific Changes**:

1. **Standardized Error Structure**: Ensure try-catch block returns consistent format
   - Current implementation at lines 473-491 returns `{error: string, detail: string}` on error
   - Ensure this format is consistent: always include `detail` field when available
   - Add `code` field for categorization: `{error: string, code: "WEBAUTHN_OPTIONS_FAILED", detail: string}`

2. **WebAuthn Configuration Validation**: Add proactive validation before generating options
   - Check: `if (!env.webauthnRpId || !env.webauthnOrigin)` throw configuration error
   - Return 500 (not 400) for configuration issues: `{error: "Server configuration error", code: "CONFIG_INVALID", detail: "WEBAUTHN_RP_ID or WEBAUTHN_ORIGIN not configured"}`

3. **Enhanced Error Logging**: Improve logging detail
   - Current log at line 489 includes basic context
   - Add: WebAuthn library error type, stack trace, configuration values (sanitized)

**Endpoint**: `/online/sessions/:sessionId/passkey/verify`

**Specific Changes**:

1. **Challenge Expiration Response**: Ensure CHALLENGE_EXPIRED returns proper structure
   - Current implementation at line 533-537 returns `{error: string, reason: string}`
   - Change to include `code` field: `{error: "Authentication challenge expired", code: "CHALLENGE_EXPIRED", detail: "Please refresh and try again"}`
   - Keep 403 status code

2. **Duplicate Attendance Passthrough**: Ensure duplicate response reaches frontend correctly
   - Current implementation at line 547 returns result as-is
   - Ensure `{duplicate: true}` structure is preserved (already correct)
   - Add user-friendly `message` field: `{duplicate: true, message: "You have already marked attendance for this session"}`

3. **Assertion Failed Details**: Enhance verification failure response
   - Current catch block at lines 507-521 returns `{error: string, reason: string}`
   - Add `code` field: `{error: "Passkey verification failed", code: "ASSERTION_FAILED", reason: reason, detail: "Please ensure you're using the correct registered device"}`

#### File 4: `apps/backend/src/modules/attendance/webauthn.service.ts`

**Function**: `attendanceOptions()`

**Specific Changes**:

1. **Early Configuration Check**: Validate environment variables before calling WebAuthn library
   - Add at start of function: `if (!env.webauthnRpId) throw new Error("WEBAUTHN_RP_ID not configured");`
   - Add: `if (!env.webauthnOrigin) throw new Error("WEBAUTHN_ORIGIN not configured");`
   - These will be caught by route handler and returned as 500 errors

2. **Preserve noCredential Logic**: Ensure `{noCredential: true}` return is maintained
   - Current implementation at line 122 is correct: `if (credentials.length === 0) return {noCredential: true as const};`
   - No changes needed - already returns correct structure

**Function**: `verifyAttendance()`

**Specific Changes**:

1. **Enhanced Error Return Structure**: Ensure all error returns include consistent fields
   - Line 159: `CHALLENGE_EXPIRED` return already has `{verified: false, reason: "CHALLENGE_EXPIRED"}`
   - No change needed, but route handler should add `code` and `detail` fields
   - Line 165: `CREDENTIAL_NOT_REGISTERED` return already consistent
   - Line 177: `ASSERTION_FAILED` return already consistent

#### File 5: `apps/backend/src/modules/attendance/attendance.service.ts`

**Function**: `submitOnlineAttendance()`

**Specific Changes**:

1. **Duplicate Response Enhancement**: Add user-friendly message to duplicate response
   - Current duplicate return at line ~395 (based on code structure): `{success: false, duplicate: true as const}`
   - Change to: `{success: false, duplicate: true as const, message: "You have already marked attendance for this session"}`
   - This ensures frontend always has a clear message to display

#### File 6: Backend Configuration Validation (New)

**File**: `apps/backend/src/config/env.ts` or startup validation

**Specific Changes**:

1. **Startup Configuration Validation**: Add validation on server start
   - Check WebAuthn configuration completeness
   - Log warning if `WEBAUTHN_RP_ID` or `WEBAUTHN_ORIGIN` not set
   - Provide guidance in logs: "WebAuthn is not configured. Set WEBAUTHN_RP_ID and WEBAUTHN_ORIGIN environment variables."

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior. We will test each error handling path independently, then test integration across the full attendance flow.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate WebAuthn error conditions and observe how the system currently handles them. Run these tests on the UNFIXED code to observe failures and understand the root causes.

**Test Cases**:

1. **Error Structure Mismatch Test**: Call `getPasskeyAttendanceOptions()` with no registered passkey
   - **Expected on Unfixed Code**: Returns inconsistent structure, frontend doesn't detect `noCredential` flag
   - **Observation Goal**: Confirm that backend returns wrong structure or frontend parser loses information

2. **Challenge Expiration Test**: Create expired challenge, attempt authentication
   - **Expected on Unfixed Code**: Backend returns `reason: "CHALLENGE_EXPIRED"` but frontend displays generic error without refresh guidance
   - **Observation Goal**: Confirm challenge expiration is not properly communicated to user

3. **Duplicate Attendance Test**: Attempt to mark attendance twice for same session
   - **Expected on Unfixed Code**: Inconsistent handling - sometimes treated as error, sometimes as success
   - **Observation Goal**: Identify which code paths fail to handle duplicate correctly

4. **Bad Request Configuration Error Test**: Misconfigure `WEBAUTHN_RP_ID`, attempt authentication
   - **Expected on Unfixed Code**: Generic "Bad Request (400)" message without configuration details
   - **Observation Goal**: Confirm that WebAuthn library errors don't provide specific guidance

5. **Frontend Error Parser Test**: Mock API response with `{error: "...", code: "TEST_CODE", detail: "Test detail"}`
   - **Expected on Unfixed Code**: Frontend only displays `error` field, loses `code` and `detail`
   - **Observation Goal**: Confirm that frontend `request()` function doesn't parse all fields

**Expected Counterexamples**:
- Frontend error messages missing important context (`code`, `detail` fields lost)
- Duplicate attendance showing error UI instead of success
- Challenge expiration not providing "refresh page" guidance
- Configuration errors not providing specific troubleshooting steps
- Possible causes: inconsistent API response structures, incomplete frontend parsing, missing error code detection

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed system produces the expected behavior.

**Pseudocode:**
```
FOR ALL operation WHERE isBugCondition(operation) DO
  result := executeOperation_fixed(operation)
  ASSERT consistentErrorStructure(result)
  ASSERT actionableUserMessage(result)
  ASSERT correctStatusCode(result)
  ASSERT preservesAuditLogging(result)
END FOR
```

**Test Categories**:

1. **Consistent Error Structure Tests**:
   - Test all error endpoints return `{error, code?, detail?}` format
   - Test frontend parses and displays all fields correctly
   - Test `noCredential` flag is detected and handled

2. **Challenge Expiration Tests**:
   - Test expired challenge returns `code: "CHALLENGE_EXPIRED"`
   - Test frontend displays "Session expired. Please refresh and try again"
   - Test "Refresh Page" button is shown (not "Try Again")

3. **Duplicate Attendance Tests**:
   - Test duplicate submission returns `{duplicate: true, message: string}`
   - Test frontend sets `success = true` consistently
   - Test success UI is displayed with auto-redirect

4. **Configuration Error Tests**:
   - Test missing `WEBAUTHN_RP_ID` returns specific error with configuration guidance
   - Test WebAuthn library errors include `detail` field with troubleshooting info
   - Test frontend displays configuration-specific messages

5. **Enhanced Error Message Tests**:
   - Test each error code maps to user-friendly message
   - Test actionable guidance is provided (register passkey, refresh page, contact support)
   - Test retriable errors show appropriate button (Try Again vs Refresh vs Contact Support)

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed system produces the same result as the original system.

**Pseudocode:**
```
FOR ALL operation WHERE NOT isBugCondition(operation) DO
  ASSERT executeOperation_original(operation) = executeOperation_fixed(operation)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for successful operations, then write property-based tests capturing that behavior.

**Test Cases**:

1. **Successful Authentication Preservation**: Observe that valid passkey authentication marks attendance correctly on unfixed code
   - **Property**: For any valid passkey authentication, fixed code produces same successful attendance record
   - **Test**: Generate random valid authentication scenarios, verify same audit logs created

2. **Session Validation Preservation**: Observe that expired/ended session rejection works correctly on unfixed code
   - **Property**: For any expired or invalid session, fixed code produces same rejection behavior
   - **Test**: Generate random expired session scenarios, verify same error responses

3. **Registration Flow Preservation**: Observe that passkey registration works correctly on unfixed code
   - **Property**: For any valid registration request, fixed code produces same credential storage
   - **Test**: Generate random registration scenarios, verify same database records created

4. **Authorization Preservation**: Observe that non-student access is rejected correctly on unfixed code
   - **Property**: For any unauthorized user, fixed code produces same 401/403 responses
   - **Test**: Test with lecturer/unauthenticated users, verify same rejection behavior

5. **Audit Logging Preservation**: Observe that all operations create audit logs on unfixed code
   - **Property**: For any operation (success or failure), fixed code creates same audit log structure
   - **Test**: Run various operations, verify audit log entries match original format

### Unit Tests

- Test `request()` function with various error response structures (with/without code, reason, detail)
- Test error message construction for each error code (CHALLENGE_EXPIRED, CREDENTIAL_NOT_REGISTERED, etc.)
- Test duplicate attendance detection logic with different error message patterns
- Test configuration validation on server startup
- Test WebAuthn service error returns for expired challenges, missing credentials
- Test route handler error response formatting for 400, 403, 409 status codes
- Test frontend error parsing and user message generation

### Property-Based Tests

- Generate random WebAuthn error responses with various combinations of error, code, reason, detail fields - verify frontend always extracts available information
- Generate random session states (expired, active, ended) - verify consistent handling across all endpoints
- Generate random duplicate submission scenarios - verify always treated as success with consistent message
- Generate random valid authentication flows - verify fixed code preserves exact same successful behavior
- Generate random configuration states (valid, missing RP_ID, missing Origin) - verify appropriate error responses

### Integration Tests

- Test full attendance flow with challenge expiration: start authentication, wait for expiration, verify user sees refresh guidance
- Test full attendance flow with duplicate submission: mark attendance, attempt again, verify success message displayed
- Test full attendance flow with no passkey: attempt attendance without registration, verify prompted to register
- Test full attendance flow with configuration error: misconfigure backend, verify user sees configuration-specific error
- Test full attendance flow with network error: simulate network failure, verify user sees "Try Again" button
- Test switching between error states: challenge expires, user refreshes, authentication succeeds - verify state management works correctly
- Test concurrent operations: multiple students marking attendance simultaneously with various error conditions - verify no race conditions
