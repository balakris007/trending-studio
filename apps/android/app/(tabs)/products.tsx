import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ProductRepository } from '../../src/repositories/ProductRepository';
import { IProduct } from '@trending-studio/shared-types';
import { formatINR } from '@trending-studio/utils';

export default function ProductsScreen() {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<IProduct[]>([]);

  useEffect(() => {
    async function load() {
      const all = await ProductRepository.listAll();
      setProducts(all);
    }
    load();
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Products & Stock (Offline SQLite)</Text>
        <TextInput
          style={styles.search}
          placeholder="Search by Product Name or SKU..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {filtered.map((p) => {
          const isLow = p.stock <= p.minStock;

          return (
            <View key={p.id || p.sku} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.sku}>{p.sku}</Text>
                <Text style={styles.category}>{p.category}</Text>
              </View>

              <Text style={styles.name}>{p.name}</Text>

              <View style={styles.footerRow}>
                <Text style={styles.price}>{formatINR(p.sellingPrice)}</Text>
                <Text style={[styles.stock, isLow && styles.lowStock]}>
                  Stock: {p.stock} PCS {isLow ? '⚠️ LOW' : ''}
                </Text>
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <Text style={styles.empty}>No products found.</Text>
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
  sku: { color: '#38bdf8', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' },
  category: { color: '#94a3b8', fontSize: 10 },
  name: { color: '#ffffff', fontSize: 13, fontWeight: 'bold', marginTop: 4 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  price: { color: '#ffffff', fontSize: 14, fontWeight: 'black' },
  stock: { color: '#34d399', fontSize: 11, fontWeight: 'bold' },
  lowStock: { color: '#fbbf24' },
  empty: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 32 },
});
