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
  KeyRound,
  RotateCcw,
  Smartphone,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { getApiBaseUrl } from '../services/api';
import { Role } from '@trending-studio/shared-types';

export const Login: React.FC = () => {
  // Navigation Tabs: 'MOBILE_OTP' | 'EMAIL_PASS' | 'REGISTER' | 'RESET_PASS'
  const [activeTab, setActiveTab] = useState<'MOBILE_OTP' | 'EMAIL_PASS' | 'REGISTER' | 'RESET_PASS'>('MOBILE_OTP');

  // --- Mobile OTP State ---
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // --- Email/Password State ---
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // --- Staff Registration State ---
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<Role>(Role.BILLING_STAFF);
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // --- Password Reset State ---
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetConfirmPass, setResetConfirmPass] = useState('');
  const [resetOtpSent, setResetOtpSent] = useState(false);

  // Feedback State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Server Settings
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(localStorage.getItem('ts_api_url') || '');
  const [savedUrlSuccess, setSavedUrlSuccess] = useState(false);

  const {
    login,
    loginWithMobileOtp,
    sendMobileOtp,
    loginWithGoogle,
    requestPasswordResetOtp,
    resetUserPassword,
    registerUser,
    loginOffline,
  } = useAuth();
  const navigate = useNavigate();

  // 1. Send OTP to Mobile
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const clean = mobileNumber.replace(/[^0-9]/g, '').slice(-10);
    if (clean.length < 10) {
      setErrorMsg('Please enter your 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      await sendMobileOtp(clean);
      setOtpSent(true);
      setSuccessMsg(`OTP verification code sent via SMS to +91 ${clean}. Please check your phone SMS to enter the code.`);
      setOtpCountdown(60);

      // WebOTP API: If on mobile phone with the SIM card, automatically capture the SMS code
      if (typeof window !== 'undefined' && 'OTPCredential' in window && (navigator as any).credentials) {
        try {
          const ac = new AbortController();
          (navigator.credentials as any).get({
            otp: { transport: ['sms'] },
            signal: ac.signal,
          }).then((content: any) => {
            if (content && content.code) {
              setOtpCode(content.code);
            }
          }).catch(() => {});
        } catch {}
      }

      const timer = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send OTP to this mobile number.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify OTP & Log In
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setErrorMsg('Please enter the complete 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      await loginWithMobileOtp(mobileNumber, otpCode.trim());
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Email & Password Log In
  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      await login(identifier, password);
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Invalid credentials. Please verify and try again.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Google Account / Gmail Sign In
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Sign-in failed. Please try Email or Mobile OTP.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Staff Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const createdUser = await registerUser({
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        phone: regPhone.trim(),
        password: regPassword,
        role: regRole,
      });

      setSuccessMsg(`Staff account "${createdUser.name}" created successfully in Cloud Firestore!`);
      setIdentifier(createdUser.email);
      setPassword(regPassword);
      setMobileNumber(createdUser.phone);

      setTimeout(() => {
        setActiveTab('EMAIL_PASS');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register staff account.');
    } finally {
      setLoading(false);
    }
  };

  // 6. Request Password Reset OTP
  const handleRequestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!resetIdentifier.trim()) {
      setErrorMsg('Please enter your registered Email or Mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordResetOtp(resetIdentifier);
      setResetOtpSent(true);
      setSuccessMsg(`Verification code sent via SMS to registered mobile number +91 ${res.phone}. Please check your phone.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate reset OTP.');
    } finally {
      setLoading(false);
    }
  };

  // 7. Complete Password Reset
  const handleCompletePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (resetNewPass.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }
    if (resetNewPass !== resetConfirmPass) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetUserPassword(resetIdentifier, resetOtp, resetNewPass);
      setSuccessMsg(res.message);
      setPassword(resetNewPass);
      setTimeout(() => {
        setActiveTab('EMAIL_PASS');
        setResetOtpSent(false);
        setResetIdentifier('');
        setResetOtp('');
        setResetNewPass('');
        setResetConfirmPass('');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Password reset failed.');
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
      setErrorMsg('Failed to enter offline mode');
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-3 sm:p-4 selection:bg-blue-600 selection:text-white">
      {/* Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative z-10 backdrop-blur-xl">
        {/* Brand Header with Uploaded Official Logo */}
        <div className="text-center mb-5">
          <div className="flex justify-center mb-2">
            <img
              src="/logo.png"
              alt="Trending Studio Gifts & Frames"
              className="w-56 sm:w-64 h-auto object-contain drop-shadow-xl hover:scale-105 transition-transform"
            />
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Cloud Firestore Connected • Karaikudi Store</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            🔒 Authentication required on every app launch
          </p>
        </div>

        {/* Global Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-center space-y-1.5">
            <div className="flex items-center justify-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => handleOfflineEntry('admin')}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold inline-flex items-center space-x-1"
            >
              <WifiOff className="w-3 h-3" />
              <span>Offline / Demo Access</span>
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium text-center flex items-center justify-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('MOBILE_OTP');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl text-[11px] font-bold transition-all flex flex-col sm:flex-row items-center justify-center space-y-0.5 sm:space-y-0 sm:space-x-1 ${
              activeTab === 'MOBILE_OTP'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile OTP</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('EMAIL_PASS');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl text-[11px] font-bold transition-all flex flex-col sm:flex-row items-center justify-center space-y-0.5 sm:space-y-0 sm:space-x-1 ${
              activeTab === 'EMAIL_PASS'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('REGISTER');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl text-[11px] font-bold transition-all flex flex-col sm:flex-row items-center justify-center space-y-0.5 sm:space-y-0 sm:space-x-1 ${
              activeTab === 'REGISTER'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('RESET_PASS');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl text-[11px] font-bold transition-all flex flex-col sm:flex-row items-center justify-center space-y-0.5 sm:space-y-0 sm:space-x-1 ${
              activeTab === 'RESET_PASS'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* ================= TAB 1: MOBILE OTP SIGN IN ================= */}
        {activeTab === 'MOBILE_OTP' && (
          <div className="space-y-4">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Registered Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold">+91</span>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      required
                      placeholder="Enter 10-digit mobile number"
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Enter the phone number registered to your staff or admin account.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{loading ? 'Sending OTP...' : 'Send Login OTP via SMS'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Enter 6-Digit OTP Code
                    </label>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-[10px] text-blue-400 hover:underline"
                    >
                      Change Number
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                    autoFocus
                    placeholder="••••••"
                    className="w-full text-center tracking-[0.5em] py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-lg font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                    <span>Sent to +91 {mobileNumber}</span>
                    {otpCountdown > 0 ? (
                      <span className="flex items-center space-x-1 text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>Resend in {otpCountdown}s</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        className="text-blue-400 hover:underline"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-semibold text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{loading ? 'Verifying OTP...' : 'Verify OTP & Enter POS'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ================= TAB 2: EMAIL & PASSWORD / GMAIL ================= */}
        {activeTab === 'EMAIL_PASS' && (
          <div className="space-y-4">
            {/* Google / Gmail Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-semibold text-xs transition-all shadow-md flex items-center justify-center space-x-2 border border-slate-200 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google / Gmail Admin</span>
            </button>

            <div className="flex items-center my-3">
              <div className="flex-1 border-t border-slate-800"></div>
              <span className="px-3 text-[10px] text-slate-500 uppercase tracking-wider">or sign in with password</span>
              <div className="flex-1 border-t border-slate-800"></div>
            </div>

            <form onSubmit={handleEmailPasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email or Mobile Number
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    placeholder="admin@trendingstudio.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetIdentifier(identifier);
                      setActiveTab('RESET_PASS');
                    }}
                    className="text-[10px] text-blue-400 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to POS'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Quick Fill */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('admin@trendingstudio.com');
                    setPassword('adminpassword123');
                  }}
                  className="p-1.5 rounded-lg bg-slate-800/80 text-left border border-slate-700"
                >
                  <span className="font-bold text-blue-400 block">Super Admin</span>
                  <span className="text-slate-400">admin@trendingstudio.com</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('billing@trendingstudio.com');
                    setPassword('billingpassword123');
                  }}
                  className="p-1.5 rounded-lg bg-slate-800/80 text-left border border-slate-700"
                >
                  <span className="font-bold text-emerald-400 block">Billing Staff</span>
                  <span className="text-slate-400">billing@trendingstudio.com</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: REGISTER STAFF USER ================= */}
        {activeTab === 'REGISTER' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">
                Staff Full Name
              </label>
              <div className="relative">
                <User className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                  placeholder="e.g. Suresh Kumar"
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">
                Email Address (Gmail)
              </label>
              <div className="relative">
                <Mail className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  placeholder="suresh@gmail.com"
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    required
                    placeholder="10-digit mobile number"
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">
                  Role
                </label>
                <div className="relative">
                  <Shield className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as Role)}
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 appearance-none"
                  >
                    <option value={Role.BILLING_STAFF}>Billing Staff</option>
                    <option value={Role.ADMIN}>Store Admin</option>
                    <option value={Role.DESIGNER}>Designer</option>
                    <option value={Role.PRODUCTION_STAFF}>Lab Technician</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    placeholder="Min 6 chars"
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">
                  Confirm
                </label>
                <div className="relative">
                  <Lock className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat"
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{loading ? 'Registering...' : 'Register & Save to Firestore'}</span>
            </button>
          </form>
        )}

        {/* ================= TAB 4: RESET PASSWORD VIA OTP ================= */}
        {activeTab === 'RESET_PASS' && (
          <div className="space-y-3">
            {!resetOtpSent ? (
              <form onSubmit={handleRequestResetOtp} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Registered Mobile Number or Email
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      required
                      placeholder="e.g. mobile number or email address"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    We will send a 6-digit verification code to the registered mobile number.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md shadow-amber-600/30 flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{loading ? 'Sending Verification Code...' : 'Send Verification OTP'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleCompletePasswordReset} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">
                    Enter 6-Digit Reset OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                    autoFocus
                    placeholder="••••••"
                    className="w-full text-center tracking-[0.4em] py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-base font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      value={resetNewPass}
                      onChange={(e) => setResetNewPass(e.target.value)}
                      required
                      placeholder="Min 6 characters"
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      value={resetConfirmPass}
                      onChange={(e) => setResetConfirmPass(e.target.value)}
                      required
                      placeholder="Repeat new password"
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{loading ? 'Updating Password...' : 'Save New Password & Log In'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Offline Mode & Server Options */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
          <button
            type="button"
            onClick={() => handleOfflineEntry('admin')}
            disabled={loading}
            className="w-full py-2 bg-slate-800/80 hover:bg-slate-800 border border-indigo-500/30 hover:border-indigo-500/60 rounded-xl text-xs font-bold text-indigo-300 flex items-center justify-center space-x-1.5 transition-all shadow-sm"
          >
            <WifiOff className="w-3.5 h-3.5 text-indigo-400" />
            <span>⚡ Enter in Offline / Demo POS Mode</span>
          </button>

          <div className="pt-2">
            <p className="text-[11px] text-slate-500 text-center">
              Trending Studio Billing & Studio Management System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
