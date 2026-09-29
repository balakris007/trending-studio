import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  FileCheck,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Shield,
  Calendar,
  Lock,
  Camera,
  Upload,
  X,
  Download,
} from 'lucide-react';
import { IUser, Role } from '@trending-studio/shared-types';
import { dataService } from '../services/dataService';
import * as fsClient from '../services/firebaseClient';

export const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<IUser> | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const list = await dataService.getEmployees();
      setEmployees(list || []);
    } catch (err: any) {
      showNotice(err.message || 'Failed to load employee list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // Filter Employees
  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      emp.name.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      emp.phone.includes(q) ||
      (emp.idProofNumber && emp.idProofNumber.toLowerCase().includes(q)) ||
      (emp.address && emp.address.toLowerCase().includes(q));

    const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Handle Image Conversion to base64
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'photoUrl' | 'idProofImageUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showNotice('Image file size should be less than 2MB for fast loading.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setEditingUser((prev) => ({
        ...prev!,
        [field]: base64,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingUser({
      name: '',
      email: '',
      phone: '',
      role: Role.BILLING_STAFF,
      isActive: true,
      address: '',
      idProofType: 'AADHAAR',
      idProofNumber: '',
      idProofImageUrl: '',
      photoUrl: '',
      emergencyContact: '',
      joiningDate: new Date().toISOString().split('T')[0],
      salary: 0,
    });
    setTempPassword('');
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (emp: IUser) => {
    setEditingUser({ ...emp });
    setTempPassword('');
    setIsModalOpen(true);
  };

  // Save Employee Form
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser?.name?.trim() || !editingUser?.phone?.trim()) {
      showNotice('Please provide staff name and phone number.', 'error');
      return;
    }

    setSaving(true);
    try {
      const userId = editingUser._id || editingUser.id;

      if (userId) {
        // Update existing user
        await dataService.updateEmployee(userId, editingUser);
        showNotice(`Staff member "${editingUser.name}" updated successfully!`);
      } else {
        // Register new staff account
        if (!tempPassword || tempPassword.length < 6) {
          showNotice('Password must be at least 6 characters for new registration.', 'error');
          setSaving(false);
          return;
        }

        const newUser = await dataService.saveEmployee({
          name: editingUser.name.trim(),
          email: (editingUser.email || '').trim().toLowerCase(),
          phone: editingUser.phone.trim(),
          password: tempPassword,
          role: editingUser.role || Role.BILLING_STAFF,
        });

        // Also update extra profile fields (address, idProof, images) in Firestore
        const createdId = newUser._id || newUser.id;
        if (createdId) {
          await dataService.updateEmployee(createdId, {
            address: editingUser.address || '',
            idProofType: editingUser.idProofType || 'AADHAAR',
            idProofNumber: editingUser.idProofNumber || '',
            idProofImageUrl: editingUser.idProofImageUrl || '',
            photoUrl: editingUser.photoUrl || '',
            emergencyContact: editingUser.emergencyContact || '',
            joiningDate: editingUser.joiningDate || new Date().toISOString().split('T')[0],
            salary: Number(editingUser.salary) || 0,
          });
        }
        showNotice(`Staff member "${editingUser.name}" registered successfully!`);
      }

      setIsModalOpen(false);
      setEditingUser(null);
      await loadEmployees();
    } catch (err: any) {
      showNotice(err.message || 'Failed to save staff member.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete / Remove Staff
  const handleDeleteEmployee = async (emp: IUser) => {
    const userId = emp._id || emp.id;
    if (!userId) return;

    if (
      !window.confirm(
        `Are you sure you want to remove staff member "${emp.name}"? They will no longer be able to log in.`
      )
    ) {
      return;
    }

    try {
      await dataService.deleteEmployee(userId);
      showNotice(`Staff member "${emp.name}" removed.`);
      await loadEmployees();
    } catch (err: any) {
      showNotice(err.message || 'Failed to delete staff member.', 'error');
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (emp: IUser) => {
    const userId = emp._id || emp.id;
    if (!userId) return;

    const newStatus = !emp.isActive;
    try {
      await dataService.updateEmployee(userId, { isActive: newStatus });
      showNotice(`Staff "${emp.name}" is now ${newStatus ? 'ACTIVE' : 'INACTIVE'}.`);
      await loadEmployees();
    } catch (err: any) {
      showNotice(err.message || 'Failed to update status.', 'error');
    }
  };

  const activeCount = employees.filter((e) => e.isActive).length;
  const kycVerifiedCount = employees.filter((e) => e.idProofNumber || e.idProofImageUrl).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
            <Users className="w-3.5 h-3.5" />
            <span>Staff Roster & KYC Records</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Staff & Employees</h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Manage registered cashiers, designers, and managers. View contact details, residential addresses, and verify saved government ID proof documents.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={loadEmployees}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700"
            title="Refresh Roster"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Employee</span>
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
            <span>Total Registered Staff</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-white">{employees.length}</div>
          <div className="text-[11px] text-slate-500">Employees in Cloud Firestore</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span>Active Accounts</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{activeCount}</div>
          <div className="text-[11px] text-slate-500">Authorized to log in</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-blue-400 text-xs font-semibold">
            <span>ID Proof / KYC Saved</span>
            <FileCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400">{kycVerifiedCount}</div>
          <div className="text-[11px] text-slate-500">Aadhaar / PAN / ID verified</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-purple-400 text-xs font-semibold">
            <span>Google Sheet Sync</span>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-sm font-bold text-white mt-1">Users Tab Active</div>
          <div className="text-[11px] text-emerald-400 font-bold">Auto-Mirrored</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff by name, mobile, email, ID proof number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="ALL">All Roles</option>
            <option value={Role.SUPER_ADMIN}>Super Admin</option>
            <option value={Role.ADMIN}>Admin</option>
            <option value={Role.MANAGER}>Store Manager</option>
            <option value={Role.BILLING_STAFF}>Billing Staff / Cashier</option>
            <option value={Role.DESIGNER}>Photo Designer</option>
            <option value={Role.PRODUCTION_STAFF}>Production & Framing</option>
          </select>
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEmployees.map((emp) => {
          const empId = emp._id || emp.id || '';
          return (
            <div
              key={empId}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-xl flex flex-col justify-between transition-all group relative overflow-hidden"
            >
              <div className="space-y-4">
                {/* Header: Photo, Name & Role */}
                <div className="flex items-start gap-3">
                  {emp.photoUrl ? (
                    <img
                      src={emp.photoUrl}
                      alt={emp.name}
                      onClick={() => setPreviewImage({ url: emp.photoUrl!, title: `${emp.name} - Profile Photo` })}
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-700 cursor-pointer hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg">
                      {emp.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white truncate">{emp.name}</h3>
                      <button
                        onClick={() => handleToggleActive(emp)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                        title="Click to toggle status"
                      >
                        {emp.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </button>
                    </div>

                    <div className="inline-block px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded text-[10px] font-mono font-bold uppercase">
                      {emp.role ? String(emp.role).replace('_', ' ') : 'BILLING STAFF'}
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <a href={`tel:${emp.phone}`} className="hover:underline font-mono">
                      +91 {emp.phone}
                    </a>
                  </div>

                  {emp.email && (
                    <div className="flex items-center gap-2 text-slate-400 truncate">
                      <Mail className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <a href={`mailto:${emp.email}`} className="hover:underline truncate font-mono text-[11px]">
                        {emp.email}
                      </a>
                    </div>
                  )}

                  {emp.address && (
                    <div className="flex items-start gap-2 text-slate-400 pt-1 border-t border-slate-800/60">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-snug line-clamp-2">{emp.address}</span>
                    </div>
                  )}
                </div>

                {/* ID Proof Section */}
                <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-blue-400" />
                      <span>{emp.idProofType || 'Government ID'}</span>
                    </span>
                    <span className="font-mono text-white text-[11px] font-bold">
                      {emp.idProofNumber || 'Not submitted'}
                    </span>
                  </div>

                  {emp.idProofImageUrl ? (
                    <div
                      onClick={() =>
                        setPreviewImage({
                          url: emp.idProofImageUrl!,
                          title: `${emp.name} - ${emp.idProofType || 'ID Proof Document'}`,
                        })
                      }
                      className="h-20 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 cursor-pointer relative group/img"
                    >
                      <img
                        src={emp.idProofImageUrl}
                        alt="ID Proof"
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                        <Eye className="w-4 h-4" />
                        <span>View ID Document</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 italic py-1">No ID document photo attached</div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(emp)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => handleDeleteEmployee(emp)}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: ADD / EDIT EMPLOYEE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingUser?._id || editingUser?.id ? 'Edit Staff Member Details' : 'Register New Employee'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editingUser?.name || ''}
                    onChange={(e) => setEditingUser((prev) => ({ ...prev!, name: e.target.value }))}
                    placeholder="e.g. Anand Kumar"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={editingUser?.phone || ''}
                    onChange={(e) => setEditingUser((prev) => ({ ...prev!, phone: e.target.value.replace(/[^0-9]/g, '') }))}
                    placeholder="10-digit mobile"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Email Address</label>
                  <input
                    type="email"
                    value={editingUser?.email || ''}
                    onChange={(e) => setEditingUser((prev) => ({ ...prev!, email: e.target.value }))}
                    placeholder="staff@trendingstudio.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Staff Role</label>
                  <select
                    value={editingUser?.role || Role.BILLING_STAFF}
                    onChange={(e) => setEditingUser((prev) => ({ ...prev!, role: e.target.value as Role }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  >
                    <option value={Role.BILLING_STAFF}>Billing Staff / Cashier</option>
                    <option value={Role.MANAGER}>Store Manager</option>
                    <option value={Role.DESIGNER}>Photo Designer</option>
                    <option value={Role.PRODUCTION_STAFF}>Framing & Production</option>
                    <option value={Role.ADMIN}>Admin</option>
                    <option value={Role.SUPER_ADMIN}>Super Admin</option>
                  </select>
                </div>
              </div>

              {/* Password for new users */}
              {!editingUser?._id && !editingUser?.id && (
                <div className="space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <label className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Login Password (Min 6 chars) *</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              )}

              {/* Residential Address */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Residential Address</span>
                </label>
                <textarea
                  rows={2}
                  value={editingUser?.address || ''}
                  onChange={(e) => setEditingUser((prev) => ({ ...prev!, address: e.target.value }))}
                  placeholder="Street, Area, City, Pincode"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
                />
              </div>

              {/* ID Proof Type & Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">ID Proof Type</label>
                  <select
                    value={editingUser?.idProofType || 'AADHAAR'}
                    onChange={(e) => setEditingUser((prev) => ({ ...prev!, idProofType: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  >
                    <option value="AADHAAR">Aadhaar Card</option>
                    <option value="PAN">PAN Card</option>
                    <option value="VOTER_ID">Voter ID</option>
                    <option value="DRIVING_LICENSE">Driving License</option>
                    <option value="PASSPORT">Passport</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">ID Proof Document Number</label>
                  <input
                    type="text"
                    value={editingUser?.idProofNumber || ''}
                    onChange={(e) => setEditingUser((prev) => ({ ...prev!, idProofNumber: e.target.value.toUpperCase() }))}
                    placeholder="e.g. 1234 5678 9012"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Image Uploads: Profile Photo & ID Proof Document */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                {/* 1. Profile Picture */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-blue-400" />
                    <span>Employee Photo</span>
                  </label>
                  <label className="border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/60 rounded-2xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all">
                    {editingUser?.photoUrl ? (
                      <img
                        src={editingUser.photoUrl}
                        alt="Preview"
                        className="w-16 h-16 rounded-xl object-cover mb-1 border border-slate-700"
                      />
                    ) : (
                      <Upload className="w-6 h-6 text-slate-500 mb-1" />
                    )}
                    <span className="text-[10px] text-slate-400 font-bold">
                      {editingUser?.photoUrl ? 'Click to change photo' : 'Upload photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'photoUrl')}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* 2. ID Proof Document Scan */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ID Proof Document Image</span>
                  </label>
                  <label className="border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/60 rounded-2xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all">
                    {editingUser?.idProofImageUrl ? (
                      <img
                        src={editingUser.idProofImageUrl}
                        alt="ID Preview"
                        className="w-20 h-16 rounded-xl object-cover mb-1 border border-slate-700"
                      />
                    ) : (
                      <Upload className="w-6 h-6 text-slate-500 mb-1" />
                    )}
                    <span className="text-[10px] text-slate-400 font-bold">
                      {editingUser?.idProofImageUrl ? 'Click to change ID image' : 'Upload ID proof image'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'idProofImageUrl')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Form Buttons */}
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
                  {saving ? 'Saving...' : editingUser?._id || editingUser?.id ? 'Update Staff Member' : 'Register Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL: FULL-SCREEN IMAGE PREVIEW */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white truncate">{previewImage.title}</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-hidden rounded-2xl bg-slate-950 flex items-center justify-center border border-slate-800">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <div className="flex justify-end">
              <a
                href={previewImage.url}
                download="staff-document.png"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/30"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Image</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Employees;
