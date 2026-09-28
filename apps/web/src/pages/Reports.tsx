import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatINR } from '@trending-studio/utils';
import { BarChart3, Download, Calendar, FileSpreadsheet } from 'lucide-react';

export const Reports: React.FC = () => {
  const [dailyData, setDailyData] = useState<any>(null);
  const [gstData, setGstData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [dailyRes, gstRes] = await Promise.all([
          api.get('/reports/daily-summary'),
          api.get('/reports/gst'),
        ]);
        setDailyData(dailyRes.data.data);
        setGstData(gstRes.data.data);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span>Financial & GST Compliance Reports</span>
          </h1>
          <p className="text-xs text-slate-400">
            Real-time daily cash tallies, UPI reconciliations, and GSTR-1 HSN summaries
          </p>
        </div>
      </div>

      {/* Daily Cash & UPI Split Summary */}
      {dailyData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400 font-semibold uppercase">Today's Total Sales</p>
            <p className="text-2xl font-black text-white mt-1">{formatINR(dailyData.todaySales)}</p>
            <p className="text-[11px] text-slate-500 mt-1">{dailyData.todayInvoicesCount} invoices issued</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400 font-semibold uppercase">UPI Collected (Digital)</p>
            <p className="text-2xl font-black text-indigo-400 mt-1">{formatINR(dailyData.upiCollected)}</p>
            <p className="text-[11px] text-slate-500 mt-1">GPay, PhonePe, Paytm QR</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400 font-semibold uppercase">Cash in Register</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{formatINR(dailyData.cashCollected)}</p>
            <p className="text-[11px] text-slate-500 mt-1">Physical counter collections</p>
          </div>
        </div>
      )}

      {/* GSTR-1 HSN Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">GSTR-1 Summary (HSN / SAC Wise)</h2>
            <p className="text-xs text-slate-400">
              Taxable values and tax splits for GST filing
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase bg-slate-800/80 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">HSN/SAC</th>
                <th className="px-4 py-3">GST Rate</th>
                <th className="px-4 py-3 text-right">Taxable Value</th>
                <th className="px-4 py-3 text-right">CGST Amount</th>
                <th className="px-4 py-3 text-right">SGST Amount</th>
                <th className="px-4 py-3 text-right">Total Tax</th>
                <th className="px-4 py-3 text-right">Total Invoice Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {gstData?.hsnSummary?.map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-mono font-bold text-blue-400">{row.hsnSac}</td>
                  <td className="px-4 py-3 font-semibold">{row.gstRate}%</td>
                  <td className="px-4 py-3 text-right font-mono">{formatINR(row.taxableAmount)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatINR(row.cgstAmount)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatINR(row.sgstAmount)}</td>
                  <td className="px-4 py-3 text-right font-mono text-pink-400">{formatINR(row.totalTax)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-white">
                    {formatINR(row.totalAmount)}
                  </td>
                </tr>
              ))}

              {(!gstData?.hsnSummary || gstData.hsnSummary.length === 0) && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-500">
                    No taxable transactions recorded yet.
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
