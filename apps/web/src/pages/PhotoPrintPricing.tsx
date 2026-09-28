import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatINR } from '@trending-studio/utils';
import { Image as ImageIcon, Edit3, Check, X, Sparkles } from 'lucide-react';
import { IPhotoPrintSizePrice } from '@trending-studio/shared-types';

export const PhotoPrintPricing: React.FC = () => {
  const [prices, setPrices] = useState<IPhotoPrintSizePrice[]>([]);
  const [editingSize, setEditingSize] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchPricing = async () => {
    try {
      const res = await api.get('/photo-prints/pricing');
      setPrices(res.data.data || []);
    } catch (err) {
      console.error('Failed to load print pricing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const handleSavePrice = async (size: string) => {
    try {
      await api.put('/photo-prints/pricing', {
        size,
        basePrice: editPrice,
        isActive: true,
      });
      setEditingSize(null);
      fetchPricing();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update rate');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white flex items-center space-x-2">
            <ImageIcon className="w-5 h-5 text-pink-400" />
            <span>Photo Print Dimension & Price Master</span>
          </h1>
          <p className="text-xs text-slate-400">
            Configure photo printing base rates (4x6 to 36x60). Rates synchronize across Web & Android.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {prices.map((p) => {
          const isEditing = editingSize === p.size;

          return (
            <div
              key={p.size}
              className="bg-slate-900 border border-slate-800 hover:border-pink-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-black text-white font-mono">{p.size}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  {p.category || 'STANDARD'}
                </span>
              </div>

              <p className="text-xs text-slate-400">
                Dimensions: {p.widthInches}" × {p.heightInches}"
              </p>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                {isEditing ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">₹</span>
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(Number(e.target.value))}
                      className="w-20 px-2 py-1 bg-slate-950 border border-pink-500 rounded-lg text-xs text-white font-bold"
                    />
                    <button
                      onClick={() => handleSavePrice(p.size)}
                      className="p-1 rounded-md bg-emerald-600 text-white"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingSize(null)}
                      className="p-1 rounded-md bg-slate-800 text-slate-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">Base Price</p>
                      <p className="text-lg font-black text-pink-400">{formatINR(p.basePrice)}</p>
                    </div>

                    <button
                      onClick={() => {
                        setEditingSize(p.size);
                        setEditPrice(p.basePrice);
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Edit Price"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
