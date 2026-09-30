import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  User as UserIcon,
  ShoppingCart,
  Store,
  Menu,
} from 'lucide-react';
import { offlineDb } from '../../services/offlineDb';
import { syncManager } from '../../services/syncManager';

interface HeaderProps {
  onOpenMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMenu }) => {
  const { user, branch, logout } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const updatePending = async () => {
    const count = await offlineDb.getPendingCount();
    setPendingCount(count);
  };

  useEffect(() => {
    updatePending();

    const handleOnline = () => {
      setIsOnline(true);
      syncManager.syncNow();
    };
    const handleOffline = () => setIsOnline(false);
    const handleQueueChange = () => updatePending();
    const handleSyncStatus = (e: any) => {
      setIsSyncing(e.detail?.isSyncing ?? false);
      updatePending();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-changed', handleQueueChange);
    window.addEventListener('sync-status-changed', handleSyncStatus);
    window.addEventListener('sync-complete', handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-changed', handleQueueChange);
      window.removeEventListener('sync-status-changed', handleSyncStatus);
      window.removeEventListener('sync-complete', handleQueueChange);
    };
  }, []);

  const handleManualSync = async () => {
    await syncManager.syncNow();
  };

  return (
    <header className="h-16 bg-[#090e1a]/95 border-b border-slate-800/80 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xl backdrop-blur-md select-none relative">
      {/* Top Rainbow Celebration Ribbon */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500 via-amber-400 via-pink-500 via-purple-500 to-cyan-400 shadow-[0_0_10px_rgba(255,107,0,0.5)]" />

      {/* Brand & Branch Context */}
      <div className="flex items-center space-x-2.5 sm:space-x-4">
        {onOpenMenu && (
          <button
            onClick={onOpenMenu}
            className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center space-x-3">
          <img
            src="/logo.png"
            alt="Trending Studio"
            className="h-10 sm:h-12 w-auto object-contain shrink-0 filter drop-shadow-[0_2px_10px_rgba(255,107,0,0.35)] hover:drop-shadow-[0_4px_16px_rgba(0,198,255,0.6)] hover:scale-105 transition-all cursor-pointer"
            onClick={() => navigate('/')}
            title="Trending Studio Karaikudi"
          />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-sm sm:text-base md:text-lg tracking-wide">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400">
                  TRENDING
                </span>{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500">
                  STUDIO
                </span>
              </span>
              <span className="hidden sm:inline-block text-[10px] px-2.5 py-0.5 rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/30 font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(236,72,153,0.25)]">
                GIFTS & FRAMES
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 flex items-center space-x-1">
              <Store className="w-3 h-3 text-amber-400 inline mr-1 shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-none text-slate-300 font-medium">
                {branch?.name || 'Karaikudi Main'}
              </span>
              <span className="hidden md:inline text-slate-500">• Near Periyar Statue</span>
            </p>
          </div>
        </div>
      </div>

      {/* Center/Right Actions */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Network & Sync Status Pill */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <div
            className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-all shadow-sm ${
              !isOnline
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-500/10'
                : isSyncing
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/10'
                : pendingCount > 0
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/10'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10'
            }`}
          >
            {!isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
                <WifiOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>OFFLINE{pendingCount > 0 ? ` (${pendingCount})` : ''}</span>
              </>
            ) : isSyncing ? (
              <>
                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin shrink-0 text-amber-400" />
                <span className="hidden xs:inline">SYNCING...</span>
              </>
            ) : pendingCount > 0 ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
                <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>{pendingCount} PENDING</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-emerald-400" />
                <span className="hidden sm:inline">ONLINE (SYNCED)</span>
                <span className="sm:hidden">ONLINE</span>
              </>
            )}
          </div>

          {/* Quick Manual Sync Button */}
          {isOnline && (pendingCount > 0 || isSyncing) && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="p-1 sm:p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Sync pending offline bills to Firebase"
            >
              <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Quick POS Bill Button in Vibrant Gradient */}
        <button
          onClick={() => navigate('/pos')}
          className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-orange-500 via-pink-500 to-cyan-500 hover:opacity-95 text-white px-4 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-lg shadow-pink-500/25 active:scale-95"
        >
          <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          <span>+ Quick POS</span>
        </button>

        {/* User Profile & Logout */}
        <div className="flex items-center space-x-2 sm:space-x-3 sm:border-l sm:border-slate-800 sm:pl-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs sm:text-sm font-bold text-slate-200 truncate max-w-[120px]">{user?.name}</p>
            <p className="text-[10px] text-cyan-400 font-semibold">{user?.role?.replace('_', ' ')}</p>
          </div>

          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600/30 to-purple-600/30 border border-slate-700 flex items-center justify-center text-cyan-300 shrink-0 font-bold text-xs">
            {user?.name ? user.name.slice(0, 1).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
export default Header;
