import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Screen } from '@/components/ui';
import { colors, spacing, type } from '@/theme';

export default function Welcome() {
  const router = useRouter();
  return (
    <Screen style={{ justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <Text style={[type.title, { fontSize: 44, color: colors.accent }]}>Bzy</Text>
        <Text style={[type.dim, { marginTop: spacing.sm, textAlign: 'center' }]}>
          Book hair, nails, and ink — or run the shop.
        </Text>
      </View>
      <Button
        title="I'm booking an appointment"
        onPress={() => router.push('/(auth)/client-login')}
      />
      <View style={{ height: spacing.md }} />
      <Button
        title="I run a business"
        variant="secondary"
        onPress={() => router.push('/(auth)/business-login')}
      />
    </Screen>
  );
}
