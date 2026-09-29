import React, { useState, useEffect } from 'react';
import {
  SquareCode,
  Plus,
  Edit2,
  Trash2,
  Calculator,
  Layers,
  Sparkles,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Eye,
  Sliders,
  DollarSign,
  Maximize2,
} from 'lucide-react';
import { IFrameType, IFramePriceConfig } from '@trending-studio/shared-types';
import { calculateCustomFramePrice } from '@trending-studio/pricing-engine';
import { dataService } from '../services/dataService';

export const FrameMaster: React.FC = () => {
  const [frameTypes, setFrameTypes] = useState<IFrameType[]>([]);
  const [framePrices, setFramePrices] = useState<IFramePriceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MOULDINGS' | 'SIZES' | 'CALCULATOR'>('MOULDINGS');
  const [searchQuery, setSearchQuery] = useState('');

  // Moulding Modal
  const [isMouldingModalOpen, setIsMouldingModalOpen] = useState(false);
  const [editingMoulding, setEditingMoulding] = useState<Partial<IFrameType> | null>(null);
  const [savingMoulding, setSavingMoulding] = useState(false);

  // Size Modal
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<Partial<IFramePriceConfig> | null>(null);
  const [savingSize, setSavingSize] = useState(false);

  // Calculator State
  const [calcWidth, setCalcWidth] = useState(12);
  const [calcHeight, setCalcHeight] = useState(18);
  const [calcSelectedMouldingId, setCalcSelectedMouldingId] = useState<string>('');
  const [calcHasGlass, setCalcHasGlass] = useState(true);
  const [calcGlassType, setCalcGlassType] = useState<'STANDARD' | 'NON_REFLECTIVE_ACRYLIC'>('STANDARD');
  const [calcHasMount, setCalcHasMount] = useState(false);
  const [calcMountBorder, setCalcMountBorder] = useState(2);

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [types, prices] = await Promise.all([
        dataService.getFrameTypes(),
        dataService.getFramePrices(),
      ]);
      setFrameTypes(types || []);
      setFramePrices(prices || []);
      if (types.length > 0 && !calcSelectedMouldingId) {
        setCalcSelectedMouldingId(types[0].id || (types[0] as any)._id);
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to load frame specifications.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Mouldings
  const filteredMouldings = frameTypes.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle Save Moulding
  const handleSaveMoulding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMoulding?.name?.trim() || !editingMoulding?.code?.trim()) {
      showNotice('Please fill in moulding name and code.', 'error');
      return;
    }
    setSavingMoulding(true);
    try {
      await dataService.saveFrameType(editingMoulding);
      showNotice(`Frame moulding "${editingMoulding.name}" saved successfully!`);
      setIsMouldingModalOpen(false);
      setEditingMoulding(null);
      await loadData();
    } catch (err: any) {
      showNotice(err.message || 'Failed to save moulding.', 'error');
    } finally {
      setSavingMoulding(false);
    }
  };

  // Handle Delete Moulding
  const handleDeleteMoulding = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete moulding "${name}"?`)) return;
    try {
      await dataService.deleteFrameType(id);
      showNotice(`Moulding "${name}" deleted.`);
      await loadData();
    } catch (err: any) {
      showNotice(err.message || 'Failed to delete moulding.', 'error');
    }
  };

  // Selected Moulding for Calculator
  const selectedMoulding =
    frameTypes.find((f) => (f.id || (f as any)._id) === calcSelectedMouldingId) || frameTypes[0];

  // Live Calculator Calculation
  const calcResult = calculateCustomFramePrice({
    widthInches: calcWidth,
    heightInches: calcHeight,
    frameType: selectedMoulding,
    ratePerInch: selectedMoulding?.ratePerInch || 6.5,
    hasGlass: calcHasGlass,
    glassType: calcGlassType,
    hasMount: calcHasMount,
    mountBorderInches: calcMountBorder,
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
            <SquareCode className="w-3.5 h-3.5" />
            <span>Master Framing Specs & Cost Engine</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Frame Master</h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Configure moulding designs, per-inch perimeter formulas, glass & mount rates, and simulate accurate custom framing costs in real time.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {activeTab === 'MOULDINGS' && (
            <button
              onClick={() => {
                setEditingMoulding({
                  code: `FRM_${Date.now().toString().slice(-4)}`,
                  name: '',
                  mouldingWidthInches: 1.5,
                  ratePerInch: 7.0,
                  ratePerSqInch: 0.45,
                  imageUrl: '',
                  isActive: true,
                });
                setIsMouldingModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Moulding Type</span>
            </button>
          )}

          {activeTab === 'CALCULATOR' && (
            <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>₹{calcResult.totalFramePrice.toLocaleString('en-IN')} Quote</span>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('MOULDINGS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'MOULDINGS'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Moulding Designs & Rates ({frameTypes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CALCULATOR')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'CALCULATOR'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Interactive Frame Price Simulator</span>
        </button>
      </div>

      {/* TAB 1: MOULDINGS CATALOG */}
      {activeTab === 'MOULDINGS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search frame mouldings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Showing {filteredMouldings.length} of {frameTypes.length} mouldings
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMouldings.map((moulding) => {
              const mId = moulding.id || (moulding as any)._id;
              return (
                <div
                  key={mId}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all group relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 font-mono rounded text-[10px] uppercase font-bold border border-slate-700">
                          {moulding.code}
                        </span>
                        <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                          {moulding.name}
                        </h3>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          moulding.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {moulding.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>

                    {/* Moulding Image Preview */}
                    {moulding.imageUrl ? (
                      <div className="h-28 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative">
                        <img
                          src={moulding.imageUrl}
                          alt={moulding.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                        <div className="absolute bottom-2 left-2 text-[10px] text-slate-300 font-mono">
                          Width: {moulding.mouldingWidthInches}"
                        </div>
                      </div>
                    ) : (
                      <div className="h-24 rounded-xl border border-dashed border-slate-800 bg-slate-950/50 flex flex-col items-center justify-center text-slate-600 text-xs">
                        <SquareCode className="w-6 h-6 mb-1 opacity-40" />
                        <span>No preview image</span>
                      </div>
                    )}

                    {/* Specs Cards */}
                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                        <div className="text-[10px] text-slate-500 uppercase">Rate / Inch</div>
                        <div className="text-base font-black text-amber-400 mt-0.5">
                          ₹{moulding.ratePerInch}
                          <span className="text-[10px] text-slate-400 font-normal"> /in</span>
                        </div>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                        <div className="text-[10px] text-slate-500 uppercase">Moulding Width</div>
                        <div className="text-base font-black text-blue-400 mt-0.5">
                          {moulding.mouldingWidthInches}
                          <span className="text-[10px] text-slate-400 font-normal"> inches</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingMoulding(moulding);
                        setIsMouldingModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteMoulding(mId, moulding.name)}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE FRAME CALCULATOR SIMULATOR */}
      {activeTab === 'CALCULATOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-white">Framing Dimensions & Options</h2>
              </div>
              <span className="text-xs font-mono text-slate-400">Trending Studio Formula Engine</span>
            </div>

            {/* Moulding Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Selected Moulding Type</label>
              <select
                value={calcSelectedMouldingId}
                onChange={(e) => setCalcSelectedMouldingId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
              >
                {frameTypes.map((ft) => {
                  const ftId = ft.id || (ft as any)._id;
                  return (
                    <option key={ftId} value={ftId}>
                      {ft.name} ({ft.code}) — ₹{ft.ratePerInch}/in ({ft.mouldingWidthInches}" moulding)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Dimension Sliders & Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Photo Width</label>
                  <span className="text-xs font-mono text-blue-400 font-bold">{calcWidth} inches</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="60"
                  step="1"
                  value={calcWidth}
                  onChange={(e) => setCalcWidth(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={calcWidth}
                  onChange={(e) => setCalcWidth(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white mt-1"
                />
              </div>

              <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Photo Height</label>
                  <span className="text-xs font-mono text-blue-400 font-bold">{calcHeight} inches</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="72"
                  step="1"
                  value={calcHeight}
                  onChange={(e) => setCalcHeight(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={calcHeight}
                  onChange={(e) => setCalcHeight(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white mt-1"
                />
              </div>
            </div>

            {/* Glass & Matting Options */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/80">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white">Glass / Acrylic Protection</div>
                  <div className="text-[11px] text-slate-400">Add front protection float glass or acrylic</div>
                </div>
                <input
                  type="checkbox"
                  checked={calcHasGlass}
                  onChange={(e) => setCalcHasGlass(e.target.checked)}
                  className="w-5 h-5 accent-blue-500 rounded cursor-pointer"
                />
              </div>

              {calcHasGlass && (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                  <label className="text-[11px] font-bold text-slate-400">Glass Type Material</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCalcGlassType('STANDARD')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        calcGlassType === 'STANDARD'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      Clear Float Glass (₹0.45/sq.in)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcGlassType('NON_REFLECTIVE_ACRYLIC')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        calcGlassType === 'NON_REFLECTIVE_ACRYLIC'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      Anti-Glare Acrylic (₹0.95/sq.in)
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/80">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white">Matte / Mount Board Border</div>
                  <div className="text-[11px] text-slate-400">Add luxury acid-free matting border</div>
                </div>
                <input
                  type="checkbox"
                  checked={calcHasMount}
                  onChange={(e) => setCalcHasMount(e.target.checked)}
                  className="w-5 h-5 accent-blue-500 rounded cursor-pointer"
                />
              </div>

              {calcHasMount && (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-400">Matting Border Width</label>
                    <span className="text-xs font-mono text-amber-400 font-bold">{calcMountBorder}" all around</span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 1.5, 2, 2.5, 3].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setCalcMountBorder(b)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold ${
                          calcMountBorder === b
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {b}"
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Real-Time Price Breakdown & Mockup */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-bold text-white">Quote Breakdown (INR)</h2>
                </div>
                <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg font-mono font-bold">
                  {calcWidth}" × {calcHeight}" Custom Frame
                </span>
              </div>

              {/* Graphic Frame Mockup */}
              <div className="h-44 bg-slate-950 rounded-2xl border border-slate-800 p-4 flex items-center justify-center relative overflow-hidden">
                <div
                  className="border-8 border-amber-800 shadow-2xl flex items-center justify-center transition-all duration-300 relative"
                  style={{
                    width: `${Math.min(220, Math.max(100, (calcWidth / calcHeight) * 140))}px`,
                    height: '140px',
                    borderColor:
                      selectedMoulding?.code === 'FRM_GOLD'
                        ? '#ca8a04'
                        : selectedMoulding?.code === 'FRM_BLACK_BOX'
                        ? '#09090b'
                        : selectedMoulding?.code === 'FRM_WHITE'
                        ? '#e2e8f0'
                        : '#78350f',
                    backgroundColor: calcHasMount ? '#f8fafc' : '#1e293b',
                    padding: calcHasMount ? `${calcMountBorder * 4}px` : '0px',
                  }}
                >
                  <div className="w-full h-full bg-slate-800/90 flex flex-col items-center justify-center text-center p-2">
                    <Maximize2 className="w-5 h-5 text-slate-400 mb-1 opacity-60" />
                    <span className="text-[10px] font-mono text-slate-300 font-bold">
                      {calcWidth}" × {calcHeight}"
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {calcResult.areaSqInches} sq.in
                    </span>
                  </div>
                </div>
              </div>

              {/* Formula & Cost Items */}
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-2 border-b border-slate-800/60 text-slate-300">
                  <span className="text-slate-400">Perimeter Moulding ({calcResult.perimeterInches}" @ ₹{selectedMoulding?.ratePerInch || 6.5}/in):</span>
                  <span className="font-bold text-white">₹{calcResult.mouldingCost}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-800/60 text-slate-300">
                  <span className="text-slate-400">
                    Front Protection ({calcHasGlass ? calcGlassType.replace('_', ' ') : 'None'}):
                  </span>
                  <span className="font-bold text-white">₹{calcResult.glassCost}</span>
                </div>

                {calcHasMount && (
                  <div className="flex justify-between py-2 border-b border-slate-800/60 text-slate-300">
                    <span className="text-slate-400">Matte Mount Board ({calcMountBorder}" Border):</span>
                    <span className="font-bold text-white">₹{calcResult.mountCost}</span>
                  </div>
                )}

                <div className="flex justify-between py-2 border-b border-slate-800/60 text-slate-300">
                  <span className="text-slate-400">MDF Backing Sheet:</span>
                  <span className="font-bold text-white">₹{calcResult.backingCost}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-800/60 text-slate-300">
                  <span className="text-slate-400">Studio Assembly & Fitting Fee:</span>
                  <span className="font-bold text-white">₹{calcResult.assemblyCost}</span>
                </div>

                {/* Total Final Price */}
                <div className="flex justify-between items-center pt-4 text-base">
                  <span className="font-bold text-slate-200">Total Frame Price:</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-400">
                      ₹{calcResult.totalFramePrice.toLocaleString('en-IN')}
                    </span>
                    <div className="text-[10px] text-slate-400 font-sans">
                      (Includes 18% GST & Framing Hardware)
                    </div>
                  </div>
                </div>
              </div>

              {/* Copy Quote Button */}
              <button
                onClick={() => {
                  const summary = `Trending Studio Frame Quote: ${calcWidth}"x${calcHeight}" with ${selectedMoulding?.name} = ₹${calcResult.totalFramePrice}`;
                  navigator.clipboard.writeText(summary);
                  showNotice('Frame quote copied to clipboard!');
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>Copy Customer Quote (₹{calcResult.totalFramePrice})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT MOULDING TYPE */}
      {isMouldingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingMoulding?.id ? 'Edit Frame Moulding' : 'Add New Frame Moulding'}
              </h3>
              <button
                onClick={() => setIsMouldingModalOpen(false)}
                className="text-slate-500 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMoulding} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Moulding Code</label>
                  <input
                    type="text"
                    required
                    value={editingMoulding?.code || ''}
                    onChange={(e) =>
                      setEditingMoulding((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                    }
                    placeholder="e.g. FRM_TEAK"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Rate Per Inch (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editingMoulding?.ratePerInch ?? 7.0}
                    onChange={(e) =>
                      setEditingMoulding((prev) => ({ ...prev, ratePerInch: Number(e.target.value) }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Moulding Design Name</label>
                <input
                  type="text"
                  required
                  value={editingMoulding?.name || ''}
                  onChange={(e) => setEditingMoulding((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Teak Synthetic Matte Carved"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Moulding Width (Inches)</label>
                  <input
                    type="number"
                    step="0.25"
                    required
                    value={editingMoulding?.mouldingWidthInches ?? 1.5}
                    onChange={(e) =>
                      setEditingMoulding((prev) => ({ ...prev, mouldingWidthInches: Number(e.target.value) }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Status</label>
                  <select
                    value={editingMoulding?.isActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) =>
                      setEditingMoulding((prev) => ({ ...prev, isActive: e.target.value === 'ACTIVE' }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Preview Image URL (Optional)</label>
                <input
                  type="url"
                  value={editingMoulding?.imageUrl || ''}
                  onChange={(e) => setEditingMoulding((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMouldingModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMoulding}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  {savingMoulding ? 'Saving...' : 'Save Moulding Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default FrameMaster;
