// Placeholder: the business-side screens are built once the Claude Design
// project (Bzy App.dc.html) is shared. All business middleware and stores are
// ready — see src/stores/{authStore,bookingsStore,servicesStore,settingsStore}.
import { useEffect } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, EmptyState, Screen, StatusPill } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useBookingsStore } from '@/stores/bookingsStore';
import { formatTime, toDateKey } from '@/utils/format';
import { spacing, type } from '@/theme';

export default function Dashboard() {
  const router = useRouter();
  const business = useAuthStore((s) => s.business);
  const logout = useAuthStore((s) => s.logout);
  const { bookings, fetch } = useBookingsStore();

  useEffect(() => {
    const today = toDateKey(new Date());
    fetch({ start_date: today, end_date: today });
  }, []);

  return (
    <Screen>
      <Text style={[type.title, { marginTop: spacing.md }]}>{business?.name}</Text>
      <Text style={[type.dim, { marginBottom: spacing.lg }]}>Today's bookings</Text>
      <FlatList
        data={bookings}
        keyExtractor={(b) => b.booking_id}
        ListEmptyComponent={<EmptyState title="No bookings today" />}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[type.body, { fontWeight: '600' }]}>
                {formatTime(item.start_time, item.timezone)} — {item.service_name}
              </Text>
              <StatusPill status={item.status} />
            </View>
            <Text style={[type.dim, { marginTop: 2 }]}>{item.customer_name}</Text>
          </Card>
        )}
      />
      <Button
        title="Sign out"
        variant="secondary"
        onPress={async () => {
          await logout();
          router.replace('/');
        }}
        style={{ marginBottom: spacing.lg }}
      />
    </Screen>
  );
}
