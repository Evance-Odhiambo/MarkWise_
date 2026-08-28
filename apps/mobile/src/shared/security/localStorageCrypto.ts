import * as Keychain from 'react-native-keychain';
import {
  base64ToUtf8,
  utf8ToBase64,
} from '../../features/attendance/security/attendanceCrypto';

const SERVICE = 'com.markwise.local-storage-key.v1';

const cryptoApi = () => {
  const value = (globalThis as any).crypto;
  if (!value?.subtle || !value?.getRandomValues)
    throw new Error('Secure local crypto is unavailable');
  return value;
};

const toBase64 = (bytes: Uint8Array) => {
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  return (globalThis as any).btoa(binary);
};

const fromBase64 = (value: string) => {
  const binary = (globalThis as any).atob(value) as string;
  return Uint8Array.from(binary, character => character.charCodeAt(0));
};

const getKey = async () => {
  const existing = await Keychain.getGenericPassword({ service: SERVICE });
  if (existing && typeof existing !== 'boolean' && existing.password)
    return existing.password;
  const bytes = new Uint8Array(32);
  cryptoApi().getRandomValues(bytes);
  const key = Array.from(bytes, byte =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  await Keychain.setGenericPassword('markwise-local-storage', key, {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
};

const importKey = async () => {
  const hex = await getKey();
  const bytes = Uint8Array.from(hex.match(/.{2}/g)!, value =>
    parseInt(value, 16),
  );
  return cryptoApi().subtle.importKey('raw', bytes, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
};

export const encryptLocalValue = async (
  value: string | null | undefined,
  associatedData: string,
) => {
  if (value == null) return null;
  const iv = new Uint8Array(12);
  cryptoApi().getRandomValues(iv);
  const encoded = fromBase64(utf8ToBase64(value));
  const aad = fromBase64(utf8ToBase64(associatedData));
  const encrypted = await cryptoApi().subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    await importKey(),
    encoded,
  );
  return `v1:${toBase64(iv)}:${toBase64(new Uint8Array(encrypted))}`;
};

export const decryptLocalValue = async (
  value: string | null | undefined,
  associatedData: string,
) => {
  if (value == null) return null;
  if (!value.startsWith('v1:')) return value;
  const [, ivValue, encryptedValue] = value.split(':');
  try {
    const decrypted = await cryptoApi().subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: fromBase64(ivValue),
        additionalData: fromBase64(utf8ToBase64(associatedData)),
      },
      await importKey(),
      fromBase64(encryptedValue),
    );
    return base64ToUtf8(toBase64(new Uint8Array(decrypted)));
  } catch {
    throw new Error(
      'Encrypted local attendance data failed integrity validation',
    );
  }
};
