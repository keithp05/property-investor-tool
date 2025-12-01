'use client';

import { useEffect, useState } from 'react';
import { 
  Plus, Search, Loader2, X, Check, Shield, ShieldCheck,
  UserCog, Ban, CheckCircle, Eye, EyeOff, Key
} from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  loginCount: number;
  createdAt: string;
  createdBy: string | null;
}

export default function AdminAccountsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'SUPPORT',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit modal
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ role: '', isActive: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, []);

  async function loadAdmins() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/admins');
      const data = await response.json();
      
      if (data.success) {
        setAdmins(data.admins);
      }
    } catch (err) {
      console.error('Failed to load admins:', err);
    } finally {
      setLoading(false);
    }
  }

  async function createAdmin() {
    setCreateError('');
    setCreating(true);

    try {
      const response = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowCreate(false);
        setCreateForm({ email: '', password: '', name: '', role: 'SUPPORT' });
        loadAdmins();
      } else {
        setCreateError(data.error || 'Failed to create admin');
      }
    } catch (err) {
      setCreateError('An error occurred');
    } finally {
      setCreating(false);
    }
  }

  async function updateAdmin() {
    if (!editingAdmin) return;
    setSaving(true);

    try {
      const response = await fetch('/api/admin/admins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: editingAdmin.id,
          ...editForm,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEditingAdmin(null);
        loadAdmins();
      } else {
        alert('Failed to update admin: ' + data.error);
      }
    } catch (err) {
      console.error('Failed to update admin:', err);
    } finally {
      setSaving(false);
    }
  }

  const filteredAdmins = admins.filter(admin =>
    admin.email.toLowerCase().includes(search.toLowerCase()) ||
    admin.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Accounts</h1>
          <p className="text-gray-400">Manage administrator access to the portal</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Admin
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search admins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Admin List */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-12 text-center">
            <UserCog className="h-12 w-12 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No admin accounts found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Admin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">MFA</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Activity</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredAdmins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                        {admin.role === 'SUPER_ADMIN' ? (
                          <ShieldCheck className="h-4 w-4 text-purple-400" />
                        ) : (
                          <span className="text-sm font-medium text-gray-300">
                            {admin.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white">{admin.name}</p>
                        <p className="text-xs text-gray-500">{admin.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={admin.role} />
                  </td>
                  <td className="px-4 py-3">
                    {admin.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                        <Ban className="h-3 w-3" />
                        Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {admin.mfaEnabled ? (
                      <span className="text-xs text-green-400">Enabled</span>
                    ) : (
                      <span className="text-xs text-gray-500">Disabled</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {admin.lastLoginAt ? (
                        <p className="text-xs text-gray-400">
                          Last login: {new Date(admin.lastLoginAt).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">Never logged in</p>
                      )}
                      <p className="text-xs text-gray-500">{admin.loginCount} logins</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setEditingAdmin(admin);
                        setEditForm({ role: admin.role, isActive: admin.isActive });
                      }}
                      className="p-2 text-gray-400 hover:text-purple-400 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <UserCog className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Admin Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Create Admin Account</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  placeholder="Admin Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  placeholder="admin@rentaliq.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white pr-10"
                    placeholder="Min 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="SUPPORT">Support (View + Suspend)</option>
                  <option value="BILLING">Billing (Subscriptions)</option>
                  <option value="ADMIN">Admin (Full Access)</option>
                  <option value="SUPER_ADMIN">Super Admin (Can Create Admins)</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createAdmin}
                disabled={creating || !createForm.email || !createForm.password || !createForm.name}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Edit Admin</h2>
              <button onClick={() => setEditingAdmin(null)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-white font-medium">{editingAdmin.name}</p>
                <p className="text-sm text-gray-400">{editingAdmin.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="SUPPORT">Support</option>
                  <option value="BILLING">Billing</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>

              <div className="p-4 bg-gray-800 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-300">Account Active</span>
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => setEditingAdmin(null)}
                className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={updateAdmin}
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

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, { bg: string; text: string; icon?: any }> = {
    SUPER_ADMIN: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: ShieldCheck },
    ADMIN: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Shield },
    SUPPORT: { bg: 'bg-green-500/20', text: 'text-green-400' },
    BILLING: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  };
  
  const style = styles[role] || { bg: 'bg-gray-500/20', text: 'text-gray-400' };
  const Icon = style.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {role.replace('_', ' ')}
    </span>
  );
}
