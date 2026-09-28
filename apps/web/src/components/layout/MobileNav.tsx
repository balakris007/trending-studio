import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  KanbanSquare,
  Users,
  Package,
  Image,
  SquareCode,
  BarChart3,
  RefreshCw,
  Smartphone,
  Settings,
  Database,
  Menu,
  X,
  LogOut,
  Store,
  Sparkles,
} from 'lucide-react';
import { Role } from '@trending-studio/shared-types';

interface MobileNavProps {
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isDrawerOpen, setIsDrawerOpen }) => {
  const { user, branch, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsDrawerOpen(false);
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'POS Billing', path: '/pos', icon: ShoppingCart },
    { label: 'Invoices', path: '/invoices', icon: FileText },
    { label: 'Studio Orders', path: '/orders', icon: KanbanSquare },
    { label: 'Customers', path: '/customers', icon: Users },
    { label: 'Products & Stock', path: '/products', icon: Package },
    { label: 'Photo Prints', path: '/photo-prints', icon: Image },
    { label: 'Frame Master', path: '/frames', icon: SquareCode },
    { label: 'Reports & GST', path: '/reports', icon: BarChart3, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT] },
    { label: 'Sync Center', path: '/sync', icon: RefreshCw, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER] },
    { label: 'Devices', path: '/devices', icon: Smartphone, roles: [Role.SUPER_ADMIN, Role.ADMIN] },
    { label: 'Settings', path: '/settings', icon: Settings, roles: [Role.SUPER_ADMIN, Role.ADMIN] },
    { label: 'Backups', path: '/backups', icon: Database, roles: [Role.SUPER_ADMIN, Role.ADMIN] },
  ];

  return (
    <>
      {/* 1. Mobile Bottom Navigation Bar (Hidden on desktop) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-pb">
        <NavLink
          to="/pos"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              isActive ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5 mb-0.5" />
          </div>
          <span className="text-[10px]">POS</span>
        </NavLink>

        <NavLink
          to="/invoices"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              isActive ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Invoices</span>
        </NavLink>

        <NavLink
          to="/products"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              isActive ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <Package className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Products</span>
        </NavLink>

        <NavLink
          to="/customers"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              isActive ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Customers</span>
        </NavLink>

        <button
          onClick={() => setIsDrawerOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            isDrawerOpen ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Menu</span>
        </button>
      </nav>

      {/* 2. Slide-Over Navigation Drawer */}
      {isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-bold text-sm text-white">
                    TRENDING <span className="text-blue-400">STUDIO</span>
                  </span>
                  <p className="text-[10px] text-slate-400">{branch?.name || 'Karaikudi Main'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav Links */}
            <div className="py-2 px-3 space-y-1 overflow-y-auto flex-1">
              {navItems.map((item) => {
                if (item.roles && !item.roles.includes(user?.role as Role) && user?.role !== Role.SUPER_ADMIN) {
                  return null;
                }
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => setIsDrawerOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            {/* User & Logout */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
              <div className="flex items-center justify-between text-xs px-2">
                <div>
                  <p className="font-semibold text-white">{user?.name}</p>
                  <p className="text-[10px] text-blue-400">{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
