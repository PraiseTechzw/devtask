import { useAuth } from '@clerk/expo';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import type * as NotificationsModule from 'expo-notifications';

import { api } from '../../convex/_generated/api';

type NotificationsApi = typeof NotificationsModule;

type LocalNotificationType = 'dailyNudge' | 'morningGreeting' | 'nightGreeting' | 'statusBar';

const DAILY_NUDGE_CHANNEL = 'daily-nudge';
const STATUS_CHANNEL = 'devtask-status';

let notificationsApi: NotificationsApi | null = null;
let notificationHandlerConfigured = false;

/**
 * Expo Go no longer loads Android remote-notification functionality (SDK 53+).
 * Keep expo-notifications out of module initialization so Expo Router can load
 * the root layout in Expo Go, and only load it in a native development build.
 */
function getNotifications(): NotificationsApi | null {
  if (Constants.appOwnership === 'expo' || Platform.OS === 'web') return null;
  if (!notificationsApi) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsApi = require('expo-notifications') as NotificationsApi;
  }
  if (!notificationHandlerConfigured) {
    notificationsApi.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerConfigured = true;
  }
  return notificationsApi;
}

function parseTime(value?: string) {
  const match = value?.match(/(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)/i);
  if (!match) return { hour: 8, minute: 30 };
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hour += 12;
  return { hour, minute: Number(match[2]) };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Please check the Expo notification setup and try again.';
}

function reportNotificationError(context: string, error: unknown) {
  const message = `${context}: ${errorMessage(error)}`;
  console.error(`[DevTask notifications] ${message}`, error);
  Alert.alert('Notifications unavailable', message);
}

async function clearScheduledType(notifications: NotificationsApi, type: LocalNotificationType) {
  const scheduled = await notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data?.type === type)
      .map((item) => notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export function NotificationService() {
  const { isSignedIn } = useAuth();
  const profile = useQuery(api.users.getCurrent, isSignedIn ? {} : 'skip');
  const registerDevice = useMutation(api.notifications.registerDevice);

  useEffect(() => {
    if (!profile || profile.onboardingStatus !== 'complete') return;
    const notifications = getNotifications();
    if (!notifications) return;

    const schedule = async () => {
      try {
        if (Platform.OS === 'android') {
          await notifications.setNotificationChannelAsync(DAILY_NUDGE_CHANNEL, {
            name: 'Daily nudges',
            importance: notifications.AndroidImportance.DEFAULT,
          });
          await notifications.setNotificationChannelAsync(STATUS_CHANNEL, {
            name: 'DevTask status',
            importance: notifications.AndroidImportance.LOW,
          });
        }

        if (!profile.notificationsEnabled || profile.reminderTime === 'off') {
          await Promise.all([
            clearScheduledType(notifications, 'dailyNudge'),
            clearScheduledType(notifications, 'morningGreeting'),
            clearScheduledType(notifications, 'nightGreeting'),
          ]);
          return;
        }

        const permissions = await notifications.getPermissionsAsync();
        const requested = permissions.granted ? permissions : await notifications.requestPermissionsAsync();
        if (!requested.granted) {
          reportNotificationError('Permission was not granted', new Error('Enable notifications in system settings to receive DevTask reminders.'));
          return;
        }

        try {
          const token = (await notifications.getExpoPushTokenAsync()).data;
          await registerDevice({
            expoPushToken: token,
            platform: Platform.OS === 'ios' ? 'ios' : 'android',
            permissionState: 'granted',
          });
        } catch (error) {
          // A development build may not expose an Expo push token, but local reminders can still work.
          reportNotificationError('Push-token registration failed', error);
        }

        await Promise.all([
          clearScheduledType(notifications, 'dailyNudge'),
          clearScheduledType(notifications, 'morningGreeting'),
          clearScheduledType(notifications, 'nightGreeting'),
        ]);

        const { hour, minute } = parseTime(profile.reminderTime);
        await notifications.scheduleNotificationAsync({
          content: {
            title: 'What is your next small step?',
            body: 'Open DevTask and move your focus project forward.',
            data: { type: 'dailyNudge', url: '/(app)/home' },
          },
          trigger: { type: notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: DAILY_NUDGE_CHANNEL },
        });
        await notifications.scheduleNotificationAsync({
          content: {
            title: 'Good morning from DevTask',
            body: 'Start with one small step and keep your project healthy today.',
            data: { type: 'morningGreeting', url: '/(app)/home' },
          },
          trigger: { type: notifications.SchedulableTriggerInputTypes.DAILY, hour: 8, minute: 0, channelId: DAILY_NUDGE_CHANNEL },
        });
        await notifications.scheduleNotificationAsync({
          content: {
            title: 'Good night from DevTask',
            body: 'Wrap up your work and check tomorrow’s next step.',
            data: { type: 'nightGreeting', url: '/(app)/home' },
          },
          trigger: { type: notifications.SchedulableTriggerInputTypes.DAILY, hour: 21, minute: 0, channelId: DAILY_NUDGE_CHANNEL },
        });

        if (Platform.OS === 'android') {
          const presented = await notifications.getPresentedNotificationsAsync();
          const hasStatusNotification = presented.some((item) => item.request.content.data?.type === 'statusBar');
          if (!hasStatusNotification) {
            await notifications.scheduleNotificationAsync({
              content: {
                title: 'DevTask is keeping you on track',
                body: 'Your project health and commit activity are being monitored.',
                sticky: true,
                autoDismiss: false,
                data: { type: 'statusBar', url: '/(app)/home' },
              },
              trigger: null,
            });
          }
        }
      } catch (error) {
        reportNotificationError('Could not configure DevTask reminders', error);
      }
    };

    void schedule();
  }, [profile?.notificationsEnabled, profile?.onboardingStatus, profile?.reminderTime, registerDevice]);

  useEffect(() => {
    const notifications = getNotifications();
    if (!notifications) return;

    const redirect = (notification: NotificationsModule.Notification) => {
      const url = notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    };
    const last = notifications.getLastNotificationResponse();
    if (last?.notification) redirect(last.notification);
    const subscription = notifications.addNotificationResponseReceivedListener((response) => redirect(response.notification));
    return () => subscription.remove();
  }, []);

  
  return null;
}
