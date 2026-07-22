import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Screen } from '@/components/ui';
import { useClientAuthStore } from '@/stores/clientAuthStore';
import { spacing, type } from '@/theme';

export default function Profile() {
  const router = useRouter();
  const { client, updateProfile, logout } = useClientAuthStore();
  const [name, setName] = useState(client?.name ?? '');
  const [email, setEmail] = useState(client?.email ?? '');
  const [phone, setPhone] = useState(client?.phone ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), email: email.trim(), phone: phone.trim() });
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e) {
      Alert.alert('Save failed', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingTop: spacing.md }}>
        <Text style={[type.title, { marginBottom: spacing.lg }]}>Profile</Text>
        <Input label="Name" value={name} onChangeText={setName} />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Button title="Save changes" onPress={save} loading={saving} />
        <View style={{ height: spacing.lg }} />
        <Button title="Sign out" variant="secondary" onPress={signOut} />
      </ScrollView>
    </Screen>
  );
}
