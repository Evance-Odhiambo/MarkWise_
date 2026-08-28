import { DeviceEventEmitter } from 'react-native';
import { FCM_NOTIFICATION_EVENT } from './FcmRegistration';

export const onNotificationReceived = (listener: () => void) =>
  DeviceEventEmitter.addListener(FCM_NOTIFICATION_EVENT, listener);
