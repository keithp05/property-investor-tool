'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Loader2, ChevronLeft, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react';

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
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [page]);

  async function loadLogs() {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });
      
      const response = await fetch(`/api/admin/logs?${params}`);
      
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs || []);
        setTotalPages(data.pagination?.totalPages || 1);
        if (data.message) {
          setMessage(data.message);
        }
      } else {
        setError(data.error || 'Failed to load logs');
        setLogs([]);
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Audit Logs</h1>
        <p className="text-gray-400">Track all admin actions on the platform</p>
      </div>

      {/* Message (e.g., table not migrated) */}
      {message && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-4 mb-6">
          <p className="text-yellow-400 text-sm">{message}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-1">Error</h3>
              <p className="text-gray-300 text-sm mb-3">{error}</p>
              <button
                onClick={loadLogs}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

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
            <p className="text-sm text-gray-600 mt-2">Admin actions will appear here once the database is migrated.</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Time</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Admin</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Action</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-800/30">
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">{log.adminEmail}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {log.targetType || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-50"
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
