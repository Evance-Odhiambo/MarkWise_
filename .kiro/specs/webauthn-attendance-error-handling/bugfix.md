# Bugfix Requirements Document

## Introduction

The WebAuthn attendance marking system has multiple error handling and API communication issues that prevent students from successfully marking attendance. The system experiences Bad Request (400) errors, mismatched error response structures between frontend and backend, unclear error messages, inconsistent duplicate attendance handling, and no feedback for expired authentication challenges. These issues result in poor user experience where students cannot mark attendance and receive only generic error messages without actionable guidance.

## Bug Analysis

### Current Behavior (Defect)

#### 1. API Error Response Structure Mismatch

1.1 WHEN the backend returns a 409 status with `{error: "...", code: "PASSKEY_REQUIRED"}` for missing passkey credentials THEN the frontend does not detect the noCredential condition

1.2 WHEN the backend returns error responses with different structures (`{error: "..."}`, `{error: "...", code: "..."}`, `{error: "...", detail: "..."}`) THEN the frontend error parser only extracts `error` or `message` fields and loses important detail

1.3 WHEN the `/online/sessions/:sessionId/passkey/options` endpoint throws an exception THEN the backend returns a 400 status but the error detail is not properly logged or returned in a structured format

#### 2. Bad Request (400) Errors

1.4 WHEN `getPasskeyAttendanceOptions()` is called and WebAuthn configuration (RP_ID, Origin) is incorrect THEN the backend returns a generic 400 error without specific configuration validation feedback

1.5 WHEN the backend encounters WebAuthn library errors during option generation THEN the error details are logged but not returned to the frontend in the response body

1.6 WHEN the frontend receives a 400 error response THEN the user sees a generic "Bad Request (400)" message instead of the specific underlying issue

#### 3. Challenge Expiration Handling

1.7 WHEN a WebAuthn challenge expires after 5 minutes THEN the backend returns `{verified: false, reason: "CHALLENGE_EXPIRED"}` but the frontend does not detect or handle this specific case

1.8 WHEN `verifyAttendance()` returns `{verified: false, reason: "CHALLENGE_EXPIRED"}` THEN the backend returns a 403 status with this reason, but the frontend error message does not prompt the user to refresh or retry

1.9 WHEN a student attempts authentication with an expired challenge THEN no clear user feedback indicates the challenge needs to be refreshed

#### 4. Duplicate Attendance Handling

1.10 WHEN a student attempts to mark attendance twice for the same session THEN the backend returns a 409 status with `{duplicate: true}`, but the frontend inconsistently treats this as an error instead of success

1.11 WHEN the frontend receives a 409 response during attendance verification THEN it catches the error and displays "You have already marked attendance for this session" as a success, but this handling is not consistent across all code paths

1.12 WHEN `submitOnlineAttendance()` detects a duplicate THEN it returns `{duplicate: true}` with 409 status, but the calling code in `verifyPasskeyAttendance()` route does not ensure this reaches the frontend correctly

#### 5. Error Message User Experience

1.13 WHEN backend error responses reach the frontend THEN the `request()` function in `online-attendance.ts` only extracts `body.error ?? body.message` and loses additional context like `code`, `reason`, or `detail`

1.14 WHEN WebAuthn-specific errors occur (credential not registered, assertion failed, challenge expired) THEN the user sees technical error messages without actionable guidance on how to resolve the issue

1.15 WHEN the "Try Again" button is clicked after a 400 error THEN the same error recurs because the underlying configuration or validation issue was not addressed

### Expected Behavior (Correct)

#### 2. API Error Response Structure Consistency

2.1 WHEN the backend needs to indicate no passkey is registered THEN it SHALL return 409 status with `{noCredential: true}` (not `{error: "...", code: "PASSKEY_REQUIRED"}`)

2.2 WHEN the backend returns error responses THEN it SHALL use a consistent structure with `{error: string, code?: string, detail?: string}` and the frontend SHALL parse all three fields

2.3 WHEN the `/online/sessions/:sessionId/passkey/options` endpoint encounters an error THEN it SHALL return a structured error response with specific details about the failure cause

#### 3. WebAuthn Configuration Validation

2.4 WHEN `attendanceOptions()` is called and RP_ID or Origin configuration is missing or invalid THEN the backend SHALL validate these settings and return a 500 error with a clear message identifying the configuration issue

2.5 WHEN WebAuthn library errors occur during option generation THEN the backend SHALL catch these errors, log them with full details, and return a 400 response with `{error: string, detail: string}` structure

2.6 WHEN the frontend receives a 400 error with WebAuthn configuration details THEN it SHALL display specific guidance to the user (e.g., "Backend configuration error: WEBAUTHN_RP_ID mismatch")

#### 4. Challenge Expiration Detection and Feedback

2.7 WHEN a WebAuthn challenge has expired THEN the backend SHALL return 403 status with `{error: "Authentication challenge expired", code: "CHALLENGE_EXPIRED", detail: "Please refresh and try again"}`

2.8 WHEN the frontend receives a CHALLENGE_EXPIRED error THEN it SHALL display a message prompting the user to refresh the page and automatically reset the authentication flow state

2.9 WHEN a student's authentication times out or expires THEN the system SHALL provide a clear "Session Expired" message with a "Refresh" button to restart the flow

#### 5. Consistent Duplicate Attendance Success Handling

2.10 WHEN a student has already marked attendance for a session THEN the system SHALL treat this as a success case and display "You have already marked attendance for this session" with a success indicator

2.11 WHEN `verifyPasskeyAttendance()` endpoint returns a 409 duplicate response THEN the frontend SHALL catch this, set `success = true`, display the success message, and auto-redirect to the dashboard

2.12 WHEN duplicate attendance is detected at any stage (during verification or submission) THEN the response SHALL consistently use 409 status with `{duplicate: true, message: string}` structure

#### 6. Enhanced Error Messages and User Guidance

2.13 WHEN backend errors occur THEN the frontend SHALL parse and display all available error context including `error`, `code`, `reason`, and `detail` fields

2.14 WHEN WebAuthn-specific errors occur THEN the system SHALL provide user-friendly messages with actionable guidance:
- No credential: "Please register your device biometrics first"
- Challenge expired: "Session expired. Please refresh and try again"
- Configuration error: "System configuration issue. Please contact support"
- Network error: "Cannot connect to server. Please check your connection"

2.15 WHEN a retriable error occurs (timeout, cancellation, network issue) THEN the frontend SHALL display a "Try Again" button that resets state and attempts the authentication flow again

### Unchanged Behavior (Regression Prevention)

#### 7. WebAuthn Core Functionality

3.1 WHEN a student successfully authenticates with a valid passkey THEN the system SHALL CONTINUE TO verify the assertion and mark attendance correctly

3.2 WHEN passkey registration is successful THEN the system SHALL CONTINUE TO store credentials in the database and allow immediate attendance marking

3.3 WHEN a student attempts to register a duplicate passkey THEN the system SHALL CONTINUE TO return a 409 error preventing duplicate registration

#### 8. Session Validation

3.4 WHEN an online attendance session is valid and not expired THEN the system SHALL CONTINUE TO allow attendance marking

3.5 WHEN an online attendance session is ended or expired THEN the system SHALL CONTINUE TO reject attendance attempts with appropriate error messages

3.6 WHEN a student is not enrolled in the unit for a session THEN the system SHALL CONTINUE TO prevent attendance marking

#### 9. Authentication and Authorization

3.7 WHEN a student is not logged in THEN the system SHALL CONTINUE TO redirect to the login page with a return URL

3.8 WHEN a non-student user attempts to mark attendance THEN the system SHALL CONTINUE TO reject the request

3.9 WHEN JWT tokens are invalid or expired THEN the system SHALL CONTINUE TO return 401 Unauthorized responses

#### 10. Logging and Audit Trails

3.10 WHEN attendance operations succeed or fail THEN the system SHALL CONTINUE TO create audit log entries with event type, actor ID, session ID, success status, and reason

3.11 WHEN errors occur during WebAuthn operations THEN the system SHALL CONTINUE TO log errors with full context for debugging

3.12 WHEN device credentials are used for attendance THEN the system SHALL CONTINUE TO update the `lastUsedAt` timestamp and counter value
