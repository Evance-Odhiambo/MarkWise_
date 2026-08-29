const RSSI_TOO_WEAK = -85;
const RSSI_EDGE_START = -75;
const RSSI_EDGE_END = -60;
const RSSI_TOO_CLOSE = -50;
const DEFAULT_MAX_NEIGHBORS = 4;
const DEFAULT_TARGET_RELAYS = 1;
const DEFAULT_ESTIMATED_PARTICIPANTS = 60;
const DEFAULT_COOLDOWN_MS = 30_000;

export type RelayElectionInput = {
  rssi?: number;
  rssiSamples?: number[];
  neighborCount?: number;
  activeRelayCount?: number;
  batteryLevel?: number;
  isCharging?: boolean;
  estimatedParticipants?: number;
  targetRelays?: number;
  maxNeighbors?: number;
  lastRelayAt?: number;
  nowMs?: number;
  random?: () => number;
};

export type RelayElectionResult = {
  elected: boolean;
  probability: number;
  score: number;
  reason:
    | 'eligible'
    | 'signal-too-weak'
    | 'area-saturated'
    | 'relay-already-present'
    | 'battery-low'
    | 'relay-cooldown';
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const average = (values: number[]) =>
  values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : undefined;

/** Select coverage-edge devices; the server remains authoritative. */
export const evaluateRelayCandidate = ({
  rssi,
  rssiSamples = [],
  neighborCount = 0,
  activeRelayCount = 0,
  batteryLevel,
  isCharging = false,
  estimatedParticipants = DEFAULT_ESTIMATED_PARTICIPANTS,
  targetRelays = DEFAULT_TARGET_RELAYS,
  maxNeighbors = DEFAULT_MAX_NEIGHBORS,
  lastRelayAt,
  nowMs = Date.now(),
  random = Math.random,
}: RelayElectionInput = {}): RelayElectionResult => {
  const signal = average(
    rssiSamples.length ? rssiSamples : typeof rssi === 'number' ? [rssi] : [],
  );
  if (signal === undefined || signal < RSSI_TOO_WEAK)
    return { elected: false, probability: 0, score: 0, reason: 'signal-too-weak' };
  if (neighborCount > maxNeighbors)
    return { elected: false, probability: 0, score: 0, reason: 'area-saturated' };
  if (activeRelayCount > 0)
    return { elected: false, probability: 0, score: 0, reason: 'relay-already-present' };
  if (typeof batteryLevel === 'number' && batteryLevel < 0.2 && !isCharging)
    return { elected: false, probability: 0, score: 0, reason: 'battery-low' };
  if (lastRelayAt !== undefined && nowMs - lastRelayAt < DEFAULT_COOLDOWN_MS)
    return { elected: false, probability: 0, score: 0, reason: 'relay-cooldown' };

  const edgeScore =
    signal < RSSI_EDGE_START
      ? clamp((signal - RSSI_TOO_WEAK) / (RSSI_EDGE_START - RSSI_TOO_WEAK), 0, 1)
      : signal <= RSSI_EDGE_END
      ? 1
      : clamp(
          1 - (signal - RSSI_EDGE_END) / (RSSI_TOO_CLOSE - RSSI_EDGE_END),
          0.15,
          1,
        );
  const stabilityPenalty =
    rssiSamples.length > 1
      ? clamp(
          (Math.max(...rssiSamples) - Math.min(...rssiSamples)) / 25,
          0,
          0.5,
        )
      : 0;
  const score = clamp(edgeScore * (1 - stabilityPenalty), 0, 1);
  const densityPenalty = clamp(neighborCount / Math.max(1, maxNeighbors), 0, 1);
  const probability = clamp(
    score * (1 - densityPenalty) * (targetRelays / Math.max(1, estimatedParticipants)),
    0,
    1,
  );
  return {
    elected: random() < probability,
    probability,
    score,
    reason: 'eligible',
  };
};

export const shouldElectRelay = (input: RelayElectionInput = {}) =>
  evaluateRelayCandidate(input).elected;

export const getRelayBackoffMs = () => Math.floor(Math.random() * 1_500);
