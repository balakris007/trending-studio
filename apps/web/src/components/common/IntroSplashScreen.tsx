import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { triggerCelebration } from './CelebrationBackground';

interface IntroSplashScreenProps {
  onFinish?: () => void;
  forceShow?: boolean;
}

// Global dispatcher to allow replaying the starting logo splash screen anytime (e.g. from workstation header)
export function playIntroSplash() {
  window.dispatchEvent(new CustomEvent('ts-play-intro-splash'));
}

export const IntroSplashScreen: React.FC<IntroSplashScreenProps> = ({
  onFinish,
  forceShow = false,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (forceShow) return true;
    const hasSeen = sessionStorage.getItem('ts_intro_splash_seen');
    return !hasSeen;
  });

  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const DURATION_MS = 1900; // Native app splash duration: ~1.9 seconds

  const closeSplash = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    sessionStorage.setItem('ts_intro_splash_seen', 'true');

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    // Gentle celebration burst when entering the app
    try {
      triggerCelebration({ particleCount: 35, spread: 55 });
    } catch {}

    setTimeout(() => {
      setIsVisible(false);
      setIsFadingOut(false);
      if (onFinish) onFinish();
    }, 500);
  };

  // Start progress animation when visible
  useEffect(() => {
    if (!isVisible) return;

    setIsFadingOut(false);
    setProgress(0);
    startTimeRef.current = null;

    const animateProgress = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const rawPct = Math.min((elapsed / DURATION_MS) * 100, 100);
      setProgress(rawPct);

      if (elapsed < DURATION_MS) {
        animFrameRef.current = requestAnimationFrame(animateProgress);
      } else {
        closeSplash();
      }
    };

    animFrameRef.current = requestAnimationFrame(animateProgress);

    // Pressing any key or Escape dismisses the splash immediately
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        closeSplash();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible]);

  // Listener to allow replay anytime on user click
  useEffect(() => {
    const handleReplayEvent = () => {
      setIsVisible(true);
      setIsFadingOut(false);
      setProgress(0);
    };

    window.addEventListener('ts-play-intro-splash', handleReplayEvent);
    return () => window.removeEventListener('ts-play-intro-splash', handleReplayEvent);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      onClick={closeSplash}
      className={`fixed inset-0 z-[999999] w-screen h-screen bg-[#070b14] flex flex-col items-center justify-center overflow-hidden cursor-pointer select-none transition-all duration-500 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      role="banner"
      aria-label="Trending Studio Starting Screen"
    >
      {/* Ambient Aurora Orbs matching Brand Colors */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-orange-500/15 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />

      {/* Floating Skip Button (Top-Right) */}
      <div className="absolute top-5 right-5 sm:top-7 sm:right-7 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            closeSplash();
          }}
          className="group flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 backdrop-blur-md text-xs font-semibold tracking-wide shadow-xl transition-all duration-200 active:scale-95"
          title="Skip to POS (Esc)"
        >
          <span>Skip</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Center Stage: Starting Logo Card */}
      <div className="relative flex flex-col items-center z-10 px-4 max-w-md w-full">
        {/* Ambient Backlight Glow behind Logo */}
        <div className="absolute -inset-8 bg-gradient-to-r from-orange-500/25 via-pink-500/20 to-cyan-500/25 rounded-3xl blur-2xl pointer-events-none animate-pulse" />

        {/* Studio Official Logo */}
        <div className="relative group p-2">
          <img
            src="/logo.png"
            alt="Trending Studio Gifts & Frames"
            className="w-64 sm:w-80 md:w-92 max-w-[85vw] h-auto object-contain filter drop-shadow-[0_12px_30px_rgba(255,107,0,0.35)] drop-shadow-[0_4px_20px_rgba(0,198,255,0.35)] animate-in zoom-in-95 duration-500 ease-out select-none"
          />
        </div>

        {/* Brand Identity & Subtitles */}
        <div className="mt-5 text-center space-y-1.5">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-xl sm:text-2xl font-black tracking-wider text-studio-gradient">
              TRENDING STUDIO
            </span>
          </div>

          <div className="inline-flex items-center space-x-2 text-[11px] font-bold tracking-widest text-slate-400 uppercase">
            <span className="text-orange-400">Gifts</span>
            <span className="text-slate-600">•</span>
            <span className="text-pink-400">Frames</span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-400">Photo Printing</span>
          </div>
        </div>

        {/* Native App Loading Progress Bar */}
        <div className="mt-7 w-48 sm:w-56 flex flex-col items-center space-y-2.5">
          <div className="w-full h-1.5 bg-slate-900/90 rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-orange-500 via-pink-500 to-cyan-400 rounded-full transition-all duration-75 shadow-[0_0_12px_rgba(255,107,0,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Status Text */}
          <div className="flex items-center space-x-1.5 text-[11px] font-mono text-slate-400">
            <Sparkles className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="text-slate-300 font-semibold tracking-wide">
              {progress < 40 ? 'Starting POS...' : progress < 85 ? 'Loading Workstation...' : 'Welcome!'}
            </span>
          </div>
        </div>
      </div>

      {/* Subtle Bottom Footer */}
      <div className="absolute bottom-5 sm:bottom-6 left-0 right-0 z-10 flex flex-col items-center justify-center space-y-1 text-[11px] text-slate-500 pointer-events-none">
        <span className="font-mono text-[10px] tracking-wider text-slate-400">
          Karaikudi Store • Cloud Connected
        </span>
      </div>
    </div>
  );
};
