import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { useAppStore } from '../../src/state/useAppStore';
import { CustomerRepository } from '../../src/repositories/CustomerRepository';
import { ProductRepository } from '../../src/repositories/ProductRepository';
import { InvoiceRepository } from '../../src/repositories/InvoiceRepository';
import { calculateInvoice } from '@trending-studio/billing-engine';
import { INITIAL_PHOTO_PRINT_PRICES } from '@trending-studio/pricing-engine';
import { formatINR } from '@trending-studio/utils';
import { ThermalPrinterService } from '../../src/services/ThermalPrinterService';
import { SyncManager } from '../../src/services/SyncManager';
import { ICustomer, PaymentMethod } from '@trending-studio/shared-types';

export default function BillingScreen() {
  const { cart, addToCart, updateCartQty, removeFromCart, clearCart } = useAppStore();

  // Customer State
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerList, setCustomerList] = useState<ICustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');

  // Products & Photo Prints
  const [products, setProducts] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<'PHOTO' | 'PRODUCTS'>('PHOTO');

  // Checkout Modal State
  const [showTenderModal, setShowTenderModal] = useState(false);
  const [tenderMethod, setTenderMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [lastInvoice, setLastInvoice] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    async function loadData() {
      const prods = await ProductRepository.listAll();
      setProducts(prods);
      const custs = await CustomerRepository.search('');
      setCustomerList(custs);
      if (custs.length > 0) {
        setSelectedCustomer(custs[0]);
      }
    }
    loadData();
  }, []);

  const handleSearchCustomer = async (text: string) => {
    setCustomerSearch(text);
    if (text.length > 1) {
      const results = await CustomerRepository.search(text);
      setCustomerList(results);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustName || !newCustMobile) {
      Alert.alert('Required', 'Please enter both customer name and mobile.');
      return;
    }

    const created = await CustomerRepository.insertOffline(
      {
        name: newCustName,
        mobile: newCustMobile,
        city: 'Karaikudi',
      },
      'android_term_01',
      'staff_01'
    );

    setSelectedCustomer(created);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustMobile('');
    Alert.alert('Success', `Customer ${created.name} saved offline.`);
  };

  // Authoritative Calculation from billing-engine
  const billCalculation = calculateInvoice({
    items: cart,
    isInterState: false,
  });

  const handleAddPhotoPrint = (size: string, price: number) => {
    addToCart({
      id: `print_${Date.now()}_${size}`,
      itemType: 'PHOTO_PRINT',
      name: `${size} Photo Print`,
      quantity: 1,
      unitPrice: price,
      discountAmount: 0,
      gstRate: 18,
    });
  };

  const handleAddProduct = (prod: any) => {
    addToCart({
      id: `prod_${Date.now()}_${prod.sku}`,
      itemType: 'PRODUCT',
      productId: prod.id,
      name: prod.name,
      quantity: 1,
      unitPrice: prod.sellingPrice,
      discountAmount: 0,
      gstRate: prod.gstRate,
    });
  };

  const handleSaveInvoice = async () => {
    if (!selectedCustomer) {
      Alert.alert('Customer Missing', 'Please select or add a customer.');
      return;
    }
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to bill.');
      return;
    }

    try {
      const invoice = await InvoiceRepository.createOfflineInvoice(
        {
          customerId: selectedCustomer.id || selectedCustomer._id || 'walkin',
          customerName: selectedCustomer.name,
          customerMobile: selectedCustomer.mobile,
          items: cart,
          payments: [
            {
              id: `p_${Date.now()}`,
              method: tenderMethod,
              amount: billCalculation.grandTotal,
              receivedAt: new Date().toISOString(),
              receivedBy: 'Android Staff',
            },
          ],
        },
        'android_term_01',
        'staff_01'
      );

      setLastInvoice(invoice);
      setShowTenderModal(false);
      clearCart();
      setShowReceiptModal(true);

      // Attempt background sync if connected
      SyncManager.syncNow();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save bill.');
    }
  };

  const handlePrintReceipt = async () => {
    if (!lastInvoice) return;
    try {
      await ThermalPrinterService.printInvoice(lastInvoice);
      Alert.alert('Printed', 'Receipt sent to thermal printer.');
    } catch (e: any) {
      Alert.alert('Print Error', e.message || 'Failed to print');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Customer Strip */}
      <View style={styles.customerHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.customerTitle}>
            Customer: {selectedCustomer ? selectedCustomer.name : 'Select Customer'}
          </Text>
          <Text style={styles.customerSubtitle}>
            {selectedCustomer ? selectedCustomer.mobile : 'Tap to search customer'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addCustBtn}
          onPress={() => setShowAddCustomerModal(true)}
        >
          <Text style={styles.addCustBtnText}>+ ADD</Text>
        </TouchableOpacity>
      </View>

      {/* Mode Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'PHOTO' && styles.tabActive]}
          onPress={() => setSelectedTab('PHOTO')}
        >
          <Text style={[styles.tabText, selectedTab === 'PHOTO' && styles.tabTextActive]}>
            PHOTO PRINTS (4x6 to 36x60)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'PRODUCTS' && styles.tabActive]}
          onPress={() => setSelectedTab('PRODUCTS')}
        >
          <Text style={[styles.tabText, selectedTab === 'PRODUCTS' && styles.tabTextActive]}>
            GIFTS & ALBUMS
          </Text>
        </TouchableOpacity>
      </View>

      {/* Items Selector */}
      <View style={styles.catalogArea}>
        {selectedTab === 'PHOTO' ? (
          <ScrollView contentContainerStyle={styles.printGrid}>
            {INITIAL_PHOTO_PRINT_PRICES.map((p) => (
              <TouchableOpacity
                key={p.size}
                style={styles.printCard}
                onPress={() => handleAddPhotoPrint(p.size, p.price)}
              >
                <Text style={styles.printSize}>{p.size}</Text>
                <Text style={styles.printPrice}>₹{p.price}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.productList}>
            {products.map((prod) => (
              <TouchableOpacity
                key={prod.id || prod.sku}
                style={styles.prodItem}
                onPress={() => handleAddProduct(prod)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.prodName}>{prod.name}</Text>
                  <Text style={styles.prodSku}>{prod.sku} • Stock: {prod.stock}</Text>
                </View>
                <Text style={styles.prodPrice}>{formatINR(prod.sellingPrice)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Cart Summary & Checkout */}
      <View style={styles.cartFooter}>
        <View style={styles.cartInfo}>
          <Text style={styles.cartItemCount}>{cart.length} items in cart</Text>
          <Text style={styles.cartTotal}>{formatINR(billCalculation.grandTotal)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.checkoutBtn, cart.length === 0 && { opacity: 0.5 }]}
          disabled={cart.length === 0}
          onPress={() => setShowTenderModal(true)}
        >
          <Text style={styles.checkoutBtnText}>PAY / GENERATE BILL</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL 1: ADD CUSTOMER */}
      <Modal visible={showAddCustomerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Quick Add Customer</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Customer Name"
              placeholderTextColor="#64748b"
              value={newCustName}
              onChangeText={setNewCustName}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="10-Digit Mobile"
              placeholderTextColor="#64748b"
              value={newCustMobile}
              onChangeText={setNewCustMobile}
              keyboardType="phone-pad"
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleCreateCustomer}>
              <Text style={styles.saveBtnText}>Save Offline & Select</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowAddCustomerModal(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: TENDER */}
      <Modal visible={showTenderModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Payment Method</Text>
            <Text style={styles.modalTotal}>Due: {formatINR(billCalculation.grandTotal)}</Text>

            <View style={styles.methodRow}>
              <TouchableOpacity
                style={[
                  styles.methodBtn,
                  tenderMethod === PaymentMethod.UPI && styles.methodBtnActive,
                ]}
                onPress={() => setTenderMethod(PaymentMethod.UPI)}
              >
                <Text style={styles.methodBtnText}>UPI / QR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.methodBtn,
                  tenderMethod === PaymentMethod.CASH && styles.methodBtnActive,
                ]}
                onPress={() => setTenderMethod(PaymentMethod.CASH)}
              >
                <Text style={styles.methodBtnText}>CASH</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.confirmBillBtn} onPress={handleSaveInvoice}>
              <Text style={styles.confirmBillBtnText}>Confirm & Print Bill</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowTenderModal(false)}>
              <Text style={styles.cancelBtnText}>Back to Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: RECEIPT */}
      <Modal visible={showReceiptModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Bill Generated (Offline SQLite)</Text>
            <Text style={styles.receiptNumber}>
              Ref: {lastInvoice?.invoiceNumber}
            </Text>
            <Text style={styles.receiptTotal}>
              Grand Total: {formatINR(lastInvoice?.grandTotal || 0)}
            </Text>
            <Text style={styles.receiptSyncNote}>
              Saved locally. Will sync automatically with server.
            </Text>

            <TouchableOpacity style={styles.printBtn} onPress={handlePrintReceipt}>
              <Text style={styles.printBtnText}>🖨️ PRINT BLUETOOTH RECEIPT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowReceiptModal(false)}
            >
              <Text style={styles.cancelBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1d3a',
  },
  customerHeader: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#071527',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  customerTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  customerSubtitle: {
    color: '#38bdf8',
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  addCustBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addCustBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#071527',
    padding: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#1e3a5f',
  },
  tabText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#38bdf8',
  },
  catalogArea: {
    flex: 1,
  },
  printGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  printCard: {
    width: '31%',
    backgroundColor: '#0f2942',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    alignItems: 'center',
    marginBottom: 10,
  },
  printSize: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  printPrice: {
    color: '#f472b6',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  productList: {
    padding: 12,
  },
  prodItem: {
    backgroundColor: '#0f2942',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prodName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  prodSku: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  prodPrice: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'black',
  },
  cartFooter: {
    backgroundColor: '#071527',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartInfo: {
    flex: 1,
  },
  cartItemCount: {
    color: '#94a3b8',
    fontSize: 11,
  },
  cartTotal: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  checkoutBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#0f2942',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalTotal: {
    color: '#38bdf8',
    fontSize: 18,
    fontWeight: 'black',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#071527',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 12,
    color: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  methodBtn: {
    width: '48%',
    backgroundColor: '#071527',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  methodBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  methodBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  confirmBillBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBillBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  printBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  printBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: 12,
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  receiptNumber: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  receiptTotal: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  receiptSyncNote: {
    color: '#fbbf24',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
