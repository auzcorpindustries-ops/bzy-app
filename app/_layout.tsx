import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { tokenStorage } from '@/api';
import { useAuthStore } from '@/stores/authStore';
import { useClientAuthStore } from '@/stores/clientAuthStore';
import { colors } from '@/theme';

export default function RootLayout() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const role = await tokenStorage.getRole();
      const token = await tokenStorage.getAccessToken();
      if (token && role === 'client') {
        const ok = await useClientAuthStore.getState().restore();
        if (ok) router.replace('/(client)/explore');
      } else if (token && role === 'business') {
        await useAuthStore.getState().bootstrap();
        if (useAuthStore.getState().isAuthenticated) router.replace('/(business)/dashboard');
      }
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/client-login" options={{ title: 'Sign in' }} />
        <Stack.Screen name="(auth)/client-register" options={{ title: 'Create account' }} />
        <Stack.Screen name="(auth)/business-login" options={{ title: 'Business sign in' }} />
        <Stack.Screen name="(client)" options={{ headerShown: false }} />
        <Stack.Screen name="(business)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
