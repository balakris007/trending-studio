import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, FastForward, Sparkles, Play } from 'lucide-react';
import { triggerCelebration } from './CelebrationBackground';

interface IntroSplashScreenProps {
  onFinish?: () => void;
  forceShow?: boolean;
}

// Global dispatcher to allow triggering the intro video from anywhere (e.g., top workstation bar)
export function playIntroSplash() {
  window.dispatchEvent(new CustomEvent('ts-play-intro-splash'));
}

export const IntroSplashScreen: React.FC<IntroSplashScreenProps> = ({
  onFinish,
  forceShow = false,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (forceShow) return true;
    // Show on initial page load / first launch in this tab session
    const hasSeen = sessionStorage.getItem('ts_intro_splash_seen');
    return !hasSeen;
  });

  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timeoutRef = useRef<any>(null);

  const videoSrc = `${import.meta.env.BASE_URL || '/'}intro-animation.mp4`.replace('//', '/');

  const closeSplash = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    sessionStorage.setItem('ts_intro_splash_seen', 'true');

    // Trigger subtle confetti burst upon completing intro
    try {
      triggerCelebration({ particleCount: 35, spread: 55 });
    } catch {}

    setTimeout(() => {
      setIsVisible(false);
      setIsFadingOut(false);
      if (onFinish) onFinish();
    }, 600);
  };

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

    // Safety timeout: dismiss after 12s maximum so user is never blocked
    timeoutRef.current = setTimeout(() => {
      closeSplash();
    }, 12000);

    // Escape key listener to skip intro
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
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

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleTogglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPaused(false);
    } else {
      videoRef.current.pause();
      setIsPaused(true);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-3 sm:p-6 bg-[#070b14]/95 backdrop-blur-2xl transition-all duration-600 select-none ${
        isFadingOut ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      role="dialog"
      aria-label="Trending Studio Intro"
    >
      {/* Ambient Aurora Orbs matching Brand Colors */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-orange-500/20 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-pink-500/15 blur-3xl pointer-events-none" />

      {/* Main Cinematic Workstation Player Frame */}
      <div className="relative w-full max-w-3xl bg-slate-900/90 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden studio-window-frame ring-1 ring-white/10 flex flex-col">
        {/* Workstation Chrome Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm" />
            <span className="text-[10px] font-mono font-bold text-slate-400 ml-2 hidden sm:inline">
              TRENDING STUDIO • WORKSTATION INTRO
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={handleToggleMute}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center space-x-1.5 transition-all border border-slate-700 shadow-sm"
              title={isMuted ? 'Turn Sound On' : 'Mute Sound'}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3 h-3 text-slate-400" />
                  <span className="hidden xs:inline">Sound Off</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span className="text-emerald-300 hidden xs:inline">Sound On</span>
                </>
              )}
            </button>

            {/* Skip Intro Button */}
            <button
              type="button"
              onClick={closeSplash}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-orange-500 via-pink-500 to-cyan-500 hover:opacity-90 text-white text-[11px] font-bold flex items-center space-x-1 transition-all shadow-md active:scale-95"
              title="Skip intro and enter POS (Esc)"
            >
              <span>Skip Intro</span>
              <FastForward className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Video Display Container */}
        <div
          onClick={handleTogglePlayPause}
          className="relative aspect-video bg-black flex items-center justify-center cursor-pointer group overflow-hidden"
        >
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            muted={isMuted}
            playsInline
            onEnded={closeSplash}
            onTimeUpdate={handleTimeUpdate}
            onError={() => {
              console.warn('Intro animation video not playable or missing, proceeding to workstation.');
              closeSplash();
            }}
            className="w-full h-full object-contain bg-black"
          />

          {/* Pause Overlay indicator */}
          {isPaused && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-xs">
              <div className="w-14 h-14 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-white shadow-xl">
                <Play className="w-6 h-6 fill-white ml-1" />
              </div>
            </div>
          )}

          {/* Bottom Video Progress Ribbon */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-950/80">
            <div
              className="h-full bg-gradient-to-r from-orange-500 via-pink-500 to-cyan-400 transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Workstation Footer Subtitle */}
        <div className="px-4 py-2.5 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="font-semibold text-slate-200">Trending Studio Gifts & Frames</span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-500 text-[10px] hidden sm:inline">Karaikudi Store POS</span>
          </div>

          <span className="text-[10px] text-slate-500 font-mono">
            Press <strong className="text-slate-300 font-bold">Esc</strong> to Skip
          </span>
        </div>
      </div>
    </div>
  );
};
