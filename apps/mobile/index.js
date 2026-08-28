/**
 * @format
 */

import 'react-native-gesture-handler';
import { install as installQuickCrypto } from 'react-native-quick-crypto';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// React Native does not expose Web Crypto's subtle API by default. Install
// the native implementation before any attendance/security module is loaded.
installQuickCrypto();

setBackgroundMessageHandler(getMessaging(), async () => undefined);

AppRegistry.registerComponent(appName, () => App);
