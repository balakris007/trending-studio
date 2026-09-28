import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { offlineDb } from '../services/offlineDb';
import { syncManager } from '../services/syncManager';
import { dataService } from '../services/dataService';
import {
  calculateInvoice,
  validateInvoiceReconciliation,
} from '@trending-studio/billing-engine';
import {
  calculatePhotoPrintPrice,
  calculateCustomFramePrice,
  INITIAL_PHOTO_PRINT_PRICES,
} from '@trending-studio/pricing-engine';
import { formatINR, formatISTDateTime } from '@trending-studio/utils';
import {
  Search,
  UserPlus,
  Plus,
  Minus,
  Trash2,
  Printer,
  CreditCard,
  Banknote,
  QrCode,
  Image as ImageIcon,
  SquareCode,
  Check,
  X,
  Share2,
  Sparkles,
  ShoppingCart,
} from 'lucide-react';
import {
  PaperFinish,
  LaminationType,
  PaymentMethod,
  ICustomer,
} from '@trending-studio/shared-types';

export const POS: React.FC = () => {
  // Mobile Tab State
  const [mobileTab, setMobileTab] = useState<'CATALOG' | 'CART'>('CATALOG');

  // Customer State
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerMobile, setNewCustomerMobile] = useState('');

  // Catalog & Masters State
  const [products, setProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'PHOTO_PRINTS' | 'FRAMES'>('PRODUCTS');
  const [productSearch, setProductSearch] = useState('');

  // Photo Print Customizer State
  const [printSize, setPrintSize] = useState('12x18');
  const [printQty, setPrintQty] = useState(1);
  const [printFinish, setPrintFinish] = useState<PaperFinish>(PaperFinish.GLOSSY);
  const [printLamination, setPrintLamination] = useState<LaminationType>(LaminationType.NONE);

  // Custom Frame Calculator State
  const [frameWidth, setFrameWidth] = useState(12);
  const [frameHeight, setFrameHeight] = useState(18);
  const [frameRatePerInch, setFrameRatePerInch] = useState(7);
  const [frameHasGlass, setFrameHasGlass] = useState(true);
  const [frameHasMount, setFrameHasMount] = useState(false);

  // Cart & Invoice Calculation State
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [overallDiscount, setOverallDiscount] = useState(0);

  // Checkout & Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [tenderMethod, setTenderMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [tenderAmount, setTenderAmount] = useState<number>(0);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [upiAmount, setUpiAmount] = useState<number>(0);
  const [isSplit, setIsSplit] = useState(false);

  // Completed Invoice & Print Modal
  const [completedInvoice, setCompletedInvoice] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptType, setReceiptType] = useState<'THERMAL' | 'A4'>('THERMAL');
  const [isProcessing, setIsProcessing] = useState(false);

  // Initial Data Fetch (Offline-First)
  useEffect(() => {
    const fetchData = async () => {
      // 1. Immediately load from offline cache for zero latency & offline availability
      try {
        const cachedProds = await offlineDb.getCachedProducts();
        const cachedCusts = await offlineDb.getCachedCustomers();
        if (cachedProds.length > 0) setProducts(cachedProds);
        if (cachedCusts.length > 0) {
          setCustomers(cachedCusts);
          setSelectedCustomer(cachedCusts[0]);
        }
      } catch {}

      // 2. Fetch fresh catalog from API or Cloud Firestore
      try {
        const [freshProds, freshCusts] = await Promise.all([
          dataService.getProducts(),
          dataService.getCustomers(),
        ]);

        if (freshProds.length > 0) {
          setProducts(freshProds);
        }
        if (freshCusts.length > 0) {
          setCustomers(freshCusts);
          if (!selectedCustomer) {
            setSelectedCustomer(freshCusts[0]);
          }
        }
      } catch (err) {
        console.warn('[POS] Catalog loading fallback error:', err);
      }
    };
    fetchData();
  }, []);

  // Filter customers based on search
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.mobile.includes(customerSearch)
  );

  // Filter products based on search
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.barcode && p.barcode.includes(productSearch)) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Authoritative Calculation from billing-engine
  const billCalculation = calculateInvoice({
    items: cartItems,
    isInterState: false,
    overallDiscount,
    payments: completedInvoice?.payments || [],
  });

  // Add Product to Cart
  const handleAddProduct = (prod: any) => {
    const existingIndex = cartItems.findIndex(
      (item) => item.productId === prod._id && item.itemType === 'PRODUCT'
    );

    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      setCartItems(updated);
    } else {
      setCartItems([
        ...cartItems,
        {
          id: `prod_${Date.now()}`,
          itemType: 'PRODUCT',
          productId: prod._id,
          name: prod.name,
          hsnSac: prod.hsnSac || '4911',
          quantity: 1,
          unitPrice: prod.sellingPrice,
          discountAmount: 0,
          gstRate: prod.gstRate || 18,
        },
      ]);
    }
  };

  // Add Custom Photo Print to Cart
  const handleAddPhotoPrint = () => {
    const priceRes = calculatePhotoPrintPrice({
      size: printSize,
      quantity: printQty,
      paperFinish: printFinish,
      lamination: printLamination,
    });

    setCartItems([
      ...cartItems,
      {
        id: `print_${Date.now()}`,
        itemType: 'PHOTO_PRINT',
        name: `${printSize} Print (${printFinish}${
          printLamination !== LaminationType.NONE ? ` + ${printLamination}` : ''
        })`,
        hsnSac: '4911',
        quantity: printQty,
        unitPrice: priceRes.finalUnitPrice,
        discountAmount: 0,
        gstRate: 18,
        metadata: {
          size: printSize,
          finish: printFinish,
          lamination: printLamination,
        },
      },
    ]);
  };

  // Add Custom Frame to Cart
  const handleAddFrame = () => {
    const frameRes = calculateCustomFramePrice({
      widthInches: frameWidth,
      heightInches: frameHeight,
      ratePerInch: frameRatePerInch,
      hasGlass: frameHasGlass,
      hasMount: frameHasMount,
    });

    setCartItems([
      ...cartItems,
      {
        id: `frame_${Date.now()}`,
        itemType: 'FRAME',
        name: `${frameWidth}x${frameHeight} Custom Frame${
          frameHasGlass ? ' + Glass' : ''
        }${frameHasMount ? ' + Mount' : ''}`,
        hsnSac: '4414',
        quantity: 1,
        unitPrice: frameRes.totalFramePrice,
        discountAmount: 0,
        gstRate: 18,
        metadata: {
          width: frameWidth,
          height: frameHeight,
          ratePerInch: frameRatePerInch,
          hasGlass: frameHasGlass,
          hasMount: frameHasMount,
        },
      },
    ]);
  };

  const handleUpdateQty = (index: number, delta: number) => {
    const updated = [...cartItems];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
    }
    setCartItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...cartItems];
    updated.splice(index, 1);
    setCartItems(updated);
  };

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newCustomerMobile) return;

    try {
      const created = await dataService.saveCustomer({
        name: newCustomerName,
        mobile: newCustomerMobile,
        city: 'Karaikudi',
        state: 'Tamil Nadu',
      });
      setSelectedCustomer(created);
      setCustomers([created, ...customers]);
      setShowAddCustomerModal(false);
      setNewCustomerName('');
      setNewCustomerMobile('');
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    }
  };

  const handleOpenCheckout = () => {
    if (!selectedCustomer) {
      alert('Please select or create a customer before checkout.');
      return;
    }
    if (cartItems.length === 0) {
      alert('Cart is empty.');
      return;
    }

    setTenderAmount(billCalculation.grandTotal);
    setCashAmount(Math.floor(billCalculation.grandTotal / 2));
    setUpiAmount(billCalculation.grandTotal - Math.floor(billCalculation.grandTotal / 2));
    setShowPaymentModal(true);
  };

  const handleCompleteSale = async () => {
    setIsProcessing(true);
    try {
      const payments = isSplit
        ? [
            {
              id: `p_cash_${Date.now()}`,
              method: PaymentMethod.CASH,
              amount: cashAmount,
              receivedAt: new Date().toISOString(),
              receivedBy: 'Counter Staff',
            },
            {
              id: `p_upi_${Date.now()}`,
              method: PaymentMethod.UPI,
              amount: upiAmount,
              referenceNumber: 'UPI-TXN',
              receivedAt: new Date().toISOString(),
              receivedBy: 'Counter Staff',
            },
          ]
        : [
            {
              id: `p_${Date.now()}`,
              method: tenderMethod,
              amount: tenderAmount,
              referenceNumber: tenderMethod === PaymentMethod.UPI ? 'UPI-POS-VERIFIED' : undefined,
              receivedAt: new Date().toISOString(),
              receivedBy: 'Counter Staff',
            },
          ];

      const invoicePayload = {
        customerId: selectedCustomer?._id,
        customerName: selectedCustomer?.name || 'Walk-in Customer',
        customerMobile: selectedCustomer?.mobile || '9999999999',
        customerGstin: selectedCustomer?.gstin,
        placeOfSupply: 'Tamil Nadu',
        items: cartItems,
        discountAmount: overallDiscount,
        payments,
      };

      const calc = calculateInvoice({
        items: cartItems,
        overallDiscount,
        payments,
      });

      const finalInvoice = await dataService.saveInvoice(invoicePayload, calc);

      setCompletedInvoice(finalInvoice);
      setShowPaymentModal(false);
      setShowReceiptModal(true);

      // Clear Cart
      setCartItems([]);
      setOverallDiscount(0);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to generate invoice.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-3 min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)]">
      {/* Mobile Segmented Toggle (Hidden on Desktop) */}
      <div className="lg:hidden flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('CATALOG')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
            mobileTab === 'CATALOG'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <SquareCode className="w-3.5 h-3.5" />
          <span>Catalog & Items</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('CART')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
            mobileTab === 'CART'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Cart ({cartItems.length}) • {formatINR(billCalculation.grandTotal)}</span>
        </button>
      </div>

      {/* Main Split Body: Left Catalog + Right Cart */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 sm:gap-4 overflow-hidden">
        {/* LEFT SECTION: Item Selection & Customizers */}
        <div
          className={`flex-1 flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm ${
            mobileTab === 'CATALOG' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setActiveTab('PRODUCTS')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'PRODUCTS'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <SquareCode className="w-4 h-4 shrink-0" />
              <span>Products & Gifts</span>
            </button>

            <button
              onClick={() => setActiveTab('PHOTO_PRINTS')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'PHOTO_PRINTS'
                  ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ImageIcon className="w-4 h-4 shrink-0" />
              <span>Photo Prints</span>
            </button>

            <button
              onClick={() => setActiveTab('FRAMES')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'FRAMES'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Custom Frames</span>
            </button>
          </div>

        {/* TAB 1: STORE PRODUCTS */}
        {activeTab === 'PRODUCTS' && (
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search products by Name, SKU, or Barcode..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Product Cards Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pr-1">
              {filteredProducts.map((prod) => (
                <div
                  key={prod._id}
                  onClick={() => handleAddProduct(prod)}
                  className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/50 rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] shadow-sm select-none"
                >
                  <div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-semibold">
                      {prod.sku}
                    </span>
                    <h3 className="font-semibold text-xs text-white mt-1.5 line-clamp-2">
                      {prod.name}
                    </h3>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <div>
                      <p className="text-sm font-black text-white">{formatINR(prod.sellingPrice)}</p>
                      <p className="text-[10px] text-slate-400">GST: {prod.gstRate}%</p>
                    </div>
                    <span className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                      +
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: PHOTO PRINT CUSTOMIZER */}
        {activeTab === 'PHOTO_PRINTS' && (
          <div className="flex-1 p-5 overflow-y-auto space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                1. Select Photo Print Size (Trending Studio Authentic Matrix)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {INITIAL_PHOTO_PRINT_PRICES.map((item) => (
                  <button
                    key={item.size}
                    type="button"
                    onClick={() => setPrintSize(item.size)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      printSize === item.size
                        ? 'bg-pink-600 border-pink-500 text-white font-bold shadow-md shadow-pink-600/30'
                        : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <p className="text-xs uppercase">{item.size}</p>
                    <p className="text-[11px] text-pink-300 font-bold mt-0.5">₹{item.price}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  2. Paper Finish
                </label>
                <select
                  value={printFinish}
                  onChange={(e) => setPrintFinish(e.target.value as PaperFinish)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                >
                  <option value={PaperFinish.GLOSSY}>High Gloss (Standard)</option>
                  <option value={PaperFinish.MATTE}>Premium Matte (+10%)</option>
                  <option value={PaperFinish.METALLIC}>Pearl Metallic (+25%)</option>
                  <option value={PaperFinish.LUSTER}>Luster Satin (+15%)</option>
                  <option value={PaperFinish.CANVAS}>Artistic Canvas (+40%)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  3. Lamination Add-on
                </label>
                <select
                  value={printLamination}
                  onChange={(e) => setPrintLamination(e.target.value as LaminationType)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                >
                  <option value={LaminationType.NONE}>None (Raw Print)</option>
                  <option value={LaminationType.COLD_MATTE}>Cold Matte (+₹15)</option>
                  <option value={LaminationType.COLD_GLOSS}>Cold Gloss (+₹15)</option>
                  <option value={LaminationType.THERMAL_MATTE}>Thermal Heavy Matte (+₹25)</option>
                  <option value={LaminationType.VELVET}>Royal Velvet Touch (+₹40)</option>
                  <option value={LaminationType.SPARKLE}>Sparkle Diamond Glitter (+₹35)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-bold text-slate-300">Quantity:</span>
                <div className="flex items-center space-x-2 bg-slate-950 border border-slate-700 rounded-xl p-1">
                  <button
                    onClick={() => setPrintQty(Math.max(1, printQty - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-white">{printQty}</span>
                  <button
                    onClick={() => setPrintQty(printQty + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddPhotoPrint}
                className="bg-pink-600 hover:bg-pink-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-pink-600/30 transition-transform active:scale-95"
              >
                + Add Photo Print to Bill
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOM FRAME CALCULATOR */}
        {activeTab === 'FRAMES' && (
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Width (Inches)
                </label>
                <input
                  type="number"
                  min="4"
                  max="72"
                  value={frameWidth}
                  onChange={(e) => setFrameWidth(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Height (Inches)
                </label>
                <input
                  type="number"
                  min="4"
                  max="72"
                  value={frameHeight}
                  onChange={(e) => setFrameHeight(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Moulding Type / Style
              </label>
              <select
                value={frameRatePerInch}
                onChange={(e) => setFrameRatePerInch(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              >
                <option value={7}>Teak Wood Synthetic Moulding (₹7.00 / running inch)</option>
                <option value={9.5}>Royal Classic Gold Ornate (₹9.50 / running inch)</option>
                <option value={6}>Sleek Minimalist Matte Black (₹6.00 / running inch)</option>
                <option value={12}>3D Deep Shadow Box for Collages (₹12.00 / running inch)</option>
              </select>
            </div>

            <div className="flex items-center space-x-6 pt-2">
              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={frameHasGlass}
                  onChange={(e) => setFrameHasGlass(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0 w-4 h-4 bg-slate-950"
                />
                <span>Include Glass Front</span>
              </label>

              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={frameHasMount}
                  onChange={(e) => setFrameHasMount(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0 w-4 h-4 bg-slate-950"
                />
                <span>Include White Mount Board (2-inch border)</span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={handleAddFrame}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-indigo-600/30 transition-transform active:scale-95"
              >
                + Add Custom Frame to Bill
              </button>
            </div>
          </div>
        )}
        {/* Mobile Floating Cart Summary Button in Catalog Mode */}
        {cartItems.length > 0 && (
          <div className="lg:hidden p-2.5 bg-slate-950/95 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab('CART')}
              className="w-full flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-4 h-4" />
                <span>{cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-extrabold">{formatINR(billCalculation.grandTotal)}</span>
                <span className="text-blue-200">View Cart →</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* RIGHT SECTION: Cart, Customer Selector, Tax Breakdown, Checkout */}
      <div
        className={`w-full lg:w-96 flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm ${
          mobileTab === 'CART' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {/* Mobile Cart Header Navigation */}
        <div className="lg:hidden p-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('CATALOG')}
            className="flex items-center space-x-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 py-1 px-2.5 rounded-lg bg-blue-500/10"
          >
            <span>← Back to Catalog</span>
          </button>
          <span className="text-xs text-slate-300 font-bold">Review & Bill ({cartItems.length})</span>
        </div>
        {/* Customer Header */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex-1 mr-2">
            {selectedCustomer ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{selectedCustomer.name}</p>
                  <p className="text-[11px] font-mono text-slate-400">{selectedCustomer.mobile}</p>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-[11px] text-blue-400 hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Select or Search Customer..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                />
                {customerSearch && filteredCustomers.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto">
                    {filteredCustomers.map((c) => (
                      <div
                        key={c._id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearch('');
                        }}
                        className="px-3 py-2 hover:bg-slate-700 text-xs text-white cursor-pointer"
                      >
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-[10px] text-slate-400">{c.mobile}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowAddCustomerModal(true)}
            title="Quick Add Customer"
            className="p-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Cart Line Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cartItems.length > 0 ? (
            cartItems.map((item, idx) => (
              <div
                key={item.id || idx}
                className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center justify-between"
              >
                <div className="flex-1 pr-2">
                  <p className="text-xs font-semibold text-white line-clamp-1">{item.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {formatINR(item.unitPrice)} × {item.quantity} (GST {item.gstRate}%)
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg">
                    <button
                      onClick={() => handleUpdateQty(idx, -1)}
                      className="px-2 py-0.5 text-slate-300 hover:text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold text-white px-1">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQty(idx, 1)}
                      className="px-2 py-0.5 text-slate-300 hover:text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <p className="text-xs font-bold text-white w-16 text-right">
                    {formatINR(item.unitPrice * item.quantity)}
                  </p>

                  <button
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-10">
              <Sparkles className="w-8 h-8 mb-2 text-slate-600" />
              <p>Cart is currently empty.</p>
              <p className="text-[11px] text-slate-600 mt-1">Select products or prints on the left.</p>
            </div>
          )}
        </div>

        {/* Cart Financial Summary & Checkout Button */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Taxable Amount</span>
            <span>{formatINR(billCalculation.taxableAmount)}</span>
          </div>

          <div className="flex justify-between text-xs text-slate-400">
            <span>CGST + SGST (Intra-State Tamil Nadu)</span>
            <span>{formatINR(billCalculation.totalTax)}</span>
          </div>

          {billCalculation.roundOff !== 0 && (
            <div className="flex justify-between text-xs text-slate-400">
              <span>GST Round Off</span>
              <span>{formatINR(billCalculation.roundOff)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
            <span className="text-sm font-bold text-white">Grand Total</span>
            <span className="text-2xl font-black text-white">
              {formatINR(billCalculation.grandTotal)}
            </span>
          </div>

          <button
            onClick={handleOpenCheckout}
            disabled={cartItems.length === 0}
            className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-40"
          >
            <span>Proceed to Payment</span>
            <span>•</span>
            <span>{formatINR(billCalculation.grandTotal)}</span>
          </button>
        </div>
      </div>
    </div>

      {/* MODAL 1: QUICK ADD CUSTOMER */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base">Quick Add Customer</h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kuralarasan"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mobile Number (10 Digits) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 7904064446"
                  value={newCustomerMobile}
                  onChange={(e) => setNewCustomerMobile(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm"
              >
                Save & Continue Billing
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PAYMENT TENDER */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-base">Complete Payment Tender</h3>
                <p className="text-xs text-slate-400">Total Due: {formatINR(billCalculation.grandTotal)}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Payment Mode Selector */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTenderMethod(PaymentMethod.UPI);
                    setIsSplit(false);
                  }}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    !isSplit && tenderMethod === PaymentMethod.UPI
                      ? 'bg-blue-600 border-blue-500 text-white font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <QrCode className="w-5 h-5 mx-auto mb-1 text-indigo-400" />
                  <span className="text-xs">UPI / GPay</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTenderMethod(PaymentMethod.CASH);
                    setIsSplit(false);
                  }}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    !isSplit && tenderMethod === PaymentMethod.CASH
                      ? 'bg-blue-600 border-blue-500 text-white font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <Banknote className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                  <span className="text-xs">Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSplit(true)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isSplit
                      ? 'bg-blue-600 border-blue-500 text-white font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                  <span className="text-xs">Split Tender</span>
                </button>
              </div>

              {/* UPI QR Display Preview */}
              {!isSplit && tenderMethod === PaymentMethod.UPI && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <div className="w-32 h-32 bg-white rounded-xl mx-auto flex items-center justify-center p-2 mb-2 shadow-inner">
                    {/* Simulated SVG QR */}
                    <div className="text-slate-900 text-center">
                      <QrCode className="w-20 h-20 mx-auto text-blue-600" />
                      <p className="text-[9px] font-mono font-bold mt-1">7904064446@upi</p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-slate-300">
                    Scan using Google Pay, PhonePe, or Paytm
                  </p>
                  <p className="text-[11px] text-slate-500">Trending Studio • Karaikudi</p>
                </div>
              )}

              {/* Split Tender Inputs */}
              {isSplit && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Cash Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      UPI Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={upiAmount}
                      onChange={(e) => setUpiAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white"
                    />
                  </div>
                  <p className="text-xs text-right text-slate-400">
                    Total: {formatINR(cashAmount + upiAmount)} / {formatINR(billCalculation.grandTotal)}
                  </p>
                </div>
              )}

              <button
                onClick={handleCompleteSale}
                disabled={isProcessing}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2"
              >
                {isProcessing ? <span>Processing...</span> : <span>Confirm & Generate Official GST Bill</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: INVOICE PRINT & SHARE PREVIEW */}
      {showReceiptModal && completedInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base">
                  {completedInvoice.isOffline ? 'Offline Invoice Generated' : 'Invoice Generated Successfully!'}
                </h3>
                <p className="text-xs font-mono font-bold">
                  {completedInvoice.isOffline ? (
                    <span className="text-amber-400">Temporary Bill: {completedInvoice.invoiceNumber} (Will sync to Firebase automatically)</span>
                  ) : (
                    <span className="text-blue-400">Official GST Number: {completedInvoice.invoiceNumber}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setReceiptType(receiptType === 'THERMAL' ? 'A4' : 'THERMAL')}
                  className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Switch to {receiptType === 'THERMAL' ? 'A4 Format' : '58mm Thermal'}
                </button>
                <button onClick={() => setShowReceiptModal(false)} className="text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Paper Container */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-950 rounded-xl flex justify-center">
              <div
                id="printable-receipt"
                className={`bg-white text-black p-4 font-mono text-xs shadow-md ${
                  receiptType === 'THERMAL' ? 'w-72' : 'w-full'
                }`}
              >
                {/* Header */}
                <div className="text-center pb-2 border-b border-black">
                  <p className="font-black text-sm">TRENDING STUDIO</p>
                  <p className="text-[10px]">GIFTS & FRAMES</p>
                  <p className="text-[9px]">Karaikudi - 630001 | Phone: 79040-64446</p>
                  <p className="text-[9px]">GSTIN: 33ABCDE1234F1Z5</p>
                </div>

                {/* Meta */}
                <div className="py-2 border-b border-dashed border-black text-[10px]">
                  <p>Bill: {completedInvoice.invoiceNumber}</p>
                  <p>Date: {formatISTDateTime(completedInvoice.createdAt)}</p>
                  <p>Customer: {completedInvoice.customerName}</p>
                  <p>Phone: {completedInvoice.customerMobile}</p>
                </div>

                {/* Items */}
                <div className="py-2 border-b border-dashed border-black">
                  <table className="w-full text-left text-[10px]">
                    <thead>
                      <tr className="border-b border-black">
                        <th>Item</th>
                        <th className="text-center">Qty</th>
                        <th className="text-right">Amt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedInvoice.items.map((it: any, i: number) => (
                        <tr key={i}>
                          <td className="py-0.5 pr-1">{it.name}</td>
                          <td className="py-0.5 text-center">{it.quantity}</td>
                          <td className="py-0.5 text-right">₹{it.totalAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Taxes & Totals */}
                <div className="py-2 border-b border-black text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Taxable:</span>
                    <span>₹{completedInvoice.taxableAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST (9%):</span>
                    <span>₹{completedInvoice.cgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST (9%):</span>
                    <span>₹{completedInvoice.sgstAmount.toFixed(2)}</span>
                  </div>
                  {completedInvoice.roundOff !== 0 && (
                    <div className="flex justify-between">
                      <span>Round Off:</span>
                      <span>₹{completedInvoice.roundOff.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-xs pt-1 border-t border-black">
                    <span>GRAND TOTAL:</span>
                    <span>₹{completedInvoice.grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center pt-3 text-[9px]">
                  <p>Thank You! Visit Again!</p>
                  <p>Photos • Frames • Custom Gifts</p>
                </div>
              </div>
            </div>

            {/* Print & Share Action Buttons */}
            <div className="pt-4 mt-2 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  const message = encodeURIComponent(
                    `Hello ${completedInvoice.customerName}, Thank you for visiting Trending Studio! Your bill ${completedInvoice.invoiceNumber} for ₹${completedInvoice.grandTotal} is ready.`
                  );
                  window.open(`https://wa.me/91${completedInvoice.customerMobile}?text=${message}`, '_blank');
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5"
              >
                <Share2 className="w-4 h-4" />
                <span>Share WhatsApp</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-lg shadow-blue-600/30"
              >
                <Printer className="w-4 h-4" />
                <span>Print Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
