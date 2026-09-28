import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser, IBranch, Role, Permission } from '@trending-studio/shared-types';
import { api } from '../services/api';

interface AuthContextType {
  user: IUser | null;
  branch: IBranch | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
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

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('ts_access_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data.user);
          setBranch(res.data.data.branch);
          registerCurrentDevice();
        } catch (err) {
          localStorage.removeItem('ts_access_token');
          localStorage.removeItem('ts_refresh_token');
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    const res = await api.post('/auth/login', {
      identifier,
      password,
      platform: 'WEB',
    });

    const { user: loggedInUser, branch: userBranch, tokens } = res.data.data;
    localStorage.setItem('ts_access_token', tokens.accessToken);
    localStorage.setItem('ts_refresh_token', tokens.refreshToken);
    setUser(loggedInUser);
    setBranch(userBranch);
    registerCurrentDevice();
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
        login,
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
