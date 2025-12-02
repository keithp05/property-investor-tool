'use client';

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, AlertTriangle, Edit3 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/users?page=1&limit=20');
      const text = await response.text();
      
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setError(`Invalid JSON response: ${text.substring(0, 200)}`);
        setUsers([]);
        setLoading(false);
        return;
      }
      
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Users</h1>
        <p className="text-gray-400">Manage platform users</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-400 mb-1">Error Loading Users</h3>
              <p className="text-gray-300 text-sm mb-3 font-mono break-all">{error}</p>
              <button
                onClick={loadUsers}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
            <p className="text-gray-400 mt-2">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400">{error ? 'Failed to load users' : 'No users found'}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{user.name || 'No name'}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
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
