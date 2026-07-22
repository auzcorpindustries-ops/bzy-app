import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Chip, EmptyState, Input, Screen } from '@/components/ui';
import { useClientStore } from '@/stores/clientStore';
import { formatCents, formatTime, toDateKey } from '@/utils/format';
import { colors, spacing, type } from '@/theme';

function nextDays(n: number): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function BookService() {
  const { businessId, serviceId } = useLocalSearchParams<{
    businessId: string;
    serviceId: string;
  }>();
  const router = useRouter();
  const {
    businessDetail,
    fetchBusiness,
    slots,
    isLoadingSlots,
    fetchSlots,
    createBooking,
    payDeposit,
  } = useClientStore();

  const days = useMemo(() => nextDays(14), []);
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const service = businessDetail?.services.find((s) => s.service_id === serviceId);

  useEffect(() => {
    if (businessId && (!businessDetail || businessDetail.business_id !== businessId)) {
      fetchBusiness(businessId);
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId && serviceId && selectedDate) {
      setSelectedSlot(null);
      fetchSlots(businessId, serviceId, selectedDate);
    }
  }, [businessId, serviceId, selectedDate]);

  const confirm = async () => {
    if (!selectedSlot || !businessId || !serviceId) return;
    setSubmitting(true);
    try {
      const booking = await createBooking({
        business_id: businessId,
        service_id: serviceId,
        start_time: selectedSlot,
        notes: notes || undefined,
      });
      if (booking.deposit_amount_cents > 0) {
        // Real flow: paymentsApi returns client_secret → confirm via Stripe/Square SDK.
        await payDeposit(booking.booking_id);
        Alert.alert(
          'Booked!',
          `${booking.service_name} is confirmed. Deposit of ${formatCents(booking.deposit_amount_cents)} paid.`,
        );
      } else {
        Alert.alert('Booked!', `${booking.service_name} is confirmed.`);
      }
      router.replace('/(client)/bookings');
    } catch (e) {
      Alert.alert('Booking failed', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!service) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: service.name }} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={type.h2}>{service.name}</Text>
          <Text style={[type.dim, { marginTop: 2 }]}>
            {service.duration_minutes} min · {formatCents(service.price_cents)}
            {service.deposit_cents > 0 ? ` · ${formatCents(service.deposit_cents)} deposit` : ''}
          </Text>
        </Card>

        <Text style={[type.h2, { marginVertical: spacing.sm }]}>Pick a day</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {days.map((d) => {
            const key = toDateKey(d);
            return (
              <Chip
                key={key}
                label={d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                selected={selectedDate === key}
                onPress={() => setSelectedDate(key)}
              />
            );
          })}
        </ScrollView>

        <Text style={[type.h2, { marginVertical: spacing.sm }]}>Pick a time</Text>
        {isLoadingSlots ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.lg }} />
        ) : slots.length === 0 ? (
          <EmptyState title="No openings" subtitle="Try another day." />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {slots.map((s) => (
              <Chip
                key={s.start_time}
                label={formatTime(s.start_time, businessDetail?.timezone)}
                selected={selectedSlot === s.start_time}
                onPress={() => setSelectedSlot(s.start_time)}
              />
            ))}
          </View>
        )}

        <Input
          label="Notes for the business (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything they should know?"
        />

        <Button
          title={
            service.deposit_cents > 0
              ? `Confirm & pay ${formatCents(service.deposit_cents)} deposit`
              : 'Confirm booking'
          }
          onPress={confirm}
          disabled={!selectedSlot}
          loading={submitting}
          style={{ marginBottom: spacing.xl }}
        />
      </ScrollView>
    </Screen>
  );
}
