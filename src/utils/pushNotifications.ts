import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { pushApi } from '@/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Request permission, get the Expo push token, and register it with the backend. */
export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const res = await Notifications.requestPermissionsAsync();
    status = res.status;
  }
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Bookings',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync();
  await pushApi.registerToken({
    token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  });
  return token;
}
