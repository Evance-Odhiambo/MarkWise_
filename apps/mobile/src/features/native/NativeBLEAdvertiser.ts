import { NativeModules } from 'react-native';

type BLEAdvertiserNativeModule = {
  isAdvertisingSupported?: () => Promise<boolean> | boolean;
  isBluetoothEnabled: () => Promise<boolean> | boolean;
  requestEnableBluetooth: () => Promise<boolean> | boolean;
  startAdvertising: (payload: string) => Promise<boolean> | boolean;
  stopAdvertising: () => Promise<boolean> | boolean;
};

const BLEAdvertiser = NativeModules.BLEAdvertiser as
  | BLEAdvertiserNativeModule
  | undefined;

const unavailable = (): Promise<never> =>
  Promise.reject(
    new Error(
      'Bluetooth advertiser is unavailable. Rebuild the Android app to register the native BLE module.',
    ),
  );

class BLEAdvertiserAPI {
  isAdvertisingSupported(): Promise<boolean> {
    return BLEAdvertiser?.isAdvertisingSupported
      ? Promise.resolve(BLEAdvertiser.isAdvertisingSupported())
      : Promise.resolve(false);
  }

  isBluetoothEnabled(): Promise<boolean> {
    return BLEAdvertiser
      ? Promise.resolve(BLEAdvertiser.isBluetoothEnabled())
      : unavailable();
  }

  requestEnableBluetooth(): Promise<boolean> {
    return BLEAdvertiser
      ? Promise.resolve(BLEAdvertiser.requestEnableBluetooth())
      : unavailable();
  }

  startAdvertising(base64Payload: string): Promise<boolean> {
    return BLEAdvertiser
      ? Promise.resolve(BLEAdvertiser.startAdvertising(base64Payload))
      : unavailable();
  }

  stopAdvertising(): Promise<boolean> {
    return BLEAdvertiser
      ? Promise.resolve(BLEAdvertiser.stopAdvertising())
      : unavailable();
  }
}

export default new BLEAdvertiserAPI();
