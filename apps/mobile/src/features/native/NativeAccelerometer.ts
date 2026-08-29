import { NativeModules, NativeEventEmitter } from 'react-native';

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

  addListener(callback: (data: AccelerometerData) => void): {
    remove: () => void;
  } {
    if (!this.emitter) {
      this.emitter = new NativeEventEmitter(Accelerometer ?? undefined);
    }
    const handler = callback as (data: any) => void;
    // Keep this event name aligned with AccelerometerModule.kt.
    const subscription = this.emitter.addListener(
      'onAccelerometerData',
      handler,
    );
    return {
      remove: () => subscription.remove(),
    };
  }
}

export default new AccelerometerAPI();
