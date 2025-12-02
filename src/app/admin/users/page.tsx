'use client';

import { useEffect, useState } from 'react';
import { 
  Search, ChevronLeft, ChevronRight, Edit3, 
  Loader2, X, Check, Shield, ShieldOff, ShieldCheck,
  CreditCard, Clock, AlertTriangle, Ban, CheckCircle,
  Key, KeyRound, RefreshCw
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  isSuspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  loginCount: number;
  mfaEnabled: boolean;
  mfaVerifiedAt: string | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  subscriptionEndsAt: string | null;
  lastPaymentAt: string | null;
  lastPaymentAmount: number | null;
  failedPaymentCount: number;
  nextBillingDate: string | null;
  stripeCustomerId: string | null;
  createdAt: string;
  landlordProfile?: { id: string; company: string | null; _count: { properties: number } };
  proProfile?: { id: string; businessName: string; isVerified: boolean };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [billingFilter, setBillingFilter] = useState('');
  const [mfaFilter, setMfaFilter] = useState('');
  
  // Edit modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ 
    role: '', 
    tier: '', 
    subscriptionStatus: '',
    isSuspended: false,
    suspendedReason: '',
    mfaEnabled: false,
    resetMfa: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [page, search, roleFilter, tierFilter, statusFilter, billingFilter, mfaFilter]);

  async function loadUsers() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(tierFilter && { tier: tierFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(billingFilter && { billing: billingFilter }),
        ...(mfaFilter && { mfa: mfaFilter }),
      });
      
      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();
      
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || data.users.length);
      } else {
        // API returned an error
        setError(data.error || data.debug || 'Failed to load users');
        setUsers([]);
        setTotalPages(1);
        setTotal(0);
      }
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError(err.message || 'Network error');
      setUsers([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  async function updateUser() {
    if (!editingUser) return;
    
    try {
      setSaving(true);
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          ...(editForm.role && { role: editForm.role }),
          ...(editForm.tier && { subscriptionTier: editForm.tier }),
          ...(editForm.subscriptionStatus && { subscriptionStatus: editForm.subscriptionStatus }),
          isSuspended: editForm.isSuspended,
          suspendedReason: editForm.suspendedReason,
          mfaEnabled: editForm.mfaEnabled,
          resetMfa: editForm.resetMfa,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEditingUser(null);
        loadUsers();
      } else {
        alert('Failed to update user: ' + (data.error || data.debug || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to update user:', err);
      alert('Network error updating user');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Users</h1>
        <p className="text-gray-400">Manage {total.toLocaleString()} platform users</p>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search email or name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="">All Roles</option>
            <option value="LANDLORD">Landlord</option>
            <option value="TENANT">Tenant</option>
            <option value="PRO">Pro</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
          
          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="">All Tiers</option>
            <option value="FREE">Free</option>
            <option value="PRO">Pro</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>

          {/* Account Status */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Billing Status */}
          <select
            value={billingFilter}
            onChange={(e) => { setBillingFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="">All Billing</option>
            <option value="current">Current</option>
            <option value="past_due">Past Due</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* MFA Filter */}
          <select
            value={mfaFilter}
            onChange={(e) => { setMfaFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="">MFA Status</option>
            <option value="enabled">MFA Enabled</option>
            <option value="disabled">MFA Disabled</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-400 mb-1">Failed to Load Users</h3>
              <p className="text-gray-300 mb-3">{error}</p>
              <button
                onClick={loadUsers}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
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
        ) : users.length === 0 && !error ? (
          <div className="p-12 text-center">
            <p className="text-gray-400">No users found</p>
          </div>
        ) : users.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Subscription</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Joined</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-gray-300">
                              {(user.name || user.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate">{user.name || 'No name'}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      
                      {/* Role */}
                      <td className="px-4 py-3">
                        <RoleBadge role={user.role} />
                      </td>
                      
                      {/* Account Status */}
                      <td className="px-4 py-3">
                        <AccountStatus user={user} />
                      </td>
                      
                      {/* Subscription */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <TierBadge tier={user.subscriptionTier || 'FREE'} />
                          <SubscriptionStatusBadge status={user.subscriptionStatus || 'INACTIVE'} />
                        </div>
                      </td>
                      
                      {/* Joined */}
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-400">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </td>
                      
                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setEditForm({
                              role: user.role,
                              tier: user.subscriptionTier || 'FREE',
                              subscriptionStatus: user.subscriptionStatus || 'INACTIVE',
                              isSuspended: user.isSuspended || false,
                              suspendedReason: user.suspendedReason || '',
                              mfaEnabled: user.mfaEnabled || false,
                              resetMfa: false,
                            });
                          }}
                          className="p-2 text-gray-400 hover:text-purple-400 hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} ({total} users)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-lg w-full my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Edit User</h2>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* User Info */}
              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-white font-medium">{editingUser.name || 'No name'}</p>
                <p className="text-sm text-gray-400">{editingUser.email}</p>
              </div>

              {/* Role */}
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

              {/* Subscription Tier */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subscription Tier</label>
                <select
                  value={editForm.tier}
                  onChange={(e) => setEditForm({ ...editForm, tier: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="FREE">Free</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>

              <p className="text-xs text-yellow-500">
                Note: Some features are disabled until database migration is complete.
              </p>
            </div>
            
            <div className="flex gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={updateUser}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Component: Role Badge
function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-500/20 text-purple-400',
    ADMIN: 'bg-indigo-500/20 text-indigo-400',
    LANDLORD: 'bg-blue-500/20 text-blue-400',
    TENANT: 'bg-green-500/20 text-green-400',
    PRO: 'bg-orange-500/20 text-orange-400',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${styles[role] || 'bg-gray-500/20 text-gray-400'}`}>
      {role === 'SUPER_ADMIN' && <Shield className="h-3 w-3" />}
      {role?.replace('_', ' ') || 'Unknown'}
    </span>
  );
}

// Component: Tier Badge
function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    FREE: 'bg-gray-500/20 text-gray-400',
    PRO: 'bg-blue-500/20 text-blue-400',
    ENTERPRISE: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[tier] || 'bg-gray-500/20 text-gray-400'}`}>
      {tier || 'FREE'}
    </span>
  );
}

// Component: Subscription Status Badge
function SubscriptionStatusBadge({ status }: { status: string }) {
  const config: Record<string, { style: string; icon: any }> = {
    ACTIVE: { style: 'text-green-400', icon: CheckCircle },
    INACTIVE: { style: 'text-gray-500', icon: Clock },
    TRIALING: { style: 'text-blue-400', icon: Clock },
    PAST_DUE: { style: 'text-orange-400', icon: AlertTriangle },
    CANCELLED: { style: 'text-red-400', icon: Ban },
  };

  const c = config[status] || config.INACTIVE;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${c.style}`}>
      <Icon className="h-3 w-3" />
      {status?.replace('_', ' ') || 'INACTIVE'}
    </span>
  );
}

// Component: Account Status
function AccountStatus({ user }: { user: User }) {
  if (user.isSuspended) {
    return (
      <div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
          <Ban className="h-3 w-3" />
          Suspended
        </span>
        {user.suspendedReason && (
          <p className="text-xs text-gray-500 mt-1 truncate max-w-[120px]" title={user.suspendedReason}>
            {user.suspendedReason}
          </p>
        )}
      </div>
    );
  }
  
  if (user.isActive === false) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-400">
        Inactive
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
      <CheckCircle className="h-3 w-3" />
      Active
    </span>
  );
}
