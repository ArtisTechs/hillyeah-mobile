import { Stack } from 'expo-router';

export default function PagesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="loginScreen" options={{ headerShown: false }} />
      <Stack.Screen name="dashboardScreen" options={{ headerShown: false }} />
      <Stack.Screen name="weatherBroadcastScreen" options={{ headerShown: false }} />
    </Stack>
  );
}
