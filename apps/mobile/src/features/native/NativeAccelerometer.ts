import { NativeModules, NativeEventEmitter, ViewProps } from 'react-native';

const { Accelerometer } = NativeModules;

export type AccelerometerData = {
  x: number;
  y: number;
  z: number;
  timestamp: number;
};

class AccelerometerAPI {
  private emitter: NativeEventEmitter | null = null;

  start(): void {
    Accelerometer?.start?.();
  }

  stop(): void {
    Accelerometer?.stop?.();
  }

  addListener(
    callback: (data: AccelerometerData) => void
  ): { remove: () => void } {
    if (!this.emitter) {
      this.emitter = new NativeEventEmitter(Accelerometer);
    }
    const handler = callback as (data: any) => void;
    const subscription = this.emitter.addListener('AccelerometerData', handler);
    return {
      remove: () => subscription.remove(),
    };
  }
}

export default new AccelerometerAPI();
