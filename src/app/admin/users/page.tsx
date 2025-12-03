'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Loader2, RefreshCw, AlertTriangle, Edit3, Trash2, 
  Plus, X, Check, Key, UserPlus, Copy, CheckCircle, Shield,
  Building2, Users, CreditCard, Eye, ChevronDown, Search,
  Filter, Crown, Home, Settings
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  isActive: boolean;
  isSuspended: boolean;
  mfaEnabled: boolean;
  // Relationships
  landlordProfile?: {
    id: string;
    company: string | null;
    propertyCount: number;
    tenantCount: number;
  } | null;
  tenantProfile?: {
    id: string;
    currentTenancy?: {
      propertyAddress: string;
      landlordName: string;
      landlordEmail: string;
      monthlyRent: number;
    } | null;
  } | null;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  
  // Modals
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  
  // Password reset result
  const [newPassword, setNewPassword] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({ 
    role: '', 
    resetPassword: false,
    subscriptionTier: '',
    subscriptionStatus: '',
  });
  
  // Add user form
  const [addForm, setAddForm] = useState({ email: '', name: '', password: '', role: 'TENANT' });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/users?page=1&limit=100&includeRelations=true');
      
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        setError(data.error || data.debug || 'API returned error');
        setUsers([]);
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateUser() {
    if (!editingUser) return;
    setSaving(true);
    setActionMessage(null);
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          role: editForm.role,
          resetPassword: editForm.resetPassword,
          subscriptionTier: editForm.subscriptionTier,
          subscriptionStatus: editForm.subscriptionStatus,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (data.newPassword) {
          setNewPassword({ email: editingUser.email, password: data.newPassword });
        } else {
          setActionMessage(data.message || 'User updated successfully');
        }
        setEditingUser(null);
        setEditForm({ role: '', resetPassword: false, subscriptionTier: '', subscriptionStatus: '' });
        loadUsers();
      } else {
        setActionMessage(`Error: ${data.error || data.debug}`);
      }
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser() {
    if (!deletingUser) return;
    setSaving(true);
    setActionMessage(null);
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deletingUser.id }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setActionMessage('User deleted successfully');
        setDeletingUser(null);
        loadUsers();
      } else {
        setActionMessage(`Error: ${data.error || data.debug}`);
      }
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function addUser() {
    if (!addForm.email || !addForm.password) return;
    setSaving(true);
    setActionMessage(null);
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setActionMessage('User created successfully');
        setShowAddUser(false);
        setAddForm({ email: '', name: '', password: '', role: 'TENANT' });
        loadUsers();
      } else {
        setActionMessage(`Error: ${data.error || data.debug}`);
      }
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function copyPassword() {
    if (newPassword) {
      navigator.clipboard.writeText(newPassword.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    const matchesTier = tierFilter === 'ALL' || user.subscriptionTier === tierFilter;
    return matchesSearch && matchesRole && matchesTier;
  });

  // Stats
  const stats = {
    total: users.length,
    landlords: users.filter(u => u.role === 'LANDLORD').length,
    tenants: users.filter(u => u.role === 'TENANT').length,
    pros: users.filter(u => u.role === 'PRO').length,
    free: users.filter(u => u.subscriptionTier === 'FREE').length,
    pro: users.filter(u => u.subscriptionTier === 'PRO').length,
    enterprise: users.filter(u => u.subscriptionTier === 'ENTERPRISE').length,
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Users</h1>
          <p className="text-gray-400">Manage platform users and their subscriptions</p>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <UserPlus className="h-5 w-5" />
          Add User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <p className="text-gray-400 text-xs uppercase mb-1">Total</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <p className="text-blue-400 text-xs uppercase mb-1">Landlords</p>
          <p className="text-2xl font-bold text-white">{stats.landlords}</p>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <p className="text-green-400 text-xs uppercase mb-1">Tenants</p>
          <p className="text-2xl font-bold text-white">{stats.tenants}</p>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <p className="text-orange-400 text-xs uppercase mb-1">Pros</p>
          <p className="text-2xl font-bold text-white">{stats.pros}</p>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <p className="text-gray-400 text-xs uppercase mb-1">Free</p>
          <p className="text-2xl font-bold text-white">{stats.free}</p>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <p className="text-purple-400 text-xs uppercase mb-1">Pro</p>
          <p className="text-2xl font-bold text-white">{stats.pro}</p>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <p className="text-yellow-400 text-xs uppercase mb-1">Enterprise</p>
          <p className="text-2xl font-bold text-white">{stats.enterprise}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email or name..."
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500"
            />
          </div>
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white"
        >
          <option value="ALL">All Roles</option>
          <option value="LANDLORD">Landlords</option>
          <option value="TENANT">Tenants</option>
          <option value="PRO">Pros</option>
          <option value="ADMIN">Admins</option>
        </select>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white"
        >
          <option value="ALL">All Tiers</option>
          <option value="FREE">Free</option>
          <option value="PRO">Pro</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
        <button
          onClick={loadUsers}
          className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div className={`mb-6 p-4 rounded-lg ${actionMessage.startsWith('Error') ? 'bg-red-900/20 border border-red-800 text-red-400' : 'bg-green-900/20 border border-green-800 text-green-400'}`}>
          {actionMessage}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-400 mb-1">Error Loading Users</h3>
              <p className="text-gray-300 text-sm mb-3 font-mono break-all">{error}</p>
              <button onClick={loadUsers} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400">{error ? 'Failed to load users' : 'No users found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Subscription</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Relationship</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{user.name || 'No name'}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        user.role === 'SUPER_ADMIN' ? 'bg-purple-500/20 text-purple-400' :
                        user.role === 'ADMIN' ? 'bg-indigo-500/20 text-indigo-400' :
                        user.role === 'LANDLORD' ? 'bg-blue-500/20 text-blue-400' :
                        user.role === 'PRO' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          user.subscriptionTier === 'ENTERPRISE' ? 'bg-yellow-500/20 text-yellow-400' :
                          user.subscriptionTier === 'PRO' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {user.subscriptionTier}
                        </span>
                        {user.subscriptionStatus === 'ACTIVE' && (
                          <Crown className="h-3 w-3 text-yellow-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {user.role === 'LANDLORD' && user.landlordProfile && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-400" />
                          <span>{user.landlordProfile.propertyCount || 0} properties</span>
                          <Users className="h-4 w-4 text-green-400 ml-2" />
                          <span>{user.landlordProfile.tenantCount || 0} tenants</span>
                        </div>
                      )}
                      {user.role === 'TENANT' && user.tenantProfile?.currentTenancy && (
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-green-400" />
                          <span className="truncate max-w-[200px]">
                            {user.tenantProfile.currentTenancy.landlordName || 'Unknown landlord'}
                          </span>
                        </div>
                      )}
                      {user.role === 'TENANT' && !user.tenantProfile?.currentTenancy && (
                        <span className="text-gray-500 italic">No tenancy</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        user.isSuspended ? 'bg-red-500/20 text-red-400' :
                        !user.isActive ? 'bg-gray-500/20 text-gray-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {user.isSuspended ? 'Suspended' : user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingUser(user)}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-lg"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-800 rounded-lg"
                          title="Manage Features"
                        >
                          <Settings className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setEditForm({ 
                              role: user.role, 
                              resetPassword: false,
                              subscriptionTier: user.subscriptionTier,
                              subscriptionStatus: user.subscriptionStatus,
                            });
                          }}
                          className="p-2 text-gray-400 hover:text-purple-400 hover:bg-gray-800 rounded-lg"
                          title="Edit User"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingUser(user)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View User Modal */}
      {viewingUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-2xl w-full my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">User Details</h2>
              <button onClick={() => setViewingUser(null)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Name</p>
                  <p className="text-white">{viewingUser.name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Email</p>
                  <p className="text-white">{viewingUser.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Role</p>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    viewingUser.role === 'LANDLORD' ? 'bg-blue-500/20 text-blue-400' :
                    viewingUser.role === 'TENANT' ? 'bg-green-500/20 text-green-400' :
                    viewingUser.role === 'PRO' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {viewingUser.role}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Joined</p>
                  <p className="text-white">{new Date(viewingUser.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Subscription */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Subscription
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tier</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      viewingUser.subscriptionTier === 'ENTERPRISE' ? 'bg-yellow-500/20 text-yellow-400' :
                      viewingUser.subscriptionTier === 'PRO' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {viewingUser.subscriptionTier}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      viewingUser.subscriptionStatus === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                      viewingUser.subscriptionStatus === 'PAST_DUE' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {viewingUser.subscriptionStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Landlord Details */}
              {viewingUser.role === 'LANDLORD' && viewingUser.landlordProfile && (
                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Landlord Profile
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Company</p>
                      <p className="text-white">{viewingUser.landlordProfile.company || 'Individual'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Properties</p>
                      <p className="text-white">{viewingUser.landlordProfile.propertyCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Active Tenants</p>
                      <p className="text-white">{viewingUser.landlordProfile.tenantCount || 0}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tenant Details */}
              {viewingUser.role === 'TENANT' && (
                <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Tenant Profile
                  </h3>
                  {viewingUser.tenantProfile?.currentTenancy ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 mb-1">Current Property</p>
                        <p className="text-white">{viewingUser.tenantProfile.currentTenancy.propertyAddress}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Landlord</p>
                        <p className="text-white">{viewingUser.tenantProfile.currentTenancy.landlordName}</p>
                        <p className="text-xs text-gray-500">{viewingUser.tenantProfile.currentTenancy.landlordEmail}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Monthly Rent</p>
                        <p className="text-white">${viewingUser.tenantProfile.currentTenancy.monthlyRent?.toLocaleString() || 'N/A'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">No active tenancy</p>
                  )}
                </div>
              )}

              {/* Security */}
              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className={`h-5 w-5 ${viewingUser.mfaEnabled ? 'text-green-400' : 'text-gray-500'}`} />
                  <div>
                    <p className="text-sm text-white">Two-Factor Authentication</p>
                    <p className="text-xs text-gray-500">
                      {viewingUser.mfaEnabled ? 'Enabled' : 'Not enabled'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
              <Link
                href={`/admin/users/${viewingUser.id}`}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Manage Features
              </Link>
              <button
                onClick={() => {
                  setViewingUser(null);
                  setEditingUser(viewingUser);
                  setEditForm({ 
                    role: viewingUser.role, 
                    resetPassword: false,
                    subscriptionTier: viewingUser.subscriptionTier,
                    subscriptionStatus: viewingUser.subscriptionStatus,
                  });
                }}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Password Modal */}
      {newPassword && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                Password Reset Complete
              </h2>
              <button onClick={() => setNewPassword(null)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-400 text-sm mb-4">
                The password for <span className="text-white font-medium">{newPassword.email}</span> has been reset.
              </p>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">New Password:</p>
                <div className="flex items-center gap-3">
                  <code className="flex-1 text-lg font-mono text-green-400 bg-gray-900 px-3 py-2 rounded">
                    {newPassword.password}
                  </code>
                  <button
                    onClick={copyPassword}
                    className={`p-2 rounded-lg transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              <p className="text-yellow-500 text-xs mt-4">
                ⚠️ Make sure to save this password - it won't be shown again!
              </p>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => setNewPassword(null)}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Edit User</h2>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-white font-medium">{editingUser.name || 'No name'}</p>
                <p className="text-sm text-gray-400">{editingUser.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="TENANT">Tenant</option>
                  <option value="LANDLORD">Landlord</option>
                  <option value="PRO">Pro</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Subscription Tier</label>
                  <select
                    value={editForm.subscriptionTier}
                    onChange={(e) => setEditForm({ ...editForm, subscriptionTier: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="FREE">Free</option>
                    <option value="PRO">Pro</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={editForm.subscriptionStatus}
                    onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="INACTIVE">Inactive</option>
                    <option value="ACTIVE">Active</option>
                    <option value="TRIALING">Trialing</option>
                    <option value="PAST_DUE">Past Due</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-gray-800 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.resetPassword}
                    onChange={(e) => setEditForm({ ...editForm, resetPassword: e.target.checked })}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-orange-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-orange-400 flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Reset Password
                    </span>
                    <p className="text-xs text-gray-500 mt-1">Generate a new random password</p>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={updateUser}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-700 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Delete User</h2>
              <button onClick={() => setDeletingUser(null)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg mb-4">
                <p className="text-red-400 text-sm">
                  This action cannot be undone. This will permanently delete the user and all associated data.
                </p>
              </div>
              
              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-white font-medium">{deletingUser.name || 'No name'}</p>
                <p className="text-sm text-gray-400">{deletingUser.email}</p>
              </div>
            </div>
            
            <div className="flex gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => setDeletingUser(null)}
                className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={deleteUser}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-700 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Add User</h2>
              <button onClick={() => setShowAddUser(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password *</label>
                <input
                  type="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  placeholder="Min 8 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="TENANT">Tenant</option>
                  <option value="LANDLORD">Landlord</option>
                  <option value="PRO">Pro</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => setShowAddUser(false)}
                className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={addUser}
                disabled={saving || !addForm.email || !addForm.password}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-700 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
