'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, Users, Settings, ToggleLeft, BarChart3, 
  Loader2, Search, ChevronLeft, ChevronRight, 
  Building2, FileText, User, Briefcase, Crown,
  Check, X, Edit3, AlertTriangle
} from 'lucide-react';

interface Stats {
  users: {
    total: number;
    landlords: number;
    tenants: number;
    pros: number;
    recentSignups: number;
  };
  subscriptions: {
    active: number;
    free: number;
    pro: number;
    enterprise: number;
  };
  platform: {
    totalProperties: number;
    totalApplications: number;
  };
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  createdAt: string;
  landlordProfile?: { id: string; company: string | null; _count: { properties: number } };
  proProfile?: { id: string; businessName: string; isVerified: boolean };
}

interface Feature {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  enabledForFree: boolean;
  enabledForPro: boolean;
  enabledForEnterprise: boolean;
  enabledForLandlords: boolean;
  enabledForTenants: boolean;
  enabledForPros: boolean;
  freeTierLimit: number | null;
  proTierLimit: number | null;
  enterpriseTierLimit: number | null;
  category: string | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'features'>('overview');
  
  // Stats
  const [stats, setStats] = useState<Stats | null>(null);
  
  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState('');
  const [usersTierFilter, setUsersTierFilter] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Features
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [editingFeature, setEditingFeature] = useState<string | null>(null);
  
  // Edit user modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserForm, setEditUserForm] = useState({ role: '', tier: '', status: '' });
  const [savingUser, setSavingUser] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'features') {
      loadFeatures();
    }
  }, [activeTab, usersPage, usersSearch, usersRoleFilter, usersTierFilter]);

  async function checkAccess() {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.status === 403) {
        setError('Access denied. Super Admin privileges required.');
        setLoading(false);
        return;
      }
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      setLoadingUsers(true);
      const params = new URLSearchParams({
        page: usersPage.toString(),
        limit: '20',
        ...(usersSearch && { search: usersSearch }),
        ...(usersRoleFilter && { role: usersRoleFilter }),
        ...(usersTierFilter && { tier: usersTierFilter }),
      });
      
      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
        setUsersTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadFeatures() {
    try {
      setLoadingFeatures(true);
      const response = await fetch('/api/admin/features');
      const data = await response.json();
      
      if (data.success) {
        setFeatures(data.features);
      }
    } catch (err) {
      console.error('Failed to load features:', err);
    } finally {
      setLoadingFeatures(false);
    }
  }

  async function updateUser() {
    if (!editingUser) return;
    
    try {
      setSavingUser(true);
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          ...(editUserForm.role && { role: editUserForm.role }),
          ...(editUserForm.tier && { subscriptionTier: editUserForm.tier }),
          ...(editUserForm.status && { subscriptionStatus: editUserForm.status }),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEditingUser(null);
        loadUsers();
      } else {
        alert('Failed to update user: ' + data.error);
      }
    } catch (err) {
      console.error('Failed to update user:', err);
    } finally {
      setSavingUser(false);
    }
  }

  async function toggleFeature(featureId: string, field: string, value: boolean) {
    try {
      const response = await fetch('/api/admin/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: featureId,
          [field]: value,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        loadFeatures();
      } else {
        alert('Failed to update feature: ' + data.error);
      }
    } catch (err) {
      console.error('Failed to toggle feature:', err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-purple-500" />
              <div>
                <h1 className="text-2xl font-bold">Super Admin</h1>
                <p className="text-gray-400 text-sm">RentalIQ Platform Management</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
            >
              Back to App
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'features', label: 'Features', icon: ToggleLeft },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            {/* User Stats */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-400" />
                User Statistics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Total Users" value={stats.users.total} icon={<Users className="h-6 w-6" />} color="purple" />
                <StatCard title="Landlords" value={stats.users.landlords} icon={<Building2 className="h-6 w-6" />} color="blue" />
                <StatCard title="Tenants" value={stats.users.tenants} icon={<User className="h-6 w-6" />} color="green" />
                <StatCard title="Service Pros" value={stats.users.pros} icon={<Briefcase className="h-6 w-6" />} color="orange" />
                <StatCard title="New (30d)" value={stats.users.recentSignups} icon={<Crown className="h-6 w-6" />} color="pink" />
              </div>
            </div>

            {/* Subscription Stats */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-400" />
                Subscriptions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Active" value={stats.subscriptions.active} color="green" />
                <StatCard title="Free Tier" value={stats.subscriptions.free} color="gray" />
                <StatCard title="Pro Tier" value={stats.subscriptions.pro} color="blue" />
                <StatCard title="Enterprise" value={stats.subscriptions.enterprise} color="purple" />
              </div>
            </div>

            {/* Platform Stats */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                Platform Activity
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard title="Total Properties" value={stats.platform.totalProperties} icon={<Building2 className="h-6 w-6" />} color="indigo" />
                <StatCard title="Applications" value={stats.platform.totalApplications} icon={<FileText className="h-6 w-6" />} color="teal" />
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by email or name..."
                    value={usersSearch}
                    onChange={(e) => { setUsersSearch(e.target.value); setUsersPage(1); }}
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <select
                value={usersRoleFilter}
                onChange={(e) => { setUsersRoleFilter(e.target.value); setUsersPage(1); }}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                <option value="">All Roles</option>
                <option value="LANDLORD">Landlord</option>
                <option value="TENANT">Tenant</option>
                <option value="PRO">Pro</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
              <select
                value={usersTierFilter}
                onChange={(e) => { setUsersTierFilter(e.target.value); setUsersPage(1); }}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                <option value="">All Tiers</option>
                <option value="FREE">Free</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>

            {/* Users Table */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              {loadingUsers ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">User</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Tier</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Joined</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-750">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-white">{user.name || 'No name'}</p>
                            <p className="text-sm text-gray-400">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getTierBadgeColor(user.subscriptionTier)}`}>
                            {user.subscriptionTier}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(user.subscriptionStatus)}`}>
                            {user.subscriptionStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setEditUserForm({
                                role: user.role,
                                tier: user.subscriptionTier,
                                status: user.subscriptionStatus,
                              });
                            }}
                            className="p-2 text-gray-400 hover:text-purple-400"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-700">
                <p className="text-sm text-gray-400">
                  Page {usersPage} of {usersTotalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                    disabled={usersPage === 1}
                    className="p-2 bg-gray-600 rounded disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setUsersPage(p => Math.min(usersTotalPages, p + 1))}
                    disabled={usersPage === usersTotalPages}
                    className="p-2 bg-gray-600 rounded disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features Tab */}
        {activeTab === 'features' && (
          <div className="space-y-6">
            {loadingFeatures ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
              </div>
            ) : (
              <div className="grid gap-4">
                {features.map((feature) => (
                  <div key={feature.id} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-white">{feature.name}</h3>
                          <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-400">{feature.key}</span>
                          {feature.category && (
                            <span className={`px-2 py-0.5 rounded text-xs ${getCategoryColor(feature.category)}`}>
                              {feature.category}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mb-4">{feature.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {/* Global Toggle */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleFeature(feature.id, 'isEnabled', !feature.isEnabled)}
                              className={`w-10 h-6 rounded-full transition-colors ${feature.isEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full transition-transform ml-1 ${feature.isEnabled ? 'translate-x-4' : ''}`} />
                            </button>
                            <span className="text-sm text-gray-300">Enabled</span>
                          </div>

                          {/* Tier Toggles */}
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={feature.enabledForFree}
                              onChange={(e) => toggleFeature(feature.id, 'enabledForFree', e.target.checked)}
                              className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                            />
                            <span className="text-sm text-gray-300">Free</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={feature.enabledForPro}
                              onChange={(e) => toggleFeature(feature.id, 'enabledForPro', e.target.checked)}
                              className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                            />
                            <span className="text-sm text-gray-300">Pro</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={feature.enabledForEnterprise}
                              onChange={(e) => toggleFeature(feature.id, 'enabledForEnterprise', e.target.checked)}
                              className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                            />
                            <span className="text-sm text-gray-300">Enterprise</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-700">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={feature.enabledForLandlords}
                              onChange={(e) => toggleFeature(feature.id, 'enabledForLandlords', e.target.checked)}
                              className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                            />
                            <span className="text-sm text-gray-300">Landlords</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={feature.enabledForTenants}
                              onChange={(e) => toggleFeature(feature.id, 'enabledForTenants', e.target.checked)}
                              className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                            />
                            <span className="text-sm text-gray-300">Tenants</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={feature.enabledForPros}
                              onChange={(e) => toggleFeature(feature.id, 'enabledForPros', e.target.checked)}
                              className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                            />
                            <span className="text-sm text-gray-300">Pros</span>
                          </div>
                        </div>

                        {/* Limits */}
                        {(feature.freeTierLimit || feature.proTierLimit) && (
                          <div className="mt-4 pt-4 border-t border-gray-700 flex gap-4 text-sm">
                            {feature.freeTierLimit && (
                              <span className="text-gray-400">Free limit: <span className="text-white">{feature.freeTierLimit}</span></span>
                            )}
                            {feature.proTierLimit && (
                              <span className="text-gray-400">Pro limit: <span className="text-white">{feature.proTierLimit}</span></span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Edit User</h2>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">User</p>
                <p className="text-white font-medium">{editingUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select
                  value={editUserForm.role}
                  onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="TENANT">Tenant</option>
                  <option value="LANDLORD">Landlord</option>
                  <option value="PRO">Pro</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subscription Tier</label>
                <select
                  value={editUserForm.tier}
                  onChange={(e) => setEditUserForm({ ...editUserForm, tier: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="FREE">Free</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subscription Status</label>
                <select
                  value={editUserForm.status}
                  onChange={(e) => setEditUserForm({ ...editUserForm, status: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="INACTIVE">Inactive</option>
                  <option value="ACTIVE">Active</option>
                  <option value="TRIALING">Trialing</option>
                  <option value="PAST_DUE">Past Due</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={updateUser}
                  disabled={savingUser}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-600 flex items-center justify-center gap-2"
                >
                  {savingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color = 'purple' }: { title: string; value: number; icon?: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    purple: 'bg-purple-500/20 text-purple-400',
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    orange: 'bg-orange-500/20 text-orange-400',
    pink: 'bg-pink-500/20 text-pink-400',
    gray: 'bg-gray-500/20 text-gray-400',
    indigo: 'bg-indigo-500/20 text-indigo-400',
    teal: 'bg-teal-500/20 text-teal-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{title}</span>
        {icon && <div className={`p-2 rounded ${colors[color]}`}>{icon}</div>}
      </div>
      <p className="text-3xl font-bold text-white">{value.toLocaleString()}</p>
    </div>
  );
}

function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-500/20 text-purple-400',
    ADMIN: 'bg-indigo-500/20 text-indigo-400',
    LANDLORD: 'bg-blue-500/20 text-blue-400',
    TENANT: 'bg-green-500/20 text-green-400',
    PRO: 'bg-orange-500/20 text-orange-400',
  };
  return colors[role] || 'bg-gray-500/20 text-gray-400';
}

function getTierBadgeColor(tier: string): string {
  const colors: Record<string, string> = {
    FREE: 'bg-gray-500/20 text-gray-400',
    PRO: 'bg-blue-500/20 text-blue-400',
    ENTERPRISE: 'bg-purple-500/20 text-purple-400',
  };
  return colors[tier] || 'bg-gray-500/20 text-gray-400';
}

function getStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-500/20 text-green-400',
    INACTIVE: 'bg-gray-500/20 text-gray-400',
    TRIALING: 'bg-blue-500/20 text-blue-400',
    PAST_DUE: 'bg-orange-500/20 text-orange-400',
    CANCELLED: 'bg-red-500/20 text-red-400',
  };
  return colors[status] || 'bg-gray-500/20 text-gray-400';
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    CORE: 'bg-blue-500/20 text-blue-400',
    PREMIUM: 'bg-purple-500/20 text-purple-400',
    ENTERPRISE: 'bg-yellow-500/20 text-yellow-400',
    BETA: 'bg-orange-500/20 text-orange-400',
  };
  return colors[category] || 'bg-gray-500/20 text-gray-400';
}
