import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { triggerCelebration } from './CelebrationBackground';

interface IntroSplashScreenProps {
  onFinish?: () => void;
  forceShow?: boolean;
}

// Global dispatcher to allow replaying the full-screen splash animation anytime (e.g. from workstation header)
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timeoutRef = useRef<any>(null);

  const videoSrc = `${import.meta.env.BASE_URL || '/'}intro-animation.mp4`.replace('//', '/');

  const closeSplash = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    sessionStorage.setItem('ts_intro_splash_seen', 'true');

    // Celebration burst when splash ends
    try {
      triggerCelebration({ particleCount: 40, spread: 60 });
    } catch {}

    setTimeout(() => {
      setIsVisible(false);
      setIsFadingOut(false);
      if (onFinish) onFinish();
    }, 600);
  };

  useEffect(() => {
    if (isVisible && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [isVisible]);

  useEffect(() => {
    const handleReplayEvent = () => {
      setIsVisible(true);
      setIsFadingOut(false);
      setProgress(0);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    };

    window.addEventListener('ts-play-intro-splash', handleReplayEvent);
    return () => window.removeEventListener('ts-play-intro-splash', handleReplayEvent);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    // Safety timeout: auto-dismiss after 10s maximum so billing is never blocked
    timeoutRef.current = setTimeout(() => {
      closeSplash();
    }, 10000);

    // Pressing any key or Escape dismisses the splash
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        closeSplash();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible]);

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      onClick={closeSplash}
      className={`fixed inset-0 z-[999999] w-screen h-screen bg-[#070b14] flex items-center justify-center overflow-hidden cursor-pointer select-none transition-all duration-700 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      role="banner"
      aria-label="Trending Studio Intro Preloader"
    >
      {/* Full-Screen Edge-to-Edge Animation (Not as a video player) */}
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        muted
        playsInline
        onEnded={closeSplash}
        onTimeUpdate={handleTimeUpdate}
        onError={() => {
          console.warn('Intro animation completed or unavailable, entering studio.');
          closeSplash();
        }}
        className="w-full h-full object-contain bg-[#070b14] pointer-events-none"
      />

      {/* Floating Discreet Skip Button (Top-Right) */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            closeSplash();
          }}
          className="group flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-slate-950/70 hover:bg-slate-900/90 text-white/90 hover:text-white border border-white/20 hover:border-white/40 backdrop-blur-md text-xs font-semibold tracking-wide shadow-2xl transition-all duration-200 active:scale-95"
          title="Skip intro and enter POS (Esc)"
        >
          <span>Skip</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Floating Minimal Store Preloader Status (Bottom) */}
      <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 z-20 flex flex-col items-center justify-center space-y-2 pointer-events-none">
        <div className="flex items-center space-x-2 px-3.5 py-1 rounded-full bg-slate-950/75 border border-slate-700/60 backdrop-blur-md text-[11px] text-slate-300 shadow-xl">
          <Sparkles className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span className="font-semibold text-white tracking-wide">Trending Studio Gifts & Frames</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 font-mono text-[10px]">Loading POS...</span>
        </div>

        {/* Slim Rainbow Progress Ribbon at Bottom Edge */}
        <div className="fixed bottom-0 left-0 right-0 h-1 bg-slate-950/80">
          <div
            className="h-full bg-gradient-to-r from-orange-500 via-pink-500 to-cyan-400 transition-all duration-150 shadow-[0_0_12px_rgba(255,107,0,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
