import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NotificationStackParamList } from '../../../navigation/types';
import NotificationsScreen from '../screens/NotificationScreen';
import NotificationDetailScreen from '../screens/NotificationDetailScreen';
import { useAuth } from '../../auth/context/AuthContext';

const Stack = createNativeStackNavigator<NotificationStackParamList>();

const NotificationStack = () => {
  const { role } = useAuth();

  const renderNotifications = (
    props: React.ComponentProps<typeof NotificationsScreen>,
  ) => <NotificationsScreen {...props} role={role ?? 'both'} />;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationMatchesGesture: true,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="NotificationList">
        {props =>
          renderNotifications(
            props as React.ComponentProps<typeof NotificationsScreen>,
          )
        }
      </Stack.Screen>
      <Stack.Screen
        name="NotificationDetail"
        component={NotificationDetailScreen}
      />
    </Stack.Navigator>
  );
};

export default NotificationStack;
