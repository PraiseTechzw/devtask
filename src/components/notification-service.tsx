import { useAuth } from '@clerk/expo';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useMutation, useQuery } from 'convex/react';

import { api } from '../../convex/_generated/api';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });

function parseTime(value?: string) {
  const match = value?.match(/(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)/i);
  if (!match) return { hour: 8, minute: 30 };
  let hour = Number(match[1]) % 12; if (match[3].toUpperCase() === 'PM') hour += 12;
  return { hour, minute: Number(match[2]) };
}

export function NotificationService() {
  const { isSignedIn } = useAuth();
  const profile = useQuery(api.users.getCurrent, isSignedIn ? {} : 'skip');
  const registerDevice = useMutation(api.notifications.registerDevice);
  useEffect(() => {
    if (!profile || profile.onboardingStatus !== 'complete') return;
    const schedule = async () => {
      if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('daily-nudge', { name: 'Daily nudge', importance: Notifications.AndroidImportance.DEFAULT });
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(scheduled.filter((item) => item.content.data?.type === 'dailyNudge').map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
      if (!profile.notificationsEnabled || profile.reminderTime === 'off') return;
      const permissions = await Notifications.getPermissionsAsync();
      const requested = permissions.granted ? permissions : await Notifications.requestPermissionsAsync();
      const granted = requested.granted;
      if (!granted) return;
      try {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        await registerDevice({ expoPushToken: token, platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web', permissionState: 'granted' });
      } catch {
        // Local reminders remain available when push-token registration is unavailable in Expo Go.
      }
      const { hour, minute } = parseTime(profile.reminderTime);
      await Notifications.scheduleNotificationAsync({ content: { title: 'What is your next small step?', body: 'Open DevTask and move your focus project forward.', data: { type: 'dailyNudge', url: '/(app)/home' } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'daily-nudge' } });
    };
    void schedule();
  }, [profile?.notificationsEnabled, profile?.onboardingStatus, profile?.reminderTime, registerDevice]);
  useEffect(() => {
    const redirect = (notification: Notifications.Notification) => {
      const url = notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    };
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) redirect(last.notification);
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => redirect(response.notification));
    return () => subscription.remove();
  }, []);
  return null;
}
