import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Screen } from '@/components/ui';
import { tokenStorage } from '@/api';
import { useAuthStore } from '@/stores/authStore';
import { spacing } from '@/theme';

export default function BusinessLogin() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    try {
      await login({ email: email.trim(), password });
      await tokenStorage.setRole('business');
      router.replace('/(business)/dashboard');
    } catch (e) {
      Alert.alert('Sign in failed', (e as Error).message);
    }
  };

  return (
    <Screen>
      <View style={{ marginTop: spacing.xl }}>
        <Input
          label="Business email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="owner@yourbusiness.com"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />
        <Button title="Sign in" onPress={submit} loading={isLoading} disabled={!email || !password} />
      </View>
    </Screen>
  );
}
