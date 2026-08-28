const RELAY_RSSI_MIN = -90;
const RELAY_RSSI_MAX = -50;
const RELAY_TARGET_COUNT = 1;
const RELAY_ESTIMATED_PARTICIPANTS = 500;

/**
 * Randomized, RSSI-weighted relay election. Strong receivers are preferred,
 * while the target rate keeps the number of simultaneous relays bounded as
 * the class grows. This is an availability decision, never an authority
 * decision; the server still verifies every relayed proof.
 */
export const shouldElectRelay = (rssi: number | undefined) => {
  const signal = typeof rssi === 'number' ? rssi : RELAY_RSSI_MIN;
  const normalized = Math.max(
    0,
    Math.min(1, (signal - RELAY_RSSI_MIN) / (RELAY_RSSI_MAX - RELAY_RSSI_MIN)),
  );
  const probability =
    normalized * (RELAY_TARGET_COUNT / RELAY_ESTIMATED_PARTICIPANTS);
  return Math.random() < probability;
};

export const getRelayBackoffMs = () => Math.floor(Math.random() * 150);
