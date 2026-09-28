import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser, IBranch, Role, Permission } from '@trending-studio/shared-types';
import { api } from '../services/api';
import { offlineDb } from '../services/offlineDb';
import { dataService } from '../services/dataService';

import {
  loginWithFirestore,
  registerUserInFirestore,
  sendMobileOtp as fsSendMobileOtp,
  verifyMobileOtpAndLogin as fsVerifyMobileOtpAndLogin,
  loginWithGoogleAdmin as fsLoginWithGoogleAdmin,
  requestPasswordResetOtp as fsRequestPasswordResetOtp,
  resetUserPassword as fsResetUserPassword,
} from '../services/firebaseClient';

interface AuthContextType {
  user: IUser | null;
  branch: IBranch | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOfflineMode: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  loginWithMobileOtp: (phone: string, otp: string) => Promise<void>;
  sendMobileOtp: (phone: string) => Promise<{ success: boolean; otp: string; phone: string; userName?: string }>;
  loginWithGoogle: () => Promise<void>;
  requestPasswordResetOtp: (identifier: string) => Promise<{ success: boolean; otp: string; phone: string; userName: string }>;
  resetUserPassword: (identifier: string, otp: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  registerUser: (userData: { name: string; email: string; phone: string; password: string; role?: Role }) => Promise<IUser>;
  loginOffline: (role?: 'admin' | 'billing') => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
  hasPermission: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getDeviceInfo = () => {
  let deviceId = localStorage.getItem('ts_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    localStorage.setItem('ts_device_id', deviceId);
  }

  const ua = navigator.userAgent;
  let platform = 'WEB';
  let deviceName = 'Browser Terminal';
  let deviceModel = 'Desktop Counter PC';

  if (/Android/i.test(ua)) {
    platform = 'ANDROID';
    deviceName = 'Android Mobile Terminal';
    const match = ua.match(/Android\s([0-9.]+);?\s?([^;)]+)?/);
    deviceModel = match && match[2] ? match[2].trim() : 'Android Device';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    platform = 'WEB';
    deviceName = 'iOS Terminal';
    deviceModel = /iPad/i.test(ua) ? 'iPad Tablet' : 'iPhone';
  } else if (/Windows/i.test(ua)) {
    deviceName = 'Windows Counter PC';
    deviceModel = 'Counter Desktop';
  }

  return { deviceId, deviceName, deviceModel, platform };
};

export const registerCurrentDevice = async () => {
  try {
    const { deviceId, deviceName, deviceModel, platform } = getDeviceInfo();
    await dataService.registerDevice({
      deviceId,
      deviceName,
      deviceModel,
      platform,
      appVersion: '1.0.0',
    });
  } catch (err) {
    console.warn('[Device] Auto-registration skipped:', err);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [branch, setBranch] = useState<IBranch | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  useEffect(() => {
    const initializeAuth = async () => {
      // Security Policy: Every time the user opens the app (new browser tab / newly launched session),
      // prompt for authentication. An active session exists only if ts_session_authenticated is true.
      const isSessionActive = sessionStorage.getItem('ts_session_authenticated') === 'true';
      const token = localStorage.getItem('ts_access_token');
      const savedUser = localStorage.getItem('ts_user');
      const savedBranch = localStorage.getItem('ts_branch');

      if (token && isSessionActive) {
        if ((token.startsWith('ts_offline_') || token.startsWith('fs_token_')) && savedUser) {
          try {
            setUser(JSON.parse(savedUser));
            if (savedBranch) setBranch(JSON.parse(savedBranch));
            setIsOfflineMode(token.startsWith('ts_offline_'));
            setIsLoading(false);
            registerCurrentDevice();
            return;
          } catch {}
        }

        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data.user);
          setBranch(res.data.data.branch);
          localStorage.setItem('ts_user', JSON.stringify(res.data.data.user));
          if (res.data.data.branch) localStorage.setItem('ts_branch', JSON.stringify(res.data.data.branch));
          setIsOfflineMode(false);
          registerCurrentDevice();
        } catch (err) {
          if (savedUser) {
            try {
              setUser(JSON.parse(savedUser));
              if (savedBranch) setBranch(JSON.parse(savedBranch));
              setIsOfflineMode(false);
            } catch {}
          }
        }
      } else {
        // Fresh start: require authentication
        setUser(null);
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const loginOffline = async (role: 'admin' | 'billing' = 'admin') => {
    const isSuper = role === 'admin';
    const offlineUser: IUser = {
      _id: isSuper ? 'usr_offline_admin' : 'usr_offline_billing',
      name: isSuper ? 'Studio Admin (Offline Mode)' : 'Billing Staff (Offline Mode)',
      email: isSuper ? 'admin@trendingstudio.com' : 'billing@trendingstudio.com',
      phone: '+91 79040 64446',
      role: isSuper ? Role.SUPER_ADMIN : Role.BILLING_STAFF,
      permissions: Object.values(Permission),
      branchId: 'br_karaikudi_01',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const offlineBranch: IBranch = {
      _id: 'br_karaikudi_01',
      name: 'Trending Studio - Main Branch',
      code: 'TS-KKDI',
      address: 'No:1, Meyyappan Ambalam Complex, Karaikudi - 630001',
      phone: '+91 79040 64446',
      isMainBranch: true,
      isActive: true,
      invoiceSequenceCounter: 100,
    };

    sessionStorage.setItem('ts_session_authenticated', 'true');
    localStorage.setItem('ts_access_token', 'ts_offline_' + Date.now());
    localStorage.setItem('ts_user', JSON.stringify(offlineUser));
    localStorage.setItem('ts_branch', JSON.stringify(offlineBranch));
    setUser(offlineUser);
    setBranch(offlineBranch);
    setIsOfflineMode(true);
    await offlineDb.seedDemoDataIfEmpty();
  };

  const login = async (identifier: string, password: string) => {
    // 1. If user configured a custom API server, try it
    const customApiUrl = localStorage.getItem('ts_api_url');
    if (customApiUrl) {
      try {
        const res = await api.post('/auth/login', {
          identifier,
          password,
          platform: 'WEB',
        });

        const { user: loggedInUser, branch: userBranch, tokens } = res.data.data;
        sessionStorage.setItem('ts_session_authenticated', 'true');
        localStorage.setItem('ts_access_token', tokens.accessToken);
        localStorage.setItem('ts_refresh_token', tokens.refreshToken);
        localStorage.setItem('ts_user', JSON.stringify(loggedInUser));
        if (userBranch) localStorage.setItem('ts_branch', JSON.stringify(userBranch));
        setUser(loggedInUser);
        setBranch(userBranch);
        setIsOfflineMode(false);
        registerCurrentDevice();
        return;
      } catch (apiErr: any) {
        console.log('[Auth] Custom API server login failed, checking Cloud Firestore...');
      }
    }

    // 2. Direct Cloud Firestore authentication (Standard for Firebase Hosting & GitHub Pages)
    try {
      const { user: fsUser, branch: fsBranch, tokens } = await loginWithFirestore(identifier, password);
      sessionStorage.setItem('ts_session_authenticated', 'true');
      localStorage.setItem('ts_access_token', tokens.accessToken);
      localStorage.setItem('ts_refresh_token', tokens.refreshToken);
      localStorage.setItem('ts_user', JSON.stringify(fsUser));
      localStorage.setItem('ts_branch', JSON.stringify(fsBranch));
      setUser(fsUser);
      setBranch(fsBranch);
      setIsOfflineMode(false);
      return;
    } catch (fsErr: any) {
      // 3. Fallback to demo offline mode if demo credentials match
      const isAdmin = identifier === 'admin@trendingstudio.com' && password === 'adminpassword123';
      const isBilling = identifier === 'billing@trendingstudio.com' && password === 'billingpassword123';
      if (isAdmin) {
        await loginOffline('admin');
        return;
      } else if (isBilling) {
        await loginOffline('billing');
        return;
      }
      throw fsErr;
    }
  };

  const loginWithMobileOtp = async (phone: string, otp: string) => {
    const { user: fsUser, branch: fsBranch, tokens } = await fsVerifyMobileOtpAndLogin(phone, otp);
    sessionStorage.setItem('ts_session_authenticated', 'true');
    localStorage.setItem('ts_access_token', tokens.accessToken);
    localStorage.setItem('ts_refresh_token', tokens.refreshToken);
    localStorage.setItem('ts_user', JSON.stringify(fsUser));
    localStorage.setItem('ts_branch', JSON.stringify(fsBranch));
    setUser(fsUser);
    setBranch(fsBranch);
    setIsOfflineMode(false);
  };

  const sendMobileOtp = async (phone: string) => {
    return await fsSendMobileOtp(phone);
  };

  const loginWithGoogle = async () => {
    const { user: gUser, branch: gBranch, tokens } = await fsLoginWithGoogleAdmin();
    sessionStorage.setItem('ts_session_authenticated', 'true');
    localStorage.setItem('ts_access_token', tokens.accessToken);
    localStorage.setItem('ts_refresh_token', tokens.refreshToken);
    localStorage.setItem('ts_user', JSON.stringify(gUser));
    localStorage.setItem('ts_branch', JSON.stringify(gBranch));
    setUser(gUser);
    setBranch(gBranch);
    setIsOfflineMode(false);
  };

  const requestPasswordResetOtp = async (identifier: string) => {
    return await fsRequestPasswordResetOtp(identifier);
  };

  const resetUserPassword = async (identifier: string, otp: string, newPassword: string) => {
    return await fsResetUserPassword(identifier, otp, newPassword);
  };

  const registerUser = async (userData: { name: string; email: string; phone: string; password: string; role?: Role }): Promise<IUser> => {
    const customApiUrl = localStorage.getItem('ts_api_url');
    if (customApiUrl) {
      try {
        const res = await api.post('/auth/register', userData);
        return res.data.data.user;
      } catch (apiErr) {
        console.log('[Auth] API register failed. Storing directly in Cloud Firestore...');
      }
    }
    return await registerUserInFirestore(userData);
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('ts_refresh_token');
      await api.post('/auth/logout', { refreshToken });
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      sessionStorage.removeItem('ts_session_authenticated');
      localStorage.removeItem('ts_access_token');
      localStorage.removeItem('ts_refresh_token');
      setUser(null);
      setBranch(null);
    }
  };

  const hasRole = (...roles: Role[]): boolean => {
    if (!user) return false;
    if (user.role === Role.SUPER_ADMIN) return true;
    return roles.includes(user.role);
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    if (user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN) return true;
    return (user.permissions || []).includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        branch,
        isAuthenticated: !!user,
        isLoading,
        isOfflineMode,
        login,
        loginWithMobileOtp,
        sendMobileOtp,
        loginWithGoogle,
        requestPasswordResetOtp,
        resetUserPassword,
        registerUser,
        loginOffline,
        logout,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
