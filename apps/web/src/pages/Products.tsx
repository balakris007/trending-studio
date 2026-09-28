import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { dataService } from '../services/dataService';
import { formatINR } from '@trending-studio/utils';
import { Search, Plus, Package, AlertTriangle, ArrowUpDown, X, Tag } from 'lucide-react';
import { IProduct } from '@trending-studio/shared-types';

export const Products: React.FC = () => {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<IProduct | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Stock Adjustment Form
  const [qtyDelta, setQtyDelta] = useState(0);
  const [adjNotes, setAdjNotes] = useState('');

  // Add Product Form
  const [newProd, setNewProd] = useState({
    sku: '',
    name: '',
    category: 'Customized Gifts',
    barcode: '',
    hsnSac: '4911',
    sellingPrice: 0,
    gstRate: 18,
    stock: 10,
    minStock: 5,
  });

  const fetchProducts = async () => {
    try {
      const prods = await dataService.getProducts(search);
      setProducts(prods || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      await dataService.adjustProductStock(
        selectedProduct._id || selectedProduct.id,
        Number(qtyDelta),
        adjNotes
      );
      setShowStockModal(false);
      setQtyDelta(0);
      setAdjNotes('');
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to update stock');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dataService.saveProduct(newProd);
      setShowAddModal(false);
      setNewProd({
        sku: '',
        name: '',
        category: 'Customized Gifts',
        barcode: '',
        hsnSac: '4911',
        sellingPrice: 0,
        gstRate: 18,
        stock: 10,
        minStock: 5,
      });
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to create product');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-400" />
            <span>Product Catalog & Stock Management</span>
          </h1>
          <p className="text-xs text-slate-400">
            Track gift merchandise, photo albums, barcodes, and inventory adjustments
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Name, SKU or Barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Product</span>
          </button>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase bg-slate-800/80 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">SKU & Barcode</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Selling Price</th>
                <th className="px-4 py-3">GST Rate</th>
                <th className="px-4 py-3">Current Stock</th>
                <th className="px-4 py-3 text-right">Adjust Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {products.map((p) => {
                const isLow = p.stock <= p.minStock;

                return (
                  <tr key={p._id || p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono font-bold text-blue-400">{p.sku}</p>
                      {p.barcode && (
                        <p className="font-mono text-[10px] text-slate-500">{p.barcode}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">{p.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-white">{formatINR(p.sellingPrice)}</td>
                    <td className="px-4 py-3 text-slate-400">{p.gstRate}%</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`font-black text-xs ${
                            isLow ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {p.stock} {p.unit || 'PCS'}
                        </span>
                        {isLow && (
                          <span
                            title="Below minimum stock threshold"
                            className="p-0.5 rounded bg-amber-500/20 text-amber-400"
                          >
                            <AlertTriangle className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setShowStockModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center space-x-1 ml-auto"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        <span>Update Stock</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: STOCK ADJUSTMENT */}
      {showStockModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Adjust Stock Level</h3>
              <button onClick={() => setShowStockModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl text-xs space-y-1">
              <p className="font-bold text-white">{selectedProduct.name}</p>
              <p className="text-slate-400 font-mono">Current Stock: {selectedProduct.stock} PCS</p>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Quantity Change (+ to add, - to deduct) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="+10 or -5"
                  value={qtyDelta}
                  onChange={(e) => setQtyDelta(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason / Reference Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. New stock received from supplier"
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30"
              >
                Apply Stock Update
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD PRODUCT */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Create Catalog Product</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="MUG-005"
                    value={newProd.sku}
                    onChange={(e) => setNewProd({ ...newProd, sku: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Barcode</label>
                  <input
                    type="text"
                    placeholder="890123..."
                    value={newProd.barcode}
                    onChange={(e) => setNewProd({ ...newProd, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Glowing Photo Frame Heart"
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newProd.sellingPrice}
                    onChange={(e) => setNewProd({ ...newProd, sellingPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">GST Rate (%)</label>
                  <select
                    value={newProd.gstRate}
                    onChange={(e) => setNewProd({ ...newProd, gstRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={newProd.stock}
                    onChange={(e) => setNewProd({ ...newProd, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Min Alert Stock</label>
                  <input
                    type="number"
                    value={newProd.minStock}
                    onChange={(e) => setNewProd({ ...newProd, minStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30"
              >
                Save Product
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
