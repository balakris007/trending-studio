import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { formatINR } from '@trending-studio/utils';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  CreditCard,
  Banknote,
  KanbanSquare,
  AlertTriangle,
  PlusCircle,
  Clock,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>({
    todaySales: 0,
    todayTax: 0,
    todayInvoicesCount: 0,
    todayOrdersCount: 0,
    cashCollected: 0,
    upiCollected: 0,
    cardCollected: 0,
    lowStockCount: 0,
    lowStockProducts: [],
  });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [sumRes, invRes] = await Promise.all([
          api.get('/reports/daily-summary'),
          api.get('/invoices?limit=5'),
        ]);
        setSummary(sumRes.data.data);
        setRecentInvoices(invRes.data.data || []);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Demo trend data for chart
  const salesTrend = [
    { day: 'Mon', sales: 4200 },
    { day: 'Tue', sales: 6800 },
    { day: 'Wed', sales: 5400 },
    { day: 'Thu', sales: 8900 },
    { day: 'Fri', sales: 7600 },
    { day: 'Sat', sales: 12400 },
    { day: 'Sun', sales: summary.todaySales > 0 ? summary.todaySales : 9500 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/20 border border-blue-500/20 rounded-2xl p-6 shadow-lg">
        <div>
          <h1 className="text-2xl font-black text-white">Trending Studio Manager Console</h1>
          <p className="text-sm text-slate-300 mt-1">
            Photo Printing • Custom Framing • Gifts • Karaikudi Store
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-blue-600/30 transition-transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Bill</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Sales</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white">{formatINR(summary.todaySales)}</p>
          <p className="text-xs text-slate-400 mt-1">
            {summary.todayInvoicesCount} invoices generated today
          </p>
        </div>

        {/* UPI Collected */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">UPI Collections</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-400">{formatINR(summary.upiCollected)}</p>
          <p className="text-xs text-slate-400 mt-1">GPay, PhonePe, Paytm</p>
        </div>

        {/* Cash Collected */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cash in Counter</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400">{formatINR(summary.cashCollected)}</p>
          <p className="text-xs text-slate-400 mt-1">Ready for drawer tally</p>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Stock Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400">{summary.lowStockCount}</p>
          <p className="text-xs text-slate-400 mt-1">Items at or below min threshold</p>
        </div>
      </div>

      {/* Charts & Production Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Revenue Trend */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white">Revenue Performance (7 Days)</h2>
              <p className="text-xs text-slate-400">Daily store sales trend</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stop-color="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stop-color="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `₹${val}`} />
                <Tooltip
                  formatter={(val: any) => [formatINR(Number(val)), 'Sales']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Studio Production Kanban Quick Snapshot */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <KanbanSquare className="w-4 h-4 text-blue-400" />
                <span>Production Workflow</span>
              </h2>
              <button
                onClick={() => navigate('/orders')}
                className="text-xs text-blue-400 hover:underline"
              >
                View Kanban
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <div className="flex items-center space-x-3">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-slate-200">Designing / Editing</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  3 In Progress
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-200">Printing & Framing</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  5 Orders
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-200">Ready for Pickup</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  4 Customer Ready
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4">
            <p className="text-[11px] text-slate-400">
              Automatic customer SMS / WhatsApp notifications are sent when orders reach{' '}
              <span className="text-emerald-400 font-semibold">Ready</span> stage.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Recent Invoices</span>
          </h2>
          <button
            onClick={() => navigate('/invoices')}
            className="text-xs text-blue-400 hover:underline"
          >
            All Invoices →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-800/60 text-slate-400 font-semibold">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Invoice No</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Grand Total</th>
                <th className="px-4 py-3 rounded-r-xl">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentInvoices.length > 0 ? (
                recentInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-blue-400">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{inv.customerName}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{inv.customerMobile}</td>
                    <td className="px-4 py-3 text-slate-400">{inv.items?.length || 0} items</td>
                    <td className="px-4 py-3 font-bold text-white">{formatINR(inv.grandTotal)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                          inv.paymentStatus === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {inv.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-500">
                    No invoices generated yet today. Click "Create New Bill" above to start!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
