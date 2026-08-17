import { NativeModules } from 'react-native';

const { BLEAdvertiser } = NativeModules;

class BLEAdvertiserAPI {
  startAdvertising(deviceName: string): Promise<boolean> {
    return BLEAdvertiser.startAdvertising(deviceName);
  }

  stopAdvertising(): Promise<boolean> {
    return BLEAdvertiser.stopAdvertising();
  }
}

export default new BLEAdvertiserAPI();
