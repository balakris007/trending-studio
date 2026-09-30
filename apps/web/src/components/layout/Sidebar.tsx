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
  Image as ImageIcon,
  SquareCode,
  BarChart3,
  RefreshCw,
  Smartphone,
  Settings,
  Database,
  UserCheck,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { Role } from '@trending-studio/shared-types';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, activeGradient: 'from-blue-600 to-indigo-600 shadow-blue-500/25' },
    { label: 'POS Quick Billing', path: '/pos', icon: ShoppingCart, isSpecial: true, activeGradient: 'from-orange-500 via-pink-500 to-purple-600 shadow-orange-500/30' },
    { label: 'Invoices & Receipts', path: '/invoices', icon: FileText, activeGradient: 'from-emerald-600 to-teal-600 shadow-emerald-500/25' },
    { label: 'Studio Orders', path: '/orders', icon: KanbanSquare, activeGradient: 'from-purple-600 to-indigo-600 shadow-purple-500/25' },
    { label: 'Customers', path: '/customers', icon: Users, activeGradient: 'from-pink-600 to-rose-600 shadow-pink-500/25' },
    { label: 'Employees & Staff', path: '/employees', icon: UserCheck, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER], activeGradient: 'from-cyan-600 to-blue-600 shadow-cyan-500/25' },
    { label: 'Products & Stock', path: '/products', icon: Package, activeGradient: 'from-amber-600 to-orange-600 shadow-amber-500/25' },
    { label: 'Photo Prints (18 Sizes)', path: '/photo-prints', icon: ImageIcon, activeGradient: 'from-fuchsia-600 to-pink-600 shadow-fuchsia-500/25' },
    { label: 'Frame Master (19 Sizes)', path: '/frames', icon: SquareCode, activeGradient: 'from-cyan-500 to-blue-600 shadow-cyan-500/25' },
    { label: 'Reports & GST', path: '/reports', icon: BarChart3, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT], activeGradient: 'from-indigo-600 to-blue-600 shadow-indigo-500/25' },
    { label: 'Sync Center', path: '/sync', icon: RefreshCw, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER], activeGradient: 'from-teal-600 to-emerald-600 shadow-teal-500/25' },
    { label: 'Devices', path: '/devices', icon: Smartphone, roles: [Role.SUPER_ADMIN, Role.ADMIN], activeGradient: 'from-slate-700 to-slate-800 shadow-slate-500/20' },
    { label: 'Settings', path: '/settings', icon: Settings, roles: [Role.SUPER_ADMIN, Role.ADMIN], activeGradient: 'from-slate-700 to-slate-800 shadow-slate-500/20' },
    { label: 'Cloud Backups', path: '/backups', icon: Database, roles: [Role.SUPER_ADMIN, Role.ADMIN], activeGradient: 'from-blue-700 to-indigo-800 shadow-blue-500/20' },
  ];

  return (
    <aside className="hidden lg:flex w-64 bg-[#090e1a]/95 backdrop-blur-xl border-r border-slate-800/80 flex-col justify-between h-[calc(100vh-5.5rem)] sticky top-[3.75rem] select-none z-20 shadow-2xl">
      {/* Navigation Links */}
      <div className="py-3 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          <span>Navigation</span>
          <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Karaikudi</span>
          </span>
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
                `flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold text-xs transition-all group ${
                  isActive
                    ? `bg-gradient-to-r ${item.activeGradient} text-white shadow-lg`
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-cyan-400'}`} />
                    <span className="tracking-wide">{item.label}</span>
                  </div>
                  {item.isSpecial && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Store Footer Celebration Card with WhatsApp Direct Badge */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl p-3 border border-slate-800/90 shadow-lg relative overflow-hidden group">
          {/* Subtle colorful corner glow */}
          <div className="absolute -top-6 -right-6 w-16 h-16 bg-gradient-to-br from-orange-500/20 via-pink-500/20 to-cyan-500/20 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform" />

          <div className="flex items-center space-x-2 mb-2">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain shrink-0 drop-shadow" />
            <div className="overflow-hidden">
              <p className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-400 to-cyan-400 truncate">
                Trending Studio
              </p>
              <p className="text-[10px] text-slate-400 font-medium truncate">Gifts & Photo Frames</p>
            </div>
          </div>

          {/* Official WhatsApp Support Button */}
          <a
            href="https://wa.me/917904064446?text=Hi%20Trending%20Studio"
            target="_blank"
            rel="noreferrer"
            className="w-full mt-1 py-1.5 px-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-all shadow-sm group/wa"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400 group-hover/wa:scale-110 transition-transform" />
            <span className="font-mono">WhatsApp: 79040-64446</span>
          </a>

          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Karaikudi Main</span>
            <span className="text-emerald-400 font-bold">Cloud Live</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
