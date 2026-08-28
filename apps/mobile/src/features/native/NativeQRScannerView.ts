import { requireNativeComponent, ViewProps } from 'react-native';

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
  onBarcodeScan?: (event: { nativeEvent: QRScannerEvent }) => void;
};

const NativeQRScannerView =
  requireNativeComponent<QRScannerViewProps>('QRScannerView');
export { NativeQRScannerView };
