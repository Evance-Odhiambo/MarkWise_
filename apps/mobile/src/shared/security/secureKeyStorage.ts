import * as Keychain from 'react-native-keychain';

const SESSION_SECRET_SERVICE = 'com.markwise.attendance.session-secret.v1';

export async function storeAttendanceSessionSecret(
  sessionId: string,
  secret: string,
) {
  await Keychain.setGenericPassword(sessionId, secret, {
    service: `${SESSION_SECRET_SERVICE}.${sessionId}`,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getAttendanceSessionSecret(sessionId: string) {
  const credentials = await Keychain.getGenericPassword({
    service: `${SESSION_SECRET_SERVICE}.${sessionId}`,
  });
  return credentials ? credentials.password : null;
}

export async function clearAttendanceSessionSecret(sessionId: string) {
  await Keychain.resetGenericPassword({
    service: `${SESSION_SECRET_SERVICE}.${sessionId}`,
  });
}
