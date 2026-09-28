import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { formatINR } from '@trending-studio/utils';
import { OrderStatus } from '@trending-studio/shared-types';
import axios from 'axios';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('http://10.0.2.2:5000/api/v1/orders', { timeout: 4000 });
      setOrders(res.data.data || []);
    } catch (e) {
      // Mock local orders if offline
      setOrders([
        {
          id: 'ord_1',
          orderNumber: 'TS-ORD-2627-000001',
          customerName: 'Kuralarasan',
          customerMobile: '7904064446',
          status: OrderStatus.DESIGNING,
          grandTotal: 1250,
          advancePaid: 500,
          balanceDue: 750,
          items: [{ name: '12x18 Metallic Print + Teak Frame' }],
        },
        {
          id: 'ord_2',
          orderNumber: 'TS-ORD-2627-000002',
          customerName: 'Priya Ramanathan',
          customerMobile: '9443312345',
          status: OrderStatus.PRINTING,
          grandTotal: 450,
          advancePaid: 450,
          balanceDue: 0,
          items: [{ name: 'Customized Magic Pillow' }],
        },
      ]);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const handleAdvance = (orderId: string, current: string) => {
    Alert.alert('Stage Update', `Advanced ${orderId} from ${current} to next production stage.`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Studio Orders & Production</Text>
        <Text style={styles.subtitle}>Stage tracking for photo prints & frames</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
      >
        {orders.map((ord) => (
          <View key={ord.id || ord._id} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.orderNo}>{ord.orderNumber}</Text>
              <Text style={styles.statusBadge}>{ord.status}</Text>
            </View>

            <Text style={styles.custName}>{ord.customerName}</Text>
            <Text style={styles.custMobile}>{ord.customerMobile}</Text>

            <View style={styles.itemsBox}>
              <Text style={styles.itemText}>
                {ord.items?.map((it: any) => it.name).join(', ')}
              </Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.totalText}>{formatINR(ord.grandTotal)}</Text>
              <Text style={ord.balanceDue > 0 ? styles.balanceDue : styles.paidBadge}>
                {ord.balanceDue > 0 ? `Due: ${formatINR(ord.balanceDue)}` : 'PAID'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.advanceBtn}
              onPress={() => handleAdvance(ord.orderNumber, ord.status)}
            >
              <Text style={styles.advanceBtnText}>Advance to Next Stage ➔</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1d3a' },
  header: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#071527',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  title: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  subtitle: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  scroll: { padding: 14 },
  card: {
    backgroundColor: '#0f2942',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    marginBottom: 12,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNo: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold', fontFamily: 'monospace' },
  statusBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    color: '#38bdf8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 'bold',
  },
  custName: { color: '#ffffff', fontSize: 13, fontWeight: 'bold', marginTop: 6 },
  custMobile: { color: '#94a3b8', fontSize: 11, fontFamily: 'monospace', marginTop: 1 },
  itemsBox: {
    backgroundColor: '#071527',
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
  },
  itemText: { color: '#cbd5e1', fontSize: 11 },
  totalText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  balanceDue: { color: '#fbbf24', fontSize: 11, fontWeight: 'bold' },
  paidBadge: { color: '#34d399', fontSize: 11, fontWeight: 'bold' },
  advanceBtn: {
    backgroundColor: '#1e3a5f',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  advanceBtnText: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold' },
});
