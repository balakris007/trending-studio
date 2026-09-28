import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { CustomerRepository } from '../../src/repositories/CustomerRepository';
import { ICustomer } from '@trending-studio/shared-types';
import { formatINR } from '@trending-studio/utils';

export default function CustomersScreen() {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<ICustomer[]>([]);

  const fetchCusts = async (text: string) => {
    const list = await CustomerRepository.search(text);
    setCustomers(list);
  };

  useEffect(() => {
    fetchCusts(search);
  }, [search]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Customer Directory (Offline SQLite)</Text>
        <TextInput
          style={styles.search}
          placeholder="Search customer by name or phone..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {customers.map((c) => (
          <View key={c.id || c.name} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.typeBadge}>{c.customerType}</Text>
            </View>

            <Text style={styles.phone}>📞 {c.mobile}</Text>
            <Text style={styles.city}>📍 {c.city || 'Karaikudi'}</Text>

            <View style={styles.footerRow}>
              <Text style={styles.loyalty}>Loyalty: {c.loyaltyPoints || 0} pts</Text>
              <Text
                style={[
                  styles.balance,
                  c.outstandingBalance > 0 && { color: '#fbbf24' },
                ]}
              >
                Due: {formatINR(c.outstandingBalance || 0)}
              </Text>
            </View>
          </View>
        ))}

        {customers.length === 0 && (
          <Text style={styles.empty}>No customers found in local SQLite database.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1d3a' },
  header: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#071527',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  title: { color: '#ffffff', fontSize: 16, fontWeight: '900', marginBottom: 8 },
  search: {
    backgroundColor: '#0f2942',
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  scroll: { padding: 14 },
  card: {
    backgroundColor: '#0f2942',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    marginBottom: 10,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  typeBadge: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: '#071527',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  phone: { color: '#38bdf8', fontSize: 11, fontFamily: 'monospace', marginTop: 4 },
  city: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  loyalty: { color: '#c084fc', fontSize: 10, fontWeight: 'bold' },
  balance: { color: '#34d399', fontSize: 11, fontWeight: 'bold' },
  empty: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 32 },
});
