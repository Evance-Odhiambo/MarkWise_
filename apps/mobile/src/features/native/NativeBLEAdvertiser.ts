import { NativeModules } from 'react-native';

type BLEAdvertiserNativeModule = {
  isAdvertisingSupported?: () => Promise<boolean> | boolean;
  isBluetoothEnabled: () => Promise<boolean> | boolean;
  requestEnableBluetooth: () => Promise<boolean> | boolean;
  startAdvertising: (payload: string) => Promise<boolean> | boolean;
  stopAdvertising: () => Promise<boolean> | boolean;
  startBackgroundAdvertising: (
    payload: string,
    durationSeconds: number,
  ) => Promise<boolean> | boolean;
  stopBackgroundAdvertising: () => Promise<boolean> | boolean;
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

const withTimeout = <T>(promise: Promise<T>, milliseconds: number) =>
  new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('BLE advertising did not respond in time.')),
      milliseconds,
    );
    promise.then(
      value => {
        clearTimeout(timeout);
        resolve(value);
      },
      error => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });

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
      ? withTimeout(
          Promise.resolve(BLEAdvertiser.startAdvertising(base64Payload)),
          5_000,
        )
      : unavailable();
  }

  stopAdvertising(): Promise<boolean> {
    return BLEAdvertiser
      ? Promise.resolve(BLEAdvertiser.stopAdvertising())
      : unavailable();
  }

  startBackgroundAdvertising(
    base64Payload: string,
    durationSeconds: number,
  ): Promise<boolean> {
    return BLEAdvertiser?.startBackgroundAdvertising
      ? Promise.resolve(
          BLEAdvertiser.startBackgroundAdvertising(
            base64Payload,
            durationSeconds,
          ),
        )
      : this.startAdvertising(base64Payload);
  }

  stopBackgroundAdvertising(): Promise<boolean> {
    return BLEAdvertiser?.stopBackgroundAdvertising
      ? Promise.resolve(BLEAdvertiser.stopBackgroundAdvertising())
      : this.stopAdvertising();
  }
}

export default new BLEAdvertiserAPI();
