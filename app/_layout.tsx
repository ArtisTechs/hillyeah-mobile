import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { isRunningInExpoGo } from 'expo';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(pages)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isAndroidExpoGo = Platform.OS === 'android' && isRunningInExpoGo();

  useEffect(() => {
    if (isAndroidExpoGo) {
      return;
    }

    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    } catch (error) {
      console.warn('Notification handler unavailable in this runtime:', error);
    }
  }, [isAndroidExpoGo]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(pages)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
