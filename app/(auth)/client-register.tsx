import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Screen } from '@/components/ui';
import { useClientAuthStore } from '@/stores/clientAuthStore';
import { spacing } from '@/theme';

export default function ClientRegister() {
  const router = useRouter();
  const { register, isLoading } = useClientAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    try {
      await register({ name: name.trim(), email: email.trim(), phone: phone.trim(), password });
      router.replace('/(client)/explore');
    } catch (e) {
      Alert.alert('Sign up failed', (e as Error).message);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingTop: spacing.lg }}>
        <Input label="Full name" value={name} onChangeText={setName} placeholder="Sarah Smith" />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <Input
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+1 555 555 0100"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="At least 8 characters"
        />
        <Button
          title="Create account"
          onPress={submit}
          loading={isLoading}
          disabled={!name || !email || !phone || password.length < 8}
        />
      </ScrollView>
    </Screen>
  );
}
