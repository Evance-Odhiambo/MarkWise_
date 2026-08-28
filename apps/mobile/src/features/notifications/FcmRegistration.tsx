import { useEffect } from 'react';
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  requestPermission,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import { useAuth } from '../auth/context/AuthContext';
import { API_BASE_URL } from '../../shared/constants';
import { DeviceEventEmitter } from 'react-native';

export const FCM_NOTIFICATION_EVENT = 'markwise.notification.received';

const FcmRegistration = () => {
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;
    let unsubscribeRefresh: (() => void) | undefined;
    let cancelled = false;

    const registerToken = async (deviceToken: string) => {
      if (cancelled || !deviceToken) return;
      await fetch(`${API_BASE_URL}/notifications/device-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: deviceToken }),
      });
    };

    const setup = async () => {
      const messagingInstance = getMessaging();
      await requestPermission(messagingInstance);
      await registerToken(await getToken(messagingInstance));
      unsubscribeRefresh = onTokenRefresh(
        messagingInstance,
        (nextToken: string) => {
          void registerToken(nextToken);
        },
      );
      return onMessage(messagingInstance, (message: RemoteMessage) => {
        DeviceEventEmitter.emit(FCM_NOTIFICATION_EVENT, message);
      });
    };

    let unsubscribeMessage: (() => void) | undefined;
    void setup()
      .then(unsubscribe => {
        unsubscribeMessage = unsubscribe;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      unsubscribeRefresh?.();
      unsubscribeMessage?.();
    };
  }, [token]);

  return null;
};

export default FcmRegistration;
