import type { InPersonMethod, VerificationStatus } from '../types/inPerson';

export const formatInPersonMethod = (method: InPersonMethod) =>
  ({ qr: 'QR Code', ble: 'BLE Proximity', pin: 'PIN' }[method]);
export const formatVerificationStatus = (status: VerificationStatus) =>
  ({
    pending: 'Pending',
    verified: 'Verified',
    rejected: 'Rejected',
    duplicate: 'Duplicate',
  }[status]);
