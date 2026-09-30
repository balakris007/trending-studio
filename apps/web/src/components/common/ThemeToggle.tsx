import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  compact = false,
  showLabel = true,
  className = '',
}) => {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`group relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-300 select-none active:scale-95 ${
        isDark
          ? 'bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-slate-700/80 hover:border-amber-400/40 shadow-sm'
          : 'bg-white hover:bg-slate-100 text-indigo-600 border border-slate-300 hover:border-indigo-400 shadow-sm'
      } ${className}`}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500 group-hover:rotate-45 transition-transform duration-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
        )}
      </div>

      {showLabel && !compact && (
        <span className="font-mono text-[10px] tracking-wide">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </button>
  );
};
