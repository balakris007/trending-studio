import React, { useMemo } from 'react';
import confetti from 'canvas-confetti';

/**
 * Fires dazzling celebratory confetti in the exact signature colors of Trending Studio
 * (Warm Amber, Electric Cyan, Vibrant Magenta, Emerald Green, Golden Yellow, Bright Orange)
 */
export function triggerCelebration(options?: confetti.Options) {
  const brandColors = ['#FF4500', '#FFB300', '#00C8FF', '#FF007F', '#25D366', '#9C27B0'];

  // Left cannon burst
  confetti({
    particleCount: 50,
    angle: 60,
    spread: 65,
    origin: { x: 0.1, y: 0.8 },
    colors: brandColors,
    ticks: 250,
    gravity: 0.9,
    scalar: 1.1,
    ...options,
  });

  // Right cannon burst
  confetti({
    particleCount: 50,
    angle: 120,
    spread: 65,
    origin: { x: 0.9, y: 0.8 },
    colors: brandColors,
    ticks: 250,
    gravity: 0.9,
    scalar: 1.1,
    ...options,
  });
}

/**
 * Full fireworks burst for successful invoice creation / billing checkout
 */
export function triggerBillSuccessConfetti() {
  const brandColors = ['#FF4500', '#FFD700', '#00E5FF', '#FF1493', '#00E676', '#7C4DFF'];

  // Center star burst
  confetti({
    particleCount: 80,
    spread: 100,
    origin: { y: 0.6 },
    colors: brandColors,
    shapes: ['star', 'circle'],
    scalar: 1.2,
  });

  // Delayed side showers
  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.7 },
      colors: brandColors,
    });
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.7 },
      colors: brandColors,
    });
  }, 250);
}

/**
 * Ambient celebratory background for the dark mode workspace
 * Renders glowing brand auroras, floating golden stars, and celebratory sparkles
 */
export const CelebrationBackground: React.FC = () => {
  // Generate random twinkling stars based on logo artwork
  const stars = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      left: `${(i * 4.3 + 7) % 94}%`,
      top: `${(i * 7.1 + 5) % 92}%`,
      size: (i % 3) * 6 + 10, // 10px, 16px, 22px
      color:
        i % 5 === 0
          ? '#FFD700' // Gold
          : i % 5 === 1
          ? '#00E5FF' // Cyan
          : i % 5 === 2
          ? '#FF007F' // Magenta
          : i % 5 === 3
          ? '#FF6D00' // Orange
          : '#25D366', // Emerald
      delay: `${(i * 0.4) % 4}s`,
      duration: `${4 + (i % 4)}s`,
      opacity: 0.35 + (i % 3) * 0.2,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none" aria-hidden="true">
      {/* 1. Brand Aurora Mesh Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute top-1/4 -right-32 w-[30rem] h-[30rem] rounded-full bg-gradient-to-bl from-cyan-500/12 via-blue-600/10 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '10s' }} />
      <div className="absolute -bottom-32 left-1/3 w-[32rem] h-[32rem] rounded-full bg-gradient-to-tr from-fuchsia-600/12 via-pink-500/10 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '9s' }} />
      <div className="absolute top-2/3 left-10 w-72 h-72 rounded-full bg-gradient-to-r from-emerald-500/8 via-teal-500/5 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '11s' }} />

      {/* 2. Floating Celebratory Stars matching logo */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute transform transition-transform"
          style={{
            left: star.left,
            top: star.top,
            animation: `float-star ${star.duration} ease-in-out infinite`,
            animationDelay: star.delay,
            opacity: star.opacity,
          }}
        >
          <svg
            width={star.size}
            height={star.size}
            viewBox="0 0 24 24"
            fill={star.color}
            className="filter drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]"
          >
            <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
          </svg>
        </div>
      ))}
    </div>
  );
};
