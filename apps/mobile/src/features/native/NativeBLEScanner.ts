import { NativeModules, NativeEventEmitter } from 'react-native';

const { BLEScanner } = NativeModules;

export type BLEDevice = {
  deviceId: string;
  deviceName: string;
  rssi: number;
  timestamp: number;
  serviceData: Record<string, string>;
  serviceUuids: string[];
  payload?: string;
};

export type BLEScanError = {
  errorCode: number;
  errorMessage: string;
};

class BLEScannerAPI {
  private emitter: NativeEventEmitter | null = null;

  startScan(
    serviceUUID = '00001101-0000-1000-8000-00805F9B34FB',
  ): Promise<boolean> {
    return Promise.resolve(BLEScanner.startScan(serviceUUID));
  }

  startScanNoFilter(): Promise<boolean> {
    return Promise.resolve(BLEScanner.startScanNoFilter());
  }

  stopScan(): Promise<boolean> {
    return Promise.resolve(BLEScanner.stopScan());
  }

  isScanning(): Promise<boolean> {
    return Promise.resolve(BLEScanner.isScanning());
  }

  addDeviceListener(callback: (device: BLEDevice) => void): {
    remove: () => void;
  } {
    if (!this.emitter) {
      this.emitter = new NativeEventEmitter(BLEScanner);
    }
    const handler = callback as (data: any) => void;
    const subscription = this.emitter.addListener('BLEDeviceFound', handler);
    return { remove: () => subscription.remove() };
  }

  addErrorListener(callback: (error: BLEScanError) => void): {
    remove: () => void;
  } {
    if (!this.emitter) {
      this.emitter = new NativeEventEmitter(BLEScanner);
    }
    const handler = callback as (data: any) => void;
    const subscription = this.emitter.addListener('BLEScanError', handler);
    return { remove: () => subscription.remove() };
  }
}

export default new BLEScannerAPI();
