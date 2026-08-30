# Bugfix Requirements Document

## Introduction

The online attendance feature at `/attend` currently uses WebAuthn (passkey/biometric authentication) universally for all devices. This creates a suboptimal experience for mobile users who have the MarkWise native app installed, as they are forced to authenticate in the browser instead of leveraging the native app's capabilities. This bugfix enhances the attendance flow to intelligently detect mobile devices and attempt deep linking to the native app, while maintaining WebAuthn as a reliable fallback mechanism.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a mobile user with the MarkWise app installed clicks an attendance link THEN the system forces WebAuthn authentication in the mobile browser instead of opening the native app

1.2 WHEN a mobile user with the MarkWise app installed accesses `/attend` THEN the system does not attempt to detect the presence of the native app or leverage deep linking capabilities

1.3 WHEN a mobile user clicks an attendance link THEN the system provides no visual feedback about attempting to open the native app

### Expected Behavior (Correct)

2.1 WHEN a mobile user (iOS/Android) with the MarkWise app installed clicks an attendance link THEN the system SHALL attempt to open the native app via deep link (markwise://attend?session={SESSION_ID}) with a 2.5 second timeout

2.2 WHEN a mobile user with the MarkWise app installed accesses `/attend` THEN the system SHALL use the document visibility API to detect if the app successfully opened and opened in foreground

2.3 WHEN a mobile user clicks an attendance link and the deep link attempt is in progress THEN the system SHALL display a loading screen with "Opening MarkWise App..." message

2.4 WHEN a mobile user without the MarkWise app installed clicks an attendance link THEN the system SHALL gracefully fallback to WebAuthn authentication in the browser after the timeout period

2.5 WHEN the deep link attempt fails (timeout expires or app not installed) THEN the system SHALL seamlessly transition to the existing WebAuthn flow without error messages

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a desktop user clicks an attendance link THEN the system SHALL CONTINUE TO use WebAuthn authentication directly without attempting deep linking

3.2 WHEN a mobile user without the app installed completes the WebAuthn fallback flow THEN the system SHALL CONTINUE TO authenticate successfully using browser-based biometrics/passkeys

3.3 WHEN any user completes attendance (via app or WebAuthn) THEN the system SHALL CONTINUE TO record attendance data correctly in the backend

3.4 WHEN a user on any device encounters network issues during attendance THEN the system SHALL CONTINUE TO handle errors gracefully with appropriate error messages

3.5 WHEN a mobile user manually navigates to `/attend` in their browser instead of using a deep link THEN the system SHALL CONTINUE TO allow attendance via WebAuthn

3.6 WHEN attendance session IDs are generated and passed in URLs THEN the system SHALL CONTINUE TO maintain security and validation of session tokens
