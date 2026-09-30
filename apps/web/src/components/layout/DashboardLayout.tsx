import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { CelebrationBackground, triggerCelebration } from '../common/CelebrationBackground';
import { ThemeToggle } from '../common/ThemeToggle';
import { Sparkles, Clock, MessageCircle } from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col text-slate-100 relative overflow-x-hidden selection:bg-pink-500 selection:text-white">
      {/* 1. Celebratory Logo-Inspired Ambient Star & Aurora Background */}
      <CelebrationBackground />

      {/* 2. Top Window Frame Bar (Professional Work Window Chrome) */}
      <div className="relative z-40 bg-slate-950/90 border-b border-slate-800/80 px-3 sm:px-5 py-1 flex items-center justify-between text-[11px] backdrop-blur-md select-none">
        {/* Window Control Dots matching Studio Logo Palette */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 pr-2 border-r border-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] cursor-pointer hover:scale-110 transition-transform" title="Trending Studio Red" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] cursor-pointer hover:scale-110 transition-transform" title="Trending Studio Gold" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] cursor-pointer hover:scale-110 transition-transform" title="WhatsApp Emerald" />
          </div>
          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>Studio Workstation v1.0</span>
            <span className="text-slate-600">•</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-400 to-cyan-400 font-bold">
              Trending Studio Gifts & Frames
            </span>
          </span>
        </div>

        {/* Live IST Clock & Celebratory Sparks Button */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* WhatsApp Support Direct Link */}
          <a
            href="https://wa.me/917904064446?text=Hello%20Trending%20Studio"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold transition-all shadow-sm group"
            title="Official WhatsApp Support: 79040-64446"
          >
            <MessageCircle className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>79040-64446</span>
          </a>

          {/* Interactive Celebration Trigger */}
          <button
            type="button"
            onClick={() => triggerCelebration()}
            className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500/20 via-pink-500/20 to-cyan-500/20 hover:from-orange-500/30 hover:to-cyan-500/30 border border-pink-500/30 text-pink-300 text-[10px] font-bold transition-all shadow-sm active:scale-95 group"
            title="Click to celebrate / test animations!"
          >
            <Sparkles className="w-3 h-3 text-amber-300 group-hover:rotate-45 transition-transform" />
            <span className="hidden xs:inline">Celebrate 🎉</span>
          </button>

          {/* Theme Mode Toggle (Dark / Light) */}
          <ThemeToggle />

          {/* Clock */}
          <div className="flex items-center space-x-1 text-slate-400 font-mono text-[10px] bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800">
            <Clock className="w-2.5 h-2.5 text-cyan-400" />
            <span>{currentTime || 'IST'}</span>
          </div>
        </div>
      </div>

      {/* 3. Main Studio Navigation Header */}
      <Header onOpenMenu={() => setIsDrawerOpen(true)} />

      {/* 4. Studio Work Window Body */}
      <div className="flex flex-1 relative z-10">
        <Sidebar />
        <main className="flex-1 p-2 sm:p-4 lg:p-6 overflow-y-auto max-h-[calc(100vh-5.5rem)] pb-24 lg:pb-6 relative">
          <Outlet />
        </main>
      </div>

      {/* 5. Mobile Navigation */}
      <MobileNav isDrawerOpen={isDrawerOpen} setIsDrawerOpen={setIsDrawerOpen} />
    </div>
  );
};
export default DashboardLayout;
