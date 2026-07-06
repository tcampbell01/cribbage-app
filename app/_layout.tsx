import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#F7F4EE' },
        headerShadowVisible: false,
        headerTintColor: '#26302A',
        contentStyle: { backgroundColor: '#F7F4EE' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Cribbage Coach' }} />
    </Stack>
  );
}
