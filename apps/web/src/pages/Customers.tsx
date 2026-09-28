import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { dataService } from '../services/dataService';
import { formatINR, formatISTDateTime } from '@trending-studio/utils';
import { Search, UserPlus, Users, Eye, Phone, MapPin, X, BookOpen } from 'lucide-react';
import { ICustomer } from '@trending-studio/shared-types';

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Customer Form State
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    whatsapp: '',
    address: '',
    city: 'Karaikudi',
    gstin: '',
  });

  const fetchCustomers = async () => {
    try {
      const custs = await dataService.getCustomers(search);
      setCustomers(custs || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const handleOpenLedger = async (cust: ICustomer) => {
    setSelectedCustomer(cust);
    try {
      const records = await dataService.getCustomerLedger(cust._id || cust.id);
      setLedger(records || []);
      setShowLedgerModal(true);
    } catch (err) {
      alert('Failed to load customer ledger.');
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dataService.saveCustomer(formData);
      setShowAddModal(false);
      setFormData({
        name: '',
        mobile: '',
        whatsapp: '',
        address: '',
        city: 'Karaikudi',
        gstin: '',
      });
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to create customer.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span>Customer Directory & CRM</span>
          </h1>
          <p className="text-xs text-slate-400">
            Profiles, loyalty points, receivables, and transaction ledgers
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Name or Mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Customer List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase bg-slate-800/80 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Mobile & WhatsApp</th>
                <th className="px-4 py-3">City / Address</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Outstanding Due</th>
                <th className="px-4 py-3">Loyalty Pts</th>
                <th className="px-4 py-3 text-right">Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {customers.map((c) => (
                <tr key={c._id || c.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-white">{c.name}</p>
                    {c.gstin && <p className="font-mono text-[10px] text-blue-400">GST: {c.gstin}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">{c.mobile}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {c.city || 'Karaikudi'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                      {c.customerType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.outstandingBalance > 0 ? (
                      <span className="font-bold text-amber-400">
                        {formatINR(c.outstandingBalance)}
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-semibold">₹ 0.00</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-indigo-400">
                    {c.loyaltyPoints || 0} pts
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenLedger(c)}
                      className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-semibold flex items-center space-x-1 ml-auto"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Ledger</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD CUSTOMER */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">New Customer Profile</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kannan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10 Digits"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="Optional"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">GSTIN (for B2B bills)</label>
                <input
                  type="text"
                  placeholder="33XXXXX1234X1ZX"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Address & City</label>
                <input
                  type="text"
                  placeholder="Karaikudi"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30"
              >
                Create Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CUSTOMER LEDGER */}
      {showLedgerModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base">Customer Ledger</h3>
                <p className="text-xs text-slate-400">
                  {selectedCustomer.name} • {selectedCustomer.mobile}
                </p>
              </div>
              <button onClick={() => setShowLedgerModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[11px] uppercase bg-slate-800/80 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Reference</th>
                    <th className="px-3 py-2 text-right">Debit (+)</th>
                    <th className="px-3 py-2 text-right">Credit (-)</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {ledger.map((entry, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-slate-400">{formatISTDateTime(entry.transactionDate)}</td>
                      <td className="px-3 py-2 font-semibold">{entry.transactionType}</td>
                      <td className="px-3 py-2 font-mono text-blue-400">{entry.referenceNumber}</td>
                      <td className="px-3 py-2 text-right text-rose-400">
                        {entry.debit > 0 ? formatINR(entry.debit) : '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-400">
                        {entry.credit > 0 ? formatINR(entry.credit) : '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-white">
                        {formatINR(entry.balance)}
                      </td>
                    </tr>
                  ))}
                  {ledger.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-500">
                        No financial transactions recorded for this customer yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setShowLedgerModal(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
            >
              Close Ledger
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
