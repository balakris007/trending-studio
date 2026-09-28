import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../src/state/useAppStore';
import { getDatabase } from '../../src/database/sqlite';
import { formatINR } from '@trending-studio/utils';
import { SyncManager } from '../../src/services/SyncManager';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, syncStatus, syncMessage } = useAppStore();
  const [metrics, setMetrics] = useState({
    todaySales: 0,
    todayBills: 0,
    todayCash: 0,
    todayUpi: 0,
    pendingSyncCount: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadLocalMetrics = async () => {
    try {
      const db = await getDatabase();
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startTimestamp = startOfDay.getTime();

      const salesRes = await db.getFirstAsync<{ total: number; count: number }>(
        'SELECT SUM(grand_total) as total, COUNT(*) as count FROM invoices WHERE created_at >= ?',
        [startTimestamp]
      );

      const cashRes = await db.getFirstAsync<{ total: number }>(
        "SELECT SUM(paid_amount) as total FROM invoices WHERE created_at >= ? AND payment_method = 'CASH'",
        [startTimestamp]
      );

      const upiRes = await db.getFirstAsync<{ total: number }>(
        "SELECT SUM(paid_amount) as total FROM invoices WHERE created_at >= ? AND payment_method = 'UPI'",
        [startTimestamp]
      );

      const syncRes = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'PENDING'"
      );

      setMetrics({
        todaySales: salesRes?.total || 0,
        todayBills: salesRes?.count || 0,
        todayCash: cashRes?.total || 0,
        todayUpi: upiRes?.total || 0,
        pendingSyncCount: syncRes?.count || 0,
      });
    } catch (err) {
      console.warn('Dashboard error:', err);
    }
  };

  useEffect(() => {
    loadLocalMetrics();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLocalMetrics();
    await SyncManager.syncNow();
    setRefreshing(false);
  };

  const getSyncColor = () => {
    switch (syncStatus) {
      case 'ONLINE':
        return '#10b981';
      case 'SYNCING':
        return '#3b82f6';
      case 'OFFLINE':
        return '#f59e0b';
      case 'SYNC_ERROR':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>TRENDING STUDIO</Text>
          <Text style={styles.staffGreeting}>Hello, {user?.name || 'Staff'}</Text>
        </View>

        {/* Sync Pill */}
        <TouchableOpacity
          style={[styles.syncPill, { borderColor: getSyncColor() }]}
          onPress={() => SyncManager.syncNow()}
        >
          <View style={[styles.dot, { backgroundColor: getSyncColor() }]} />
          <Text style={[styles.syncText, { color: getSyncColor() }]}>{syncStatus}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
        }
      >
        {/* Sync Status Banner */}
        <View style={styles.statusBanner}>
          <Text style={styles.statusBannerText}>{syncMessage}</Text>
          {metrics.pendingSyncCount > 0 && (
            <Text style={styles.pendingBadge}>
              {metrics.pendingSyncCount} offline records queued
            </Text>
          )}
        </View>

        {/* Quick Action Button */}
        <TouchableOpacity
          style={styles.posButton}
          onPress={() => router.push('/billing')}
        >
          <Text style={styles.posButtonText}>⚡ START QUICK POS BILLING</Text>
        </TouchableOpacity>

        {/* Metric Cards */}
        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>TODAY'S SALES</Text>
            <Text style={styles.cardValue}>{formatINR(metrics.todaySales)}</Text>
            <Text style={styles.cardSub}>{metrics.todayBills} bills issued</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>UPI REVENUE</Text>
            <Text style={[styles.cardValue, { color: '#818cf8' }]}>
              {formatINR(metrics.todayUpi)}
            </Text>
            <Text style={styles.cardSub}>Digital QR Collections</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>CASH DRAWER</Text>
            <Text style={[styles.cardValue, { color: '#34d399' }]}>
              {formatINR(metrics.todayCash)}
            </Text>
            <Text style={styles.cardSub}>Physical Cash Count</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>OFFLINE QUEUE</Text>
            <Text style={[styles.cardValue, { color: '#fbbf24' }]}>
              {metrics.pendingSyncCount}
            </Text>
            <Text style={styles.cardSub}>Auto-sync on connect</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1d3a',
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#071527',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  staffGreeting: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  syncText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  scroll: {
    padding: 16,
  },
  statusBanner: {
    backgroundColor: '#0f2942',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  statusBannerText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  pendingBadge: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
  },
  posButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
  },
  posButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#0f2942',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    marginBottom: 14,
  },
  cardLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cardValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 6,
  },
  cardSub: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 4,
  },
});
