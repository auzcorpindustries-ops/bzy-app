import { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Button, Card, Chip, EmptyState, Screen, StatusPill } from '@/components/ui';
import { useClientStore } from '@/stores/clientStore';
import { formatCents, formatDate, formatTime } from '@/utils/format';
import { spacing, type } from '@/theme';

export default function MyBookings() {
  const { myBookings, isLoading, fetchMyBookings, cancelBooking } = useClientStore();
  const [scope, setScope] = useState<'upcoming' | 'past'>('upcoming');

  useFocusEffect(
    useCallback(() => {
      fetchMyBookings(scope);
    }, [scope]),
  );

  const confirmCancel = (bookingId: string, serviceName: string) => {
    Alert.alert('Cancel booking?', `Cancel your ${serviceName} appointment?`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelBooking(bookingId);
          } catch (e) {
            Alert.alert('Could not cancel', (e as Error).message);
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
        <Chip label="Upcoming" selected={scope === 'upcoming'} onPress={() => setScope('upcoming')} />
        <Chip label="Past" selected={scope === 'past'} onPress={() => setScope('past')} />
      </View>
      <FlatList
        data={myBookings}
        keyExtractor={(b) => b.booking_id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => fetchMyBookings(scope)} />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              title={scope === 'upcoming' ? 'Nothing coming up' : 'No past bookings'}
              subtitle={scope === 'upcoming' ? 'Find a salon or studio in Explore.' : undefined}
            />
          )
        }
        renderItem={({ item }) => {
          const cancellable =
            item.status === 'confirmed' && new Date() < new Date(item.cancellable_until);
          return (
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[type.body, { fontWeight: '600', flex: 1 }]}>{item.service_name}</Text>
                <StatusPill status={item.status} />
              </View>
              <Text style={[type.dim, { marginTop: 2 }]}>{item.business_name}</Text>
              <Text style={[type.body, { marginTop: spacing.xs }]}>
                {formatDate(item.start_time, item.timezone)} at{' '}
                {formatTime(item.start_time, item.timezone)}
              </Text>
              {item.deposit_amount_cents > 0 ? (
                <Text style={[type.small, { marginTop: 2 }]}>
                  Deposit {formatCents(item.deposit_amount_cents)}
                  {item.deposit_paid ? ' · paid' : ' · unpaid'}
                </Text>
              ) : null}
              {cancellable ? (
                <Button
                  title="Cancel booking"
                  variant="secondary"
                  onPress={() => confirmCancel(item.booking_id, item.service_name)}
                  style={{ marginTop: spacing.sm }}
                />
              ) : null}
            </Card>
          );
        }}
      />
    </Screen>
  );
}
