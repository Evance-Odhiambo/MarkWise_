import * as Keychain from 'react-native-keychain';

const SERVICE = 'com.markwise.attendance.device';

export async function getSecureDeviceId() {
  const stored = await Keychain.getGenericPassword({ service: SERVICE });
  return stored ? stored.password : null;
}

export async function getOrCreateSecureDeviceId() {
  const existing = await getSecureDeviceId();
  if (existing) return existing;
  const id = `native-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await Keychain.setGenericPassword('markwise-device', id, {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return id;
}
