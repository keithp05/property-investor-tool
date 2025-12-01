'use client';

import { useEffect, useState } from 'react';
import { Activity, Loader2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: any;
  createdAt: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [availableActions, setAvailableActions] = useState<{ action: string; count: number }[]>([]);

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter]);

  async function loadLogs() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(actionFilter && { action: actionFilter }),
      });
      
      const response = await fetch(`/api/admin/logs?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs);
        setTotalPages(data.pagination.totalPages);
        setAvailableActions(data.actions);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Audit Logs</h1>
          <p className="text-gray-400">Track all admin actions on the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            <option value="">All Actions</option>
            {availableActions.map((a) => (
              <option key={a.action} value={a.action}>
                {a.action.replace(/_/g, ' ')} ({a.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No audit logs found</p>
            <p className="text-sm text-gray-600">Admin actions will appear here</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Admin</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Target</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-white">{log.adminEmail}</p>
                    </td>
                    <td className="px-6 py-4">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {log.targetType && (
                        <span>
                          {log.targetType}
                          {log.targetId && <span className="text-gray-600 ml-1">#{log.targetId.slice(0, 8)}</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
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
        )}
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const getColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) return 'bg-green-500/20 text-green-400';
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'bg-red-500/20 text-red-400';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-blue-500/20 text-blue-400';
    if (action.includes('SUPER_ADMIN')) return 'bg-purple-500/20 text-purple-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getColor(action)}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}
