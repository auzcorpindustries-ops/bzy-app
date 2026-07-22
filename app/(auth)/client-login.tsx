import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button, Input, Screen } from '@/components/ui';
import { useClientAuthStore } from '@/stores/clientAuthStore';
import { colors, spacing, type } from '@/theme';

export default function ClientLogin() {
  const router = useRouter();
  const { login, isLoading } = useClientAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    try {
      await login({ email: email.trim(), password });
      router.replace('/(client)/explore');
    } catch (e) {
      Alert.alert('Sign in failed', (e as Error).message);
    }
  };

  return (
    <Screen>
      <View style={{ marginTop: spacing.xl }}>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />
        <Button title="Sign in" onPress={submit} loading={isLoading} disabled={!email || !password} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg }}>
          <Text style={type.dim}>New to Bzy? </Text>
          <Link href="/(auth)/client-register" style={{ color: colors.accent }}>
            Create an account
          </Link>
        </View>
      </View>
    </Screen>
  );
}
