import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, useFonts } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { DevTaskConvexProvider } from '@/components/convex-provider';
import { NotificationService } from '@/components/notification-service';

SplashScreen.preventAutoHideAsync();

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set. Add your Clerk publishable key to .env.');
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });

  if (!fontsLoaded && !fontError) return null;

  return (
      <ClerkProvider publishableKey={clerkPublishableKey!} tokenCache={tokenCache}>
        <DevTaskConvexProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <NotificationService />
            <AnimatedSplashOverlay />
            <Slot />
          </ThemeProvider>
        </DevTaskConvexProvider>
    </ClerkProvider>
  );
}
