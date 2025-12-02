'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, Shield, RefreshCw } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export default function AdminAccountsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAdmins();
  }, []);

  async function loadAdmins() {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/admins');
      const text = await response.text();
      
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setError(`Invalid JSON: ${text.substring(0, 200)}`);
        setAdmins([]);
        setLoading(false);
        return;
      }
      
      if (data.success && Array.isArray(data.admins)) {
        setAdmins(data.admins);
      } else {
        setError(data.error || data.message || 'API not available');
        setAdmins([]);
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Accounts</h1>
        <p className="text-gray-400">Manage administrator access</p>
      </div>

      {error && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-400 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-400 mb-1">Admin API Not Available</h3>
              <p className="text-gray-300 text-sm mb-3">{error}</p>
              <p className="text-gray-500 text-xs">This feature requires database migration.</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
          </div>
        ) : admins.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No admin accounts found</p>
            <p className="text-gray-500 text-sm mt-2">Admin management requires database setup.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Admin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{admin.name}</p>
                    <p className="text-xs text-gray-500">{admin.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                      {admin.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {new Date(admin.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
