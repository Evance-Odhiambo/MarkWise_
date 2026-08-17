import { requireNativeComponent, NativeEventEmitter, NativeModules, ViewProps } from 'react-native';

const { QRScannerView } = NativeModules;

export type QRScannerEvent = {
  data: string;
  valueType: number;
  displayValue: string;
};

export type QRScannerError = {
  code: string;
  message: string;
};

export type QRScannerViewProps = ViewProps & {
  torch?: boolean;
  pause?: boolean;
  onQRScan?: (event: QRScannerEvent) => void;
  onError?: (error: QRScannerError) => void;
};

const NativeQRScannerView = requireNativeComponent<QRScannerViewProps>(
  'QRScannerView'
);

class QRScannerEventEmitter {
  private emitter: NativeEventEmitter | null = null;

  addScanListener(callback: (event: QRScannerEvent) => void): { remove: () => void } {
    if (!this.emitter) {
      this.emitter = new NativeEventEmitter(QRScannerView);
    }
    const handler = callback as (data: any) => void;
    const subscription = this.emitter.addListener('QRScannerEvent', handler);
    return { remove: () => subscription.remove() };
  }

  addErrorListener(callback: (error: QRScannerError) => void): { remove: () => void } {
    if (!this.emitter) {
      this.emitter = new NativeEventEmitter(QRScannerView);
    }
    const handler = callback as (data: any) => void;
    const subscription = this.emitter.addListener('QRScannerError', handler);
    return { remove: () => subscription.remove() };
  }
}

const eventEmitter = new QRScannerEventEmitter();

export { NativeQRScannerView, eventEmitter };
