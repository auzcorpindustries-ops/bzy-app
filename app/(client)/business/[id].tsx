import { useEffect } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Card, EmptyState, Screen } from '@/components/ui';
import { useClientStore } from '@/stores/clientStore';
import { formatCents } from '@/utils/format';
import { colors, spacing, type } from '@/theme';

export default function BusinessDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { businessDetail, isLoading, fetchBusiness } = useClientStore();

  useEffect(() => {
    if (id) fetchBusiness(id);
  }, [id]);

  if (isLoading || !businessDetail) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: businessDetail.name }} />
      <View style={{ marginBottom: spacing.md }}>
        <Text style={type.title}>{businessDetail.name}</Text>
        <Text style={[type.dim, { marginTop: spacing.xs }]}>{businessDetail.office_hours}</Text>
      </View>
      <Text style={[type.h2, { marginBottom: spacing.sm }]}>Services</Text>
      <FlatList
        data={businessDetail.services}
        keyExtractor={(s) => s.service_id}
        ListEmptyComponent={<EmptyState title="No services listed yet" />}
        renderItem={({ item }) => (
          <Card
            onPress={() =>
              router.push(`/(client)/book/${businessDetail.business_id}/${item.service_id}`)
            }
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[type.body, { fontWeight: '600', flex: 1 }]}>{item.name}</Text>
              <Text style={[type.body, { color: colors.accent, fontWeight: '600' }]}>
                {formatCents(item.price_cents)}
              </Text>
            </View>
            {item.description ? (
              <Text style={[type.dim, { marginTop: 2 }]}>{item.description}</Text>
            ) : null}
            <Text style={[type.small, { marginTop: spacing.xs }]}>
              {item.duration_minutes} min
              {item.deposit_cents > 0 ? ` · ${formatCents(item.deposit_cents)} deposit` : ''}
            </Text>
          </Card>
        )}
      />
    </Screen>
  );
}
