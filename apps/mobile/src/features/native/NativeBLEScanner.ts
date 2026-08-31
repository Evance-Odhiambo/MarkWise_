import { NativeEventEmitter, NativeModules } from 'react-native';

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
  private readonly emitter = new NativeEventEmitter(BLEScanner);

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
    const handler = callback as (data: any) => void;
    // Must match BLEScannerModule.EVENT_DEVICE_FOUND.
    const subscription = this.emitter.addListener('onDeviceFound', handler);
    return { remove: () => subscription.remove() };
  }

  addErrorListener(callback: (error: BLEScanError) => void): {
    remove: () => void;
  } {
    const handler = callback as (data: any) => void;
    // Must match BLEScannerModule.EVENT_SCAN_ERROR.
    const subscription = this.emitter.addListener('onScanError', handler);
    return { remove: () => subscription.remove() };
  }
}

export default new BLEScannerAPI();
