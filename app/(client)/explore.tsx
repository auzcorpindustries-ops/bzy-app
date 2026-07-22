import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Chip, EmptyState, Input, Screen } from '@/components/ui';
import { useClientStore } from '@/stores/clientStore';
import type { Industry } from '@/types/models';
import { spacing, type } from '@/theme';

const INDUSTRIES: { label: string; value: Industry | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Hair', value: 'hair_salon' },
  { label: 'Nails', value: 'nail_salon' },
  { label: 'Tattoo', value: 'tattoo' },
];

const INDUSTRY_LABEL: Record<Industry, string> = {
  hair_salon: 'Hair salon',
  nail_salon: 'Nail salon',
  tattoo: 'Tattoo studio',
};

export default function Explore() {
  const router = useRouter();
  const { businesses, isLoading, searchBusinesses } = useClientStore();
  const [q, setQ] = useState('');
  const [industry, setIndustry] = useState<Industry | undefined>(undefined);

  useEffect(() => {
    searchBusinesses({ q: q || undefined, industry });
  }, [q, industry]);

  return (
    <Screen>
      <Input placeholder="Search salons and studios…" value={q} onChangeText={setQ} />
      <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
        {INDUSTRIES.map((i) => (
          <Chip
            key={i.label}
            label={i.label}
            selected={industry === i.value}
            onPress={() => setIndustry(i.value)}
          />
        ))}
      </View>
      <FlatList
        data={businesses}
        keyExtractor={(b) => b.business_id}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => searchBusinesses({ q: q || undefined, industry })}
          />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState title="No businesses found" subtitle="Try a different search or filter." />
          )
        }
        renderItem={({ item }) => (
          <Card onPress={() => router.push(`/(client)/business/${item.business_id}`)}>
            <Text style={type.h2}>{item.name}</Text>
            <Text style={[type.dim, { marginTop: 2 }]}>
              {INDUSTRY_LABEL[item.industry]} · {item.office_hours}
            </Text>
            {item.deposit_required ? (
              <Text style={[type.small, { marginTop: spacing.xs }]}>Deposit required to book</Text>
            ) : null}
          </Card>
        )}
      />
    </Screen>
  );
}
