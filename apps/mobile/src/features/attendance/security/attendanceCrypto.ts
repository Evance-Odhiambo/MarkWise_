const getCrypto = () => {
  const cryptoApi = (globalThis as any).crypto as any;
  if (!cryptoApi?.getRandomValues || !cryptoApi.subtle) {
    throw new Error(
      'A secure Web Crypto implementation is required for attendance',
    );
  }
  return cryptoApi;
};

const bytesToBase64 = (bytes: Uint8Array) => {
  const binary = Array.from(bytes, value => String.fromCharCode(value)).join(
    '',
  );
  return (globalThis as any).btoa(binary);
};

export const base64ToUtf8 = (value: string) => {
  const binary = (globalThis as any).atob(value) as string;
  return decodeURIComponent(
    Array.from(
      binary as string,
      (char: string) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`,
    ).join(''),
  );
};

export const utf8ToBase64 = (value: string) => {
  const binary = encodeURIComponent(value).replace(
    /%([0-9A-F]{2})/g,
    (_match, hex: string) => String.fromCharCode(parseInt(hex, 16)),
  );
  return (globalThis as any).btoa(binary);
};

export const randomNonce = () => {
  const bytes = new Uint32Array(1);
  getCrypto().getRandomValues(bytes);
  return bytes[0];
};

export const randomSecret = () => {
  const bytes = new Uint8Array(32);
  getCrypto().getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join(
    '',
  );
};

/**
 * A client-generated UUID v4 session id. Generating this locally (rather
 * than waiting on the server) is what lets a lecturer session start and
 * begin broadcasting instantly, online or not — the id is later used to
 * idempotently "claim" the session server-side once connectivity allows.
 */
export const randomSessionId = () => {
  const bytes = new Uint8Array(16);
  getCrypto().getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
};

export const hmacSha256Hex = async (message: string, secretHex: string) => {
  if (!/^[0-9a-f]{64}$/i.test(secretHex))
    throw new Error('Invalid attendance session secret');
  const secret = new Uint8Array(
    secretHex.match(/.{2}/g)!.map(value => parseInt(value, 16)),
  );
  const key = await getCrypto().subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const encoded = encodeURIComponent(message).replace(
    /%([0-9A-F]{2})/g,
    (_match: string, hex: string) => String.fromCharCode(parseInt(hex, 16)),
  );
  const signature = await getCrypto().subtle.sign(
    'HMAC',
    key,
    Uint8Array.from(encoded, char => char.charCodeAt(0)),
  );
  return Array.from(new Uint8Array(signature), value =>
    value.toString(16).padStart(2, '0'),
  ).join('');
};
