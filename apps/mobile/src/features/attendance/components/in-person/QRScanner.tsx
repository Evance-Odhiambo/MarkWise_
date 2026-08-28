import React, { useEffect, useRef, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  NativeQRScannerView,
  QRScannerEvent,
} from '../../../native/NativeQRScannerView';

type Props = {
  onScan: (value: string) => void;
  pause?: boolean;
};

export const QRScanner = ({ onScan, pause = false }: Props) => {
  const [cameraReady, setCameraReady] = useState(Platform.OS !== 'android');
  const [cameraDenied, setCameraDenied] = useState(false);
  const lastValue = useRef<string | null>(null);
  const lastScanAt = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let mounted = true;
    PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA)
      .then(result => {
        if (!mounted) return;
        const granted = result === PermissionsAndroid.RESULTS.GRANTED;
        setCameraReady(granted);
        setCameraDenied(!granted);
      })
      .catch(() => {
        if (mounted) {
          setCameraReady(false);
          setCameraDenied(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleScan = (event: { nativeEvent: QRScannerEvent }) => {
    if (pause) return;
    const value = event.nativeEvent.data || event.nativeEvent.displayValue;
    if (!value) return;
    const now = Date.now();
    // Camera analyzers emit the same QR on many consecutive frames. Ignore
    // repeats briefly so one physical scan creates one session lookup.
    if (value === lastValue.current && now - lastScanAt.current < 1_500) return;
    lastValue.current = value;
    lastScanAt.current = now;
    onScan(value);
  };

  return (
    <View style={styles.container}>
      {cameraReady ? (
        <NativeQRScannerView
          style={StyleSheet.absoluteFill}
          pause={pause}
          onBarcodeScan={handleScan}
        />
      ) : (
        <View style={styles.permissionState}>
          <Text style={styles.permissionText}>
            {cameraDenied
              ? 'Camera permission is required to scan QR codes.'
              : 'Requesting camera access...'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    overflow: 'hidden',
    borderRadius: 20,
  },
  permissionState: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  permissionText: {
    color: '#e2e8f0',
    textAlign: 'center',
  },
});
