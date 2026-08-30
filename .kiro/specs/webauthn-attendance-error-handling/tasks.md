# Implementation Plan

- [ ] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - WebAuthn Error Handling Issues
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior - they will validate the fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist
  - **Scoped PBT Approach**: Scope properties to concrete failing cases to ensure reproducibility
  - Test 1.1: Error Structure Mismatch - Call `getPasskeyAttendanceOptions()` with no registered passkey
    - Verify backend returns `{noCredential: true}` (not `{error: "...", code: "PASSKEY_REQUIRED"}`)
    - Verify frontend detects `noCredential` flag correctly
  - Test 1.2: Challenge Expiration - Create expired challenge, attempt authentication
    - Verify backend returns `{error: string, code: "CHALLENGE_EXPIRED", detail: string}`
    - Verify frontend displays "Session expired. Please refresh and try again" with "Refresh Page" button
  - Test 1.3: Duplicate Attendance - Attempt to mark attendance twice for same session
    - Verify backend returns `{duplicate: true, message: string}` with 409 status
    - Verify frontend treats as success case with "You have already marked attendance" message and auto-redirect
  - Test 1.4: Configuration Error - Misconfigure `WEBAUTHN_RP_ID`, attempt authentication
    - Verify backend returns `{error: string, code: "CONFIG_INVALID", detail: string}` with specific guidance
    - Verify frontend displays configuration-specific error message
  - Test 1.5: Frontend Error Parser - Mock API response with `{error: "Test error", code: "TEST_CODE", detail: "Test detail"}`
    - Verify frontend extracts and displays all three fields (error, code, detail)
    - Verify error message includes full context
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bugs exist)
  - Document counterexamples found to understand root causes:
    - Frontend error messages missing important context (code, detail fields lost)
    - Duplicate attendance showing error UI instead of success
    - Challenge expiration not providing "refresh page" guidance
    - Configuration errors not providing specific troubleshooting steps
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 2.1, 2.2, 2.3, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Successful WebAuthn Operations and Core Functionality
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (successful operations)
  - Test 2.1: Successful Authentication Preservation
    - Observe: Valid passkey authentication marks attendance correctly on unfixed code
    - Write property: For any valid passkey authentication with non-expired challenge, result equals successful attendance record with audit log
    - Verify test passes on UNFIXED code
  - Test 2.2: Session Validation Preservation
    - Observe: Expired/ended session rejection works correctly on unfixed code
    - Write property: For any expired or invalid session, result equals appropriate rejection with error message
    - Verify test passes on UNFIXED code
  - Test 2.3: Registration Flow Preservation
    - Observe: Valid passkey registration stores credentials correctly on unfixed code
    - Write property: For any valid registration request, result equals stored credential in database
    - Verify test passes on UNFIXED code
  - Test 2.4: Authorization Preservation
    - Observe: Non-student access is rejected correctly on unfixed code
    - Write property: For any unauthorized user (lecturer, unauthenticated), result equals 401/403 rejection
    - Verify test passes on UNFIXED code
  - Test 2.5: Audit Logging Preservation
    - Observe: All operations create audit logs with same structure on unfixed code
    - Write property: For any operation (success or failure), fixed code creates audit log with same event types, actor IDs, success status
    - Verify test passes on UNFIXED code
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.10, 3.11, 3.12_

- [ ] 3. Fix WebAuthn attendance error handling issues

  - [ ] 3.1 Enhance frontend error parsing in `request()` function
    - **File**: `apps/web/lib/attendance/online-attendance.ts`
    - Modify error extraction logic to capture all error fields (error, code, reason, detail)
    - Change from: `const detail = body.error ?? body.message ?? \`HTTP ${response.status}\`;`
    - Change to: Parse and include code, reason, and detail fields in error message
    - Format: `${body.error ?? body.message} [Code: ${body.code}] [Reason: ${body.reason}] [Detail: ${body.detail}]` (omit if undefined)
    - Add comprehensive error logging before throwing (include full response body)
    - Implementation:
      ```typescript
      let detail = body.error ?? body.message ?? `HTTP ${response.status}`;
      const errorParts = [detail];
      if (body.code) errorParts.push(`[Code: ${body.code}]`);
      if (body.reason) errorParts.push(`[Reason: ${body.reason}]`);
      if (body.detail) errorParts.push(`[Detail: ${body.detail}]`);
      const fullDetail = errorParts.join(' ');
      throw new Error(`${fullDetail} (${response.status})`);
      ```
    - _Bug_Condition: isBugCondition(operation) where operation.type IN ["any_webauthn_endpoint"] AND frontend.request_function.extracts ONLY error OR message AND IGNORES code, reason, detail_
    - _Expected_Behavior: Frontend SHALL parse all error fields (error, code, reason, detail) and include them in thrown error message for complete error context_
    - _Preservation: Successful WebAuthn operations continue to work unchanged_
    - _Requirements: 2.2, 2.3, 2.13_

  - [ ] 3.2 Add challenge expiration detection in frontend
    - **File**: `apps/web/app/attend/page.tsx`
    - **Component**: `AttendPage` - `mark()` function
    - After line 305, add specific check for CHALLENGE_EXPIRED in error handling
    - Add check: `if (errorMsg.includes("CHALLENGE_EXPIRED") || errorMsg.includes("challenge expired"))`
    - Set message: "Session expired."
    - Set passkeyMessage: "The authentication challenge has expired. Please refresh the page and try again."
    - Provide "Refresh Page" button instead of "Try Again"
    - _Bug_Condition: isBugCondition(operation) where operation.type == "verifyAttendance" AND operation.response.reason == "CHALLENGE_EXPIRED" AND frontend.error_display NOT INCLUDES "refresh" OR "retry"_
    - _Expected_Behavior: Frontend SHALL detect CHALLENGE_EXPIRED code and display user-friendly message with refresh guidance_
    - _Preservation: Successful authentication continues to mark attendance correctly_
    - _Requirements: 2.7, 2.8, 2.9_

  - [ ] 3.3 Improve duplicate attendance consistency in frontend
    - **File**: `apps/web/app/attend/page.tsx`
    - **Component**: `AttendPage` - `mark()` function
    - Ensure catch block consistently checks for: `errorMsg.includes("409")` OR `errorMsg.includes("duplicate")` OR `errorMsg.includes("already marked")`
    - Always set `success = true` when duplicate detected
    - Display success message: "You have already marked attendance for this session"
    - Enable auto-redirect for duplicate case
    - _Bug_Condition: isBugCondition(operation) where operation.type == "submitOnlineAttendance" AND operation.response.status == 409 AND operation.response.body.duplicate == true AND frontend.treats_as_error == true_
    - _Expected_Behavior: Frontend SHALL consistently treat duplicate attendance as success case with appropriate message and auto-redirect_
    - _Preservation: Non-duplicate attendance submissions continue to work unchanged_
    - _Requirements: 2.10, 2.11, 2.12_

  - [ ] 3.4 Add configuration error guidance in frontend
    - **File**: `apps/web/app/attend/page.tsx`
    - **Component**: `AttendPage` - `mark()` function
    - Add check for: `errorMsg.includes("rp") || errorMsg.includes("origin") || errorMsg.includes("configuration") || errorMsg.includes("CONFIG_INVALID")`
    - Display specific message: "System configuration error. The WebAuthn settings may be incorrect. Please contact support or check backend logs."
    - Show "Contact Support" button instead of "Try Again"
    - _Bug_Condition: isBugCondition(operation) where operation.type == "attendanceOptions" AND operation.throws_exception AND backend.returns_400_without_structured_error_
    - _Expected_Behavior: Frontend SHALL display configuration-specific guidance to help diagnose WebAuthn issues_
    - _Preservation: Valid WebAuthn configurations continue to work unchanged_
    - _Requirements: 2.4, 2.5, 2.6_

  - [ ] 3.5 Add error code-based user message mapping in frontend
    - **File**: `apps/web/app/attend/page.tsx`
    - **Component**: `AttendPage` - `mark()` function
    - Add helper function to extract `[Code: ...]` pattern from error message using regex
    - Map error codes to user-friendly messages:
      - `CHALLENGE_EXPIRED` → "Your session expired. Please refresh and try again."
      - `CREDENTIAL_NOT_REGISTERED` → "No passkey found. Please register your device biometrics first."
      - `ASSERTION_FAILED` → "Authentication failed. Please ensure you're using the correct biometric."
      - `INVALID_SIGNATURE` → "Security verification failed. Please try again."
      - `PASSKEY_REQUIRED` → "You need to register a passkey to mark attendance."
      - `CONFIG_INVALID` → "System configuration error. Please contact support."
    - Expand button logic for retriable errors (Try Again vs Refresh vs Contact Support)
    - _Bug_Condition: isBugCondition(operation) where operation.type IN ["any_webauthn_endpoint"] AND frontend displays technical error text instead of user-friendly guidance_
    - _Expected_Behavior: Frontend SHALL provide actionable user-friendly messages with guidance for each error type_
    - _Preservation: Successful operations continue with same user experience_
    - _Requirements: 2.14, 2.15_

  - [ ] 3.6 Standardize backend error structure for attendance options endpoint
    - **File**: `apps/backend/src/modules/attendance/attendance.route.ts`
    - **Endpoint**: `/online/sessions/:sessionId/passkey/options` (lines 473-491)
    - Ensure try-catch block returns consistent format with code field: `{error: string, code: "WEBAUTHN_OPTIONS_FAILED", detail: string}`
    - Add proactive WebAuthn configuration validation before generating options
    - Check: `if (!env.webauthnRpId || !env.webauthnOrigin)` return 500 (not 400) with `{error: "Server configuration error", code: "CONFIG_INVALID", detail: "WEBAUTHN_RP_ID or WEBAUTHN_ORIGIN not configured"}`
    - Enhance error logging: include WebAuthn library error type, stack trace, configuration values (sanitized)
    - _Bug_Condition: isBugCondition(operation) where operation.type IN ["attendanceOptions"] AND operation.response.error_structure NOT IN [STANDARD_ERROR_FORMAT]_
    - _Expected_Behavior: Backend SHALL return consistent error response structure with error, code, and detail fields_
    - _Preservation: Successful options generation continues unchanged_
    - _Requirements: 2.1, 2.4, 2.5, 2.6_

  - [ ] 3.7 Enhance backend error structure for passkey verification endpoint
    - **File**: `apps/backend/src/modules/attendance/attendance.route.ts`
    - **Endpoint**: `/online/sessions/:sessionId/passkey/verify` (lines 507-547)
    - Ensure CHALLENGE_EXPIRED returns proper structure: `{error: "Authentication challenge expired", code: "CHALLENGE_EXPIRED", detail: "Please refresh and try again"}`
    - Keep 403 status code for expired challenges
    - Ensure duplicate response includes message field: `{duplicate: true, message: "You have already marked attendance for this session"}`
    - Enhance assertion failed response: `{error: "Passkey verification failed", code: "ASSERTION_FAILED", reason: reason, detail: "Please ensure you're using the correct registered device"}`
    - _Bug_Condition: isBugCondition(operation) where operation.type IN ["verifyPasskeyAttendance"] AND operation.response.error_structure NOT IN [STANDARD_ERROR_FORMAT]_
    - _Expected_Behavior: Backend SHALL return consistent error structure with actionable detail for all verification failures_
    - _Preservation: Successful verifications continue to mark attendance correctly_
    - _Requirements: 2.1, 2.7, 2.10, 2.11_

  - [ ] 3.8 Add early configuration validation in WebAuthn service
    - **File**: `apps/backend/src/modules/attendance/webauthn.service.ts`
    - **Function**: `attendanceOptions()`
    - Add at start of function: `if (!env.webauthnRpId) throw new Error("WEBAUTHN_RP_ID not configured");`
    - Add: `if (!env.webauthnOrigin) throw new Error("WEBAUTHN_ORIGIN not configured");`
    - These will be caught by route handler and returned as 500 errors with CONFIG_INVALID code
    - Preserve existing `noCredential` logic at line 122 (already correct): `if (credentials.length === 0) return {noCredential: true as const};`
    - _Bug_Condition: isBugCondition(operation) where WebAuthn configuration is missing and library throws generic errors_
    - _Expected_Behavior: Backend SHALL validate configuration early and provide specific error guidance_
    - _Preservation: Valid configurations continue to generate options correctly_
    - _Requirements: 2.4, 2.5, 2.6_

  - [ ] 3.9 Enhance duplicate response in attendance service
    - **File**: `apps/backend/src/modules/attendance/attendance.service.ts`
    - **Function**: `submitOnlineAttendance()`
    - Locate duplicate return (likely around line 395)
    - Change from: `{success: false, duplicate: true as const}`
    - Change to: `{success: false, duplicate: true as const, message: "You have already marked attendance for this session"}`
    - Ensures frontend always has clear message to display
    - _Bug_Condition: isBugCondition(operation) where duplicate attendance lacks user-friendly message_
    - _Expected_Behavior: Backend SHALL include message field in duplicate response for consistent frontend display_
    - _Preservation: Non-duplicate submissions continue unchanged_
    - _Requirements: 2.10, 2.11, 2.12_

  - [ ] 3.10 Add startup configuration validation (optional enhancement)
    - **File**: `apps/backend/src/config/env.ts` or server startup
    - Add validation on server start to check WebAuthn configuration completeness
    - Log warning if `WEBAUTHN_RP_ID` or `WEBAUTHN_ORIGIN` not set
    - Provide guidance in logs: "WebAuthn is not configured. Set WEBAUTHN_RP_ID and WEBAUTHN_ORIGIN environment variables."
    - This provides early warning to developers before runtime errors occur
    - _Bug_Condition: Configuration issues not detected until runtime_
    - _Expected_Behavior: Server startup SHALL validate and warn about missing WebAuthn configuration_
    - _Preservation: All existing functionality continues unchanged_
    - _Requirements: 2.4, 2.5_

  - [ ] 3.11 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - WebAuthn Error Handling Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 1 - do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the expected behavior is satisfied
    - Run all bug condition exploration tests from step 1:
      - Test 1.1: Error Structure Mismatch
      - Test 1.2: Challenge Expiration
      - Test 1.3: Duplicate Attendance
      - Test 1.4: Configuration Error
      - Test 1.5: Frontend Error Parser
    - **EXPECTED OUTCOME**: Tests PASS (confirms bugs are fixed)
    - Verify each test now passes with expected error structures and user messages
    - _Requirements: 2.1, 2.2, 2.3, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15_

  - [ ] 3.12 Verify preservation tests still pass
    - **Property 2: Preservation** - No Regressions in Successful Operations
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run all preservation property tests from step 2:
      - Test 2.1: Successful Authentication Preservation
      - Test 2.2: Session Validation Preservation
      - Test 2.3: Registration Flow Preservation
      - Test 2.4: Authorization Preservation
      - Test 2.5: Audit Logging Preservation
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fixes
    - Verify successful operations produce identical behavior to unfixed code
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.10, 3.11, 3.12_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run complete test suite (bug condition + preservation tests)
  - Verify all error handling paths work correctly
  - Verify no regressions in successful operations
  - Test integration scenarios:
    - Full attendance flow with challenge expiration → user sees refresh guidance
    - Full attendance flow with duplicate submission → user sees success message
    - Full attendance flow with no passkey → user prompted to register
    - Full attendance flow with configuration error → user sees configuration-specific error
    - Concurrent operations with various error conditions → no race conditions
  - Ask the user if questions arise
