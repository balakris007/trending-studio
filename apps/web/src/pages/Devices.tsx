import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Monitor,
  Tablet,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Edit2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Check,
  Ban,
  Clock,
  HardDrive,
} from 'lucide-react';
import { dataService } from '../services/dataService';

export const Devices: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Register Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [devicePlatform, setDevicePlatform] = useState<'WEB' | 'ANDROID' | 'IOS'>('WEB');
  const [saving, setSaving] = useState(false);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadDevices = async () => {
    setLoading(true);
    try {
      const devId = localStorage.getItem('ts_device_id') || '';
      setCurrentDeviceId(devId);
      const list = await dataService.getDevices();
      setDevices(list || []);
    } catch (err: any) {
      showNotice(err.message || 'Failed to load authorized devices.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleToggleRevoke = async (dev: any) => {
    const isNowRevoked = !dev.isRevoked;
    const actionText = isNowRevoked ? 'revoke access for' : 're-authorize';
    if (!window.confirm(`Are you sure you want to ${actionText} "${dev.deviceName || dev.deviceId}"?`)) return;

    try {
      await dataService.updateDeviceStatus(dev.deviceId || dev._id || dev.id, isNowRevoked);
      showNotice(
        `Device "${dev.deviceName || dev.deviceId}" is now ${isNowRevoked ? 'REVOKED' : 'AUTHORIZED'}!`
      );
      await loadDevices();
    } catch (err: any) {
      showNotice(err.message || 'Failed to update device status.', 'error');
    }
  };

  const handleDeleteDevice = async (dev: any) => {
    const devId = dev.deviceId || dev._id || dev.id;
    if (!window.confirm(`Are you sure you want to completely deregister device "${dev.deviceName || devId}"?`)) return;

    try {
      await dataService.deleteDevice(devId);
      showNotice(`Device "${dev.deviceName || devId}" deregistered successfully.`);
      await loadDevices();
    } catch (err: any) {
      showNotice(err.message || 'Failed to delete device.', 'error');
    }
  };

  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) {
      showNotice('Please enter a terminal name.', 'error');
      return;
    }

    setSaving(true);
    try {
      const id = editingDevice
        ? editingDevice.deviceId || editingDevice._id || editingDevice.id
        : `dev_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

      await dataService.registerDevice({
        deviceId: id,
        _id: id,
        id,
        deviceName: deviceName.trim(),
        platform: devicePlatform,
        appVersion: '1.0.0',
        deviceModel: devicePlatform === 'WEB' ? 'Counter PC' : 'Mobile POS Terminal',
        isRevoked: editingDevice ? editingDevice.isRevoked : false,
        lastActiveAt: new Date().toISOString(),
        createdAt: editingDevice?.createdAt || new Date().toISOString(),
      });

      showNotice(`Device "${deviceName}" saved successfully!`);
      setIsModalOpen(false);
      setEditingDevice(null);
      setDeviceName('');
      await loadDevices();
    } catch (err: any) {
      showNotice(err.message || 'Failed to save device.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = devices.filter((d) => !d.isRevoked).length;
  const revokedCount = devices.filter((d) => d.isRevoked).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
            <Smartphone className="w-3.5 h-3.5" />
            <span>POS Hardware & Terminal Control</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Devices & Terminals</h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Authorize billing terminals, cashier workstations, and mobile Android POS handhelds. Restrict access instantly if a device is lost or decommissioned.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={loadDevices}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700"
            title="Refresh Terminals"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setEditingDevice(null);
              setDeviceName('');
              setDevicePlatform('WEB');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Terminal</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Terminals</span>
            <HardDrive className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-white">{devices.length}</div>
          <div className="text-[11px] text-slate-500">Registered store hardware</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span>Authorized & Active</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{activeCount}</div>
          <div className="text-[11px] text-slate-500">Can perform live checkouts</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
            <span>Revoked Access</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{revokedCount}</div>
          <div className="text-[11px] text-slate-500">Blocked from store billing</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-blue-400 text-xs font-semibold">
            <span>This Device ID</span>
            <Monitor className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xs font-mono font-bold text-slate-200 truncate" title={currentDeviceId}>
            {currentDeviceId ? currentDeviceId.slice(0, 16) + '...' : 'web_terminal_01'}
          </div>
          <div className="text-[11px] text-emerald-400 font-bold">Currently Connected</div>
        </div>
      </div>

      {/* Device Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((dev) => {
          const devId = dev.deviceId || dev._id || dev.id;
          const isThisDevice = devId === currentDeviceId;
          const isRevoked = dev.isRevoked === true;

          return (
            <div
              key={devId}
              className={`bg-slate-900 border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all relative overflow-hidden ${
                isRevoked
                  ? 'border-rose-900/40 bg-rose-950/10'
                  : isThisDevice
                  ? 'border-blue-500/50 shadow-blue-500/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {isThisDevice && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
                  THIS TERMINAL
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-3 rounded-xl border ${
                      dev.platform === 'ANDROID'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : dev.platform === 'IOS'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    }`}
                  >
                    {dev.platform === 'ANDROID' ? (
                      <Smartphone className="w-6 h-6" />
                    ) : dev.platform === 'IOS' ? (
                      <Tablet className="w-6 h-6" />
                    ) : (
                      <Monitor className="w-6 h-6" />
                    )}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">
                      {dev.deviceName || 'Terminal Counter'}
                    </h3>
                    <div className="text-[11px] text-slate-400 font-mono truncate">ID: {devId}</div>
                  </div>
                </div>

                <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Platform:</span>
                    <span className="text-slate-300 font-bold">{dev.platform || 'WEB'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Device Model:</span>
                    <span className="text-slate-300 truncate max-w-[140px]">{dev.deviceModel || 'Desktop PC'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span
                      className={`font-bold ${
                        isRevoked ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {isRevoked ? 'REVOKED' : 'AUTHORIZED'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Last Active:</span>
                    <span className="text-slate-400">
                      {dev.lastActiveAt ? new Date(dev.lastActiveAt).toLocaleDateString() : 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleRevoke(dev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isRevoked
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {isRevoked ? <Check className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                  <span>{isRevoked ? 'Re-Authorize' : 'Revoke Access'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingDevice(dev);
                      setDeviceName(dev.deviceName || '');
                      setDevicePlatform(dev.platform || 'WEB');
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all"
                    title="Rename Terminal"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteDevice(dev)}
                    className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg text-xs font-bold transition-all"
                    title="Deregister Terminal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal Security Notice */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 space-y-1">
          <span className="font-bold text-slate-200">Hardware Security Guard:</span> Each browser terminal and mobile handheld is stamped with a unique cryptographic hardware identifier on first connection. Revoking a terminal immediately disables checkout billing on that screen, protecting the store database from unauthorized external access.
        </div>
      </div>

      {/* MODAL: REGISTER / EDIT DEVICE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingDevice ? 'Edit Terminal' : 'Register New Hardware Terminal'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDevice} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Terminal Friendly Name</label>
                <input
                  type="text"
                  required
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g. Counter 2 - Framing Desk"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Device Platform Type</label>
                <select
                  value={devicePlatform}
                  onChange={(e) => setDevicePlatform(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                >
                  <option value="WEB">Desktop Counter PC (Web Browser)</option>
                  <option value="ANDROID">Android Handheld POS / Mobile Phone</option>
                  <option value="IOS">Apple iPad / Tablet Terminal</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  {saving ? 'Registering...' : editingDevice ? 'Save Changes' : 'Register Terminal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Devices;
