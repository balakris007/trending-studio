import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Lock, User, ArrowRight, ShieldCheck, WifiOff, Server, Check } from 'lucide-react';
import { getApiBaseUrl } from '../services/api';

export const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('admin@trendingstudio.com');
  const [password, setPassword] = useState('adminpassword123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(localStorage.getItem('ts_api_url') || '');
  const [savedUrlSuccess, setSavedUrlSuccess] = useState(false);

  const { login, loginOffline } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(identifier, password);
      navigate('/');
    } catch (err: any) {
      if (!err.response) {
        setError('Cannot reach API server. You can enter in Offline Mode or check the backend server.');
      } else if (err.response.status === 404) {
        setError('API server route not found (404). If using GitHub Pages, click "Enter in Offline / Demo Mode" below.');
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || 'Invalid credentials. Please verify and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOfflineEntry = async (role: 'admin' | 'billing' = 'admin') => {
    setLoading(true);
    try {
      await loginOffline(role);
      navigate('/');
    } catch (err) {
      setError('Failed to enter offline mode');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
  };

  const handleSaveApiUrl = () => {
    if (customApiUrl.trim()) {
      localStorage.setItem('ts_api_url', customApiUrl.trim());
    } else {
      localStorage.removeItem('ts_api_url');
    }
    setSavedUrlSuccess(true);
    setTimeout(() => setSavedUrlSuccess(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-blue-600 selection:text-white">
      {/* Decorative gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 backdrop-blur-xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-600/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            TRENDING <span className="text-blue-500">STUDIO</span>
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
            Gifts & Frames • Karaikudi
          </p>
          <p className="text-xs text-slate-500 mt-0.5">No:1, Meyyappan Ambalam Complex</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-center space-y-2">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => handleOfflineEntry('admin')}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold inline-flex items-center space-x-1"
            >
              <WifiOff className="w-3 h-3" />
              <span>Continue in Offline / Demo Mode</span>
            </button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email or Mobile Number
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                placeholder="admin@trendingstudio.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign In to POS</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Tap Offline / Demo POS Mode Option */}
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => handleOfflineEntry('admin')}
            disabled={loading}
            className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-800 border border-indigo-500/30 hover:border-indigo-500/60 rounded-xl text-xs font-bold text-indigo-300 flex items-center justify-center space-x-2 transition-all shadow-sm"
          >
            <WifiOff className="w-4 h-4 text-indigo-400" />
            <span>⚡ Enter in Offline / Demo POS Mode</span>
          </button>
          <p className="text-[10px] text-slate-500 text-center mt-1.5">
            Works 100% in browser with IndexedDB local cache — no live backend required!
          </p>
        </div>

        {/* Demo Fast Login Selector */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[11px] font-semibold text-slate-400 mb-2.5 flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Quick Fill Staff Roles</span>
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickFill('admin@trendingstudio.com', 'adminpassword123')}
              className="p-2 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-left transition-colors"
            >
              <p className="font-bold text-blue-400">Super Admin</p>
              <p className="text-[10px] text-slate-400">admin@trendingstudio.com</p>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('billing@trendingstudio.com', 'billingpassword123')}
              className="p-2 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-left transition-colors"
            >
              <p className="font-bold text-emerald-400">Billing Staff</p>
              <p className="text-[10px] text-slate-400">billing@trendingstudio.com</p>
            </button>
          </div>
        </div>

        {/* Backend API Configuration Toggle */}
        <div className="mt-5 pt-3 border-t border-slate-800/80 text-center">
          <button
            type="button"
            onClick={() => setShowServerSettings(!showServerSettings)}
            className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center justify-center space-x-1 mx-auto"
          >
            <Server className="w-3 h-3" />
            <span>Backend Server URL: <strong className="text-slate-400">{getApiBaseUrl()}</strong></span>
          </button>

          {showServerSettings && (
            <div className="mt-3 p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-left space-y-2">
              <label className="text-[11px] font-semibold text-slate-300 block">
                Custom API Server URL
              </label>
              <p className="text-[10px] text-slate-400">
                Connect this web app to a live cloud backend (e.g. Render, Railway) or local network.
              </p>
              <input
                type="text"
                value={customApiUrl}
                onChange={(e) => setCustomApiUrl(e.target.value)}
                placeholder="https://trending-studio-api.onrender.com/api/v1"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 font-mono"
              />
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleSaveApiUrl}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
                >
                  {savedUrlSuccess ? <Check className="w-3 h-3" /> : null}
                  <span>{savedUrlSuccess ? 'Saved!' : 'Save API URL'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomApiUrl('');
                    localStorage.removeItem('ts_api_url');
                    setSavedUrlSuccess(true);
                    setTimeout(() => setSavedUrlSuccess(false), 2000);
                  }}
                  className="text-[10px] text-slate-400 hover:underline"
                >
                  Reset Default
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
