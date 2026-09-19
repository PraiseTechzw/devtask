import { useAuth } from '@clerk/expo';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useQuery } from 'convex/react';

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
  useEffect(() => {
    if (!profile || profile.onboardingStatus !== 'complete') return;
    const schedule = async () => {
      if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('daily-nudge', { name: 'Daily nudge', importance: Notifications.AndroidImportance.DEFAULT });
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(scheduled.filter((item) => item.content.data?.type === 'dailyNudge').map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
      if (!profile.notificationsEnabled || profile.reminderTime === 'off') return;
      const permissions = await Notifications.getPermissionsAsync();
      const granted = permissions.granted || (await Notifications.requestPermissionsAsync()).granted;
      if (!granted) return;
      const { hour, minute } = parseTime(profile.reminderTime);
      await Notifications.scheduleNotificationAsync({ content: { title: 'What is your next small step?', body: 'Open DevTask and move your focus project forward.', data: { type: 'dailyNudge', url: '/(app)/home' } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'daily-nudge' } });
    };
    void schedule();
  }, [profile?.notificationsEnabled, profile?.onboardingStatus, profile?.reminderTime]);
  return null;
}
