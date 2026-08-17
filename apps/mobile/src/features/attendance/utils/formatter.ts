import { AttendanceMethod, AttendanceStatus } from '../types';

export const formatMethod = (method: AttendanceMethod): string => {
  const map: Record<AttendanceMethod, string> = {
    ble: 'BLE Proximity',
    qr: 'QR Code',
    pin: 'PIN Entry',
  };
  return map[method];
};

export const formatStatus = (status: AttendanceStatus): string => {
  const map: Record<AttendanceStatus, string> = {
    pending: 'Pending',
    active: 'Active',
    completed: 'Completed',
  };
  return map[status];
};

export const formatTimeRemaining = (expiresAt: string): string => {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

export const generatePin = (length: number = 4): string => {
  let pin = '';
  for (let i = 0; i < length; i++) {
    pin += Math.floor(Math.random() * 10);
  }
  return pin;
};
