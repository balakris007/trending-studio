import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser, IBranch, Role, Permission } from '@trending-studio/shared-types';
import { api } from '../services/api';
import { offlineDb } from '../services/offlineDb';

interface AuthContextType {
  user: IUser | null;
  branch: IBranch | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOfflineMode: boolean;
  login: (identifier: string, password: string) => Promise<void>;
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
    await api.post('/devices/register', {
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
      const token = localStorage.getItem('ts_access_token');
      const savedUser = localStorage.getItem('ts_user');
      const savedBranch = localStorage.getItem('ts_branch');

      if (token) {
        if (token.startsWith('ts_offline_') && savedUser) {
          try {
            setUser(JSON.parse(savedUser));
            if (savedBranch) setBranch(JSON.parse(savedBranch));
            setIsOfflineMode(true);
            setIsLoading(false);
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
              setIsOfflineMode(true);
            } catch {}
          } else {
            localStorage.removeItem('ts_access_token');
            localStorage.removeItem('ts_refresh_token');
          }
        }
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

    localStorage.setItem('ts_access_token', 'ts_offline_' + Date.now());
    localStorage.setItem('ts_user', JSON.stringify(offlineUser));
    localStorage.setItem('ts_branch', JSON.stringify(offlineBranch));
    setUser(offlineUser);
    setBranch(offlineBranch);
    setIsOfflineMode(true);
    await offlineDb.seedDemoDataIfEmpty();
  };

  const login = async (identifier: string, password: string) => {
    try {
      const res = await api.post('/auth/login', {
        identifier,
        password,
        platform: 'WEB',
      });

      const { user: loggedInUser, branch: userBranch, tokens } = res.data.data;
      localStorage.setItem('ts_access_token', tokens.accessToken);
      localStorage.setItem('ts_refresh_token', tokens.refreshToken);
      localStorage.setItem('ts_user', JSON.stringify(loggedInUser));
      if (userBranch) localStorage.setItem('ts_branch', JSON.stringify(userBranch));
      setUser(loggedInUser);
      setBranch(userBranch);
      setIsOfflineMode(false);
      registerCurrentDevice();
    } catch (err: any) {
      // Check if backend API is unreachable (404 on GitHub Pages or Network Error)
      const isApiMissing = !err.response || err.response?.status === 404 || err.code === 'ERR_NETWORK';
      if (isApiMissing) {
        const isAdmin = identifier === 'admin@trendingstudio.com' && password === 'adminpassword123';
        const isBilling = identifier === 'billing@trendingstudio.com' && password === 'billingpassword123';
        if (isAdmin) {
          await loginOffline('admin');
          return;
        } else if (isBilling) {
          await loginOffline('billing');
          return;
        }
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('ts_refresh_token');
      await api.post('/auth/logout', { refreshToken });
    } catch (err) {
      // Ignore network errors on logout
    } finally {
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
