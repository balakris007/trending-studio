import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../src/state/useAppStore';
import { SyncManager } from '../../src/services/SyncManager';
import { ThermalPrinterService } from '../../src/services/ThermalPrinterService';

export default function MoreScreen() {
  const router = useRouter();
  const { user, setUser, syncStatus, syncMessage } = useAppStore();
  const [printerWidth, setPrinterWidth] = useState<'58mm' | '80mm'>('58mm');

  const handleManualSync = async () => {
    Alert.alert('Synchronizing', 'Starting background synchronization with Trending Studio server...');
    await SyncManager.syncNow();
  };

  const handleTestPrint = async () => {
    try {
      const dummyInvoice = {
        invoiceNumber: 'TEST-PRINT-01',
        customerName: 'Test Customer',
        customerMobile: '7904064446',
        items: [{ name: 'Test Print Item', quantity: 1, unitPrice: 100, totalAmount: 118 }],
        taxableAmount: 100,
        cgstAmount: 9,
        sgstAmount: 9,
        grandTotal: 118,
      };

      await ThermalPrinterService.printInvoice(dummyInvoice);
      Alert.alert('Test Print', 'ESC/POS test receipt transmitted successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Print test failed');
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('ts_access_token');
    await SecureStore.deleteItemAsync('ts_user_profile');
    setUser(null);
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>More Operations & Settings</Text>
        <Text style={styles.subtitle}>{user?.name} ({user?.role})</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Section 1: Sync Center */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SYNC CENTER (OFFLINE ENGINE)</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Connection Status:</Text>
            <Text style={[styles.val, { color: syncStatus === 'ONLINE' ? '#34d399' : '#fbbf24' }]}>
              {syncStatus}
            </Text>
          </View>
          <Text style={styles.statusDesc}>{syncMessage}</Text>

          <TouchableOpacity style={styles.actionBtn} onPress={handleManualSync}>
            <Text style={styles.actionBtnText}>🔄 Trigger Manual Sync Now</Text>
          </TouchableOpacity>
        </View>

        {/* Section 2: Bluetooth Thermal Printer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BLUETOOTH RECEIPT PRINTER</Text>
          <View style={styles.paperRow}>
            <TouchableOpacity
              style={[styles.paperBtn, printerWidth === '58mm' && styles.paperBtnActive]}
              onPress={() => {
                setPrinterWidth('58mm');
                ThermalPrinterService.setPaperWidth('58mm');
              }}
            >
              <Text style={styles.paperBtnText}>58mm Thermal (Compact)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paperBtn, printerWidth === '80mm' && styles.paperBtnActive]}
              onPress={() => {
                setPrinterWidth('80mm');
                ThermalPrinterService.setPaperWidth('80mm');
              }}
            >
              <Text style={styles.paperBtnText}>80mm Thermal (Standard)</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.actionBtn} onPress={handleTestPrint}>
            <Text style={styles.actionBtnText}>🖨️ Send Test Print Receipt</Text>
          </TouchableOpacity>
        </View>

        {/* Section 3: Store Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TRENDING STUDIO IDENTITY</Text>
          <Text style={styles.storeName}>Trending Studio — Gifts & Frames</Text>
          <Text style={styles.storeAddr}>
            No:1, Meyyappan Ambalam Complex, Opp. Gnanandha Mahal, Near Periyar Statue, Karaikudi - 630001
          </Text>
          <Text style={styles.storePhone}>Phone / WhatsApp: +91-79040-64446</Text>
          <Text style={styles.storeGstin}>GSTIN: 33ABCDE1234F1Z5</Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>SIGN OUT OF TERMINAL</Text>
        </TouchableOpacity>
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
  subtitle: { color: '#38bdf8', fontSize: 11, marginTop: 2 },
  scroll: { padding: 16 },
  section: {
    backgroundColor: '#0f2942',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: '#cbd5e1', fontSize: 12 },
  val: { fontSize: 12, fontWeight: 'bold' },
  statusDesc: { color: '#94a3b8', fontSize: 11, marginTop: 4, marginBottom: 12 },
  actionBtn: {
    backgroundColor: '#1e3a5f',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  actionBtnText: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },
  paperRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  paperBtn: {
    width: '48%',
    backgroundColor: '#071527',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  paperBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  paperBtnText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
  storeName: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  storeAddr: { color: '#94a3b8', fontSize: 11, marginTop: 4 },
  storePhone: { color: '#38bdf8', fontSize: 11, marginTop: 4 },
  storeGstin: { color: '#64748b', fontSize: 10, fontFamily: 'monospace', marginTop: 4 },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  logoutBtnText: { color: '#f87171', fontSize: 12, fontWeight: 'bold' },
});
