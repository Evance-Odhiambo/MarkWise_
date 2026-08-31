import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

let requested = false;

/** Requests the platform permissions needed by attendance BLE and QR flows. */
export const useAttendancePermissions = () => {
  useEffect(() => {
    if (Platform.OS !== 'android' || requested) return;
    requested = true;

    const request = async () => {
      try {
        if (Number(Platform.Version) >= 31) {
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          ]);
        } else {
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);
        }
      } catch (error) {
        // Individual screens still report a precise feature-specific error.
        console.warn('[AttendancePermissions] Permission request failed', error);
      }
    };

    void request();
  }, []);
};
