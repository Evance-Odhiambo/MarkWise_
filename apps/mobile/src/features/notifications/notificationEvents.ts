import { DeviceEventEmitter } from 'react-native';
import { FCM_NOTIFICATION_EVENT } from './FcmRegistration';

export const onNotificationReceived = (listener: () => void) =>
  DeviceEventEmitter.addListener(FCM_NOTIFICATION_EVENT, listener);

// Fired after a local mutation (delete/restore) so every mounted
// useNotifications()/useNotificationsBin() instance — the tab badge
// included — stays in sync, the same way an incoming push already
// triggers a refetch via onNotificationReceived above.
const NOTIFICATIONS_CHANGED_EVENT = 'markwise.notifications.changed';

export const emitNotificationsChanged = () =>
  DeviceEventEmitter.emit(NOTIFICATIONS_CHANGED_EVENT);

export const onNotificationsChanged = (listener: () => void) =>
  DeviceEventEmitter.addListener(NOTIFICATIONS_CHANGED_EVENT, listener);
