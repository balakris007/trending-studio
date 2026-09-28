import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
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
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-md select-none">
      {/* Brand & Branch Context */}
      <div className="flex items-center space-x-2.5 sm:space-x-4">
        {onOpenMenu && (
          <button
            onClick={onOpenMenu}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center space-x-2.5">
          <img
            src="/logo.png"
            alt="Trending Studio"
            className="h-10 sm:h-11 w-auto object-contain shrink-0 drop-shadow-md hover:scale-105 transition-transform cursor-pointer"
            onClick={() => navigate('/')}
          />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm sm:text-base md:text-lg tracking-wide text-white">
                TRENDING <span className="text-blue-400">STUDIO</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                GIFTS & FRAMES
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 flex items-center space-x-1">
              <Store className="w-3 h-3 text-slate-400 inline mr-1 shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-none">{branch?.name || 'Karaikudi Main'}</span>
              <span className="hidden md:inline">• Near Periyar Statue</span>
            </p>
          </div>
        </div>
      </div>

      {/* Center/Right Actions */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Network & Sync Status Pill */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <div
            className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-all ${
              !isOnline
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : isSyncing
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : pendingCount > 0
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
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
                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin shrink-0" />
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
                <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
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
              className="p-1 sm:p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Sync pending offline bills to Firebase"
            >
              <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Quick POS Bill Button (Hidden on Mobile, bottom nav has POS) */}
        <button
          onClick={() => navigate('/pos')}
          className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3.5 py-1.5 rounded-lg font-medium text-xs sm:text-sm transition-all shadow-md shadow-blue-600/20 hover:scale-[1.02]"
        >
          <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Quick POS</span>
        </button>

        {/* User Profile & Logout */}
        <div className="flex items-center space-x-2 sm:space-x-3 sm:border-l sm:border-slate-800 sm:pl-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate max-w-[120px]">{user?.name}</p>
            <p className="text-[10px] text-blue-400 font-medium">{user?.role?.replace('_', ' ')}</p>
          </div>

          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
            <UserIcon className="w-3.5 h-3.5" />
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
