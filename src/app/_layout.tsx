import { Stack } from 'expo-router';

import { DrawerProvider } from '@/components/screen-shell';

export default function RootLayout() {
  return (
    <DrawerProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="add-trade" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="day-details" />
        <Stack.Screen name="performance" />
        <Stack.Screen name="settings" />
      </Stack>
    </DrawerProvider>
  );
}
