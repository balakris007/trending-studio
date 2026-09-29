import React from 'react';
import { NavLink } from 'react-router-dom';
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
  UserCheck,
} from 'lucide-react';
import { Role } from '@trending-studio/shared-types';

export const Sidebar: React.FC = () => {
  const { user, hasRole } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'POS Billing', path: '/pos', icon: ShoppingCart },
    { label: 'Invoices', path: '/invoices', icon: FileText },
    { label: 'Studio Orders', path: '/orders', icon: KanbanSquare },
    { label: 'Customers', path: '/customers', icon: Users },
    { label: 'Employees', path: '/employees', icon: UserCheck, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER] },
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
    <aside className="hidden lg:flex w-64 bg-slate-900/90 backdrop-blur-md border-r border-slate-800 flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 select-none">
      <div className="py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Operations
        </div>

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
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${
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

      {/* Store Footer Card */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
          <p className="text-xs font-bold text-slate-200">TRENDING STUDIO</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Support: +91-79040-64446</p>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>GSTIN: 33ABCDE1234F</span>
            <span className="text-emerald-400">v1.0.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
