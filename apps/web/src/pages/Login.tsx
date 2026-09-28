import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  WifiOff,
  Server,
  Check,
  UserPlus,
  Phone,
  Mail,
  Shield,
  Cloud,
} from 'lucide-react';
import { getApiBaseUrl } from '../services/api';
import { Role } from '@trending-studio/shared-types';

export const Login: React.FC = () => {
  // Mode: 'LOGIN' or 'REGISTER'
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login Form State
  const [identifier, setIdentifier] = useState('admin@trendingstudio.com');
  const [password, setPassword] = useState('adminpassword123');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<Role>(Role.BILLING_STAFF);
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  // Server Settings State
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(localStorage.getItem('ts_api_url') || '');
  const [savedUrlSuccess, setSavedUrlSuccess] = useState(false);

  const { login, registerUser, loginOffline } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);

    try {
      await login(identifier, password);
      navigate('/');
    } catch (err: any) {
      if (err.message && !err.response) {
        setLoginError(err.message);
      } else if (err.response?.status === 404) {
        setLoginError('API server not found. Logging in directly via Cloud Firestore...');
      } else {
        setLoginError(err.response?.data?.error || err.response?.data?.message || err.message || 'Invalid credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    if (!regName.trim()) {
      setRegError('Please enter full staff name');
      return;
    }
    if (!regEmail.trim()) {
      setRegError('Please enter a valid email address');
      return;
    }
    if (!regPhone.trim()) {
      setRegError('Please enter a valid contact phone number');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match');
      return;
    }

    setRegLoading(true);

    try {
      const createdUser = await registerUser({
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        phone: regPhone.trim(),
        password: regPassword,
        role: regRole,
      });

      setRegSuccess(`Staff user "${createdUser.name}" created successfully in Cloud Firestore!`);
      // Pre-fill login credentials
      setIdentifier(createdUser.email);
      setPassword(regPassword);

      // Reset registration form
      setRegName('');
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setRegConfirmPassword('');

      // Auto switch to login tab after 1.5s
      setTimeout(() => {
        setActiveTab('LOGIN');
      }, 1500);
    } catch (err: any) {
      setRegError(err.response?.data?.error || err.message || 'Failed to register user in Cloud Firestore');
    } finally {
      setRegLoading(false);
    }
  };

  const handleOfflineEntry = async (role: 'admin' | 'billing' = 'admin') => {
    setLoading(true);
    try {
      await loginOffline(role);
      navigate('/');
    } catch (err) {
      setLoginError('Failed to enter offline mode');
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
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-pink-500 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-blue-600/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            TRENDING <span className="text-blue-500">STUDIO</span>
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5 uppercase tracking-wider">
            Gifts & Frames • Karaikudi
          </p>
          <div className="mt-2 inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Cloud Firestore: trending-studio</span>
          </div>
        </div>

        {/* Tab Switcher: Sign In vs Register */}
        <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('LOGIN');
              setLoginError(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'LOGIN'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('REGISTER');
              setRegError(null);
              setRegSuccess(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'REGISTER'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Staff</span>
          </button>
        </div>

        {/* ---------------- LOGIN TAB ---------------- */}
        {activeTab === 'LOGIN' && (
          <>
            {regSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium text-center">
                {regSuccess}
              </div>
            )}

            {loginError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-center space-y-2">
                <p>{loginError}</p>
                <button
                  type="button"
                  onClick={() => handleOfflineEntry('admin')}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold inline-flex items-center space-x-1"
                >
                  <WifiOff className="w-3 h-3" />
                  <span>Continue in Offline Mode</span>
                </button>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
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
                  <span>Authenticating with Firestore...</span>
                ) : (
                  <>
                    <span>Sign In to POS</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Fast Login Selector */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
              <p className="text-[11px] font-semibold text-slate-400 mb-2.5 flex items-center justify-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Quick Fill Seeded Accounts</span>
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@trendingstudio.com', 'adminpassword123')}
                  className="p-2 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-left transition-colors"
                >
                  <p className="font-bold text-blue-400">Super Admin</p>
                  <p className="text-[10px] text-slate-400 truncate">admin@trendingstudio.com</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('billing@trendingstudio.com', 'billingpassword123')}
                  className="p-2 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-left transition-colors"
                >
                  <p className="font-bold text-emerald-400">Billing Staff</p>
                  <p className="text-[10px] text-slate-400 truncate">billing@trendingstudio.com</p>
                </button>
              </div>
            </div>

            {/* Offline Mode Button */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => handleOfflineEntry('admin')}
                disabled={loading}
                className="w-full py-2 bg-slate-800/80 hover:bg-slate-800 border border-indigo-500/30 hover:border-indigo-500/60 rounded-xl text-xs font-bold text-indigo-300 flex items-center justify-center space-x-2 transition-all shadow-sm"
              >
                <WifiOff className="w-3.5 h-3.5 text-indigo-400" />
                <span>⚡ Enter in Offline / Demo POS Mode</span>
              </button>
            </div>
          </>
        )}

        {/* ---------------- REGISTER TAB ---------------- */}
        {activeTab === 'REGISTER' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            {regError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-center">
                {regError}
              </div>
            )}
            {regSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium text-center">
                {regSuccess}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                  placeholder="e.g. Suresh Kumar"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  placeholder="suresh@trendingstudio.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    required
                    placeholder="7904064446"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Staff Role
                </label>
                <div className="relative">
                  <Shield className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as Role)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 appearance-none"
                  >
                    <option value={Role.BILLING_STAFF}>Billing Staff</option>
                    <option value={Role.ADMIN}>Store Admin</option>
                    <option value={Role.DESIGNER}>Designer</option>
                    <option value={Role.PRODUCTION_STAFF}>Lab Technician / Production</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    placeholder="Min 6 chars"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat password"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={regLoading}
              className="w-full mt-3 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-semibold text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              {regLoading ? (
                <span>Registering in Firestore...</span>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register & Save to Cloud Firestore</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Server & Network Settings Drawer */}
        <div className="mt-5 pt-3 border-t border-slate-800/80 text-center">
          <button
            type="button"
            onClick={() => setShowServerSettings(!showServerSettings)}
            className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center justify-center space-x-1 mx-auto"
          >
            <Server className="w-3 h-3" />
            <span>Connection Mode: <strong className="text-slate-400">Direct Firestore + Local Cache</strong></span>
          </button>

          {showServerSettings && (
            <div className="mt-3 p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-left space-y-2">
              <label className="text-[11px] font-semibold text-slate-300 block">
                Custom API Gateway (Optional)
              </label>
              <p className="text-[10px] text-slate-400">
                Direct Cloud Firestore is enabled by default. If you run a local express server or tunnel, specify it here.
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
                  <span>{savedUrlSuccess ? 'Saved!' : 'Save URL'}</span>
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
