import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { dataService } from '../services/dataService';
import { exportToCsv } from '../services/firebaseClient';
import { formatINR, formatISTDateTime } from '@trending-studio/utils';
import { Search, Printer, Share2, Eye, Ban, X, FileText, Download, Table } from 'lucide-react';

export const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    try {
      const data = await dataService.getInvoices(search, statusFilter);
      setInvoices(data || []);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter]);

  const handleCancelInvoice = async (invoiceId: string) => {
    const reason = prompt('Please enter cancellation reason:');
    if (!reason) return;

    try {
      await dataService.cancelInvoice(invoiceId, reason);
      fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Cancellation failed.');
    }
  };

  const handleExportCsv = () => {
    if (invoices.length === 0) {
      alert('No invoices to export.');
      return;
    }
    const formatted = invoices.map((inv) => ({
      ...inv,
      totalFormatted: inv.totalAmount || inv.grandTotal || 0,
      dateFormatted: formatISTDateTime(inv.createdAt),
      whatsappFormatted: inv.customerWhatsapp || inv.customerMobile || '',
      addressFormatted: inv.customerAddress || '',
    }));
    exportToCsv(
      `trending_studio_invoices_${new Date().toISOString().slice(0, 10)}.csv`,
      formatted,
      [
        { key: 'invoiceNumber', label: 'Invoice No' },
        { key: 'customerName', label: 'Customer Name' },
        { key: 'customerMobile', label: 'Customer Mobile' },
        { key: 'whatsappFormatted', label: 'Customer WhatsApp' },
        { key: 'addressFormatted', label: 'Customer Address' },
        { key: 'dateFormatted', label: 'Date & Time' },
        { key: 'totalFormatted', label: 'Grand Total (INR)' },
        { key: 'taxAmount', label: 'Tax Amount (INR)' },
        { key: 'status', label: 'Payment Status' },
      ]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span>Official GST Invoices & Bills</span>
          </h1>
          <p className="text-xs text-slate-400">
            Search, print duplicate bills, share to WhatsApp, and audit GST tax values
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Bill No, Customer or Mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
          >
            <option value="">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PARTIAL">Partial</option>
            <option value="UNPAID">Unpaid</option>
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm"
          >
            <Table className="w-3.5 h-3.5" />
            <span>Export Sheets</span>
          </button>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase bg-slate-800/80 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Invoice Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Taxable Value</th>
                <th className="px-4 py-3">GST Total</th>
                <th className="px-4 py-3">Grand Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {invoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-blue-400">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {formatISTDateTime(inv.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{inv.customerName}</p>
                    <div className="flex items-center space-x-2 font-mono text-[10px] text-slate-400">
                      <span>📱 {inv.customerMobile}</span>
                      {inv.customerWhatsapp && inv.customerWhatsapp !== inv.customerMobile && (
                        <span className="text-emerald-400">💬 {inv.customerWhatsapp}</span>
                      )}
                    </div>
                    {inv.customerAddress && (
                      <p className="text-[10px] text-slate-400 truncate max-w-[140px]" title={inv.customerAddress}>
                        📍 {inv.customerAddress}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">{formatINR(inv.taxableAmount)}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {formatINR(inv.totalTax)}
                    <span className="text-[10px] block text-slate-500">
                      (CGST {formatINR(inv.cgstAmount)} + SGST {formatINR(inv.sgstAmount)})
                    </span>
                  </td>
                  <td className="px-4 py-3 font-black text-white">{formatINR(inv.grandTotal)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                        inv.paymentStatus === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {inv.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setShowModal(true);
                      }}
                      title="View Details"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setShowModal(true);
                        setTimeout(() => window.print(), 200);
                      }}
                      title="Print Duplicate Bill"
                      className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        const targetPhone = inv.customerWhatsapp || inv.customerMobile || '';
                        const cleanPhone = targetPhone.replace(/[^0-9]/g, '').slice(-10);
                        const message = encodeURIComponent(
                          `Hello ${inv.customerName}, Greetings from Trending Studio Karaikudi! Your official bill ${inv.invoiceNumber} for ₹${inv.grandTotal} is ready. Thank you!`
                        );
                        window.open(`https://wa.me/91${cleanPhone}?text=${message}`, '_blank');
                      }}
                      title="Share to WhatsApp"
                      className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    {!inv.cancelledAt && (
                      <button
                        onClick={() => handleCancelInvoice(inv._id)}
                        title="Cancel Invoice"
                        className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {invoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    No invoices found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {showModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">
                Invoice Details: {selectedInvoice.invoiceNumber}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl space-y-1.5">
                <p className="font-bold text-white text-sm">{selectedInvoice.customerName}</p>
                <div className="flex flex-wrap gap-x-4 text-slate-400">
                  <span>📱 Phone: +91 {selectedInvoice.customerMobile}</span>
                  {selectedInvoice.customerWhatsapp && (
                    <span className="text-emerald-400 font-semibold">
                      💬 WhatsApp: +91 {selectedInvoice.customerWhatsapp}
                    </span>
                  )}
                </div>
                {selectedInvoice.customerAddress && (
                  <p className="text-slate-300">
                    <span className="text-slate-500">Address:</span> {selectedInvoice.customerAddress}
                  </p>
                )}
                <p className="text-slate-400">Place of Supply: {selectedInvoice.placeOfSupply || 'Tamil Nadu'}</p>
              </div>

              <div>
                <p className="font-bold text-slate-300 mb-1">Line Items:</p>
                <div className="space-y-1">
                  {selectedInvoice.items?.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between p-2 rounded-lg bg-slate-800/80">
                      <span>{it.name} × {it.quantity}</span>
                      <span className="font-bold text-white">{formatINR(it.totalAmount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatINR(selectedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxable:</span>
                  <span>{formatINR(selectedInvoice.taxableAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST (9%):</span>
                  <span>{formatINR(selectedInvoice.cgstAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST (9%):</span>
                  <span>{formatINR(selectedInvoice.sgstAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-white pt-1 border-t border-slate-800">
                  <span>Grand Total:</span>
                  <span>{formatINR(selectedInvoice.grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Bill</span>
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
