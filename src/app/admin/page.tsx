'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Building2, FileText, Crown, 
  TrendingUp, Loader2, AlertTriangle
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

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const response = await fetch('/api/admin/stats');
      
      if (response.status === 401) {
        // Not authenticated, redirect to login
        router.push('/admin/login');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-white mb-2">Failed to load dashboard</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Platform overview and key metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Users"
          value={stats?.users.total || 0}
          change={stats?.users.recentSignups || 0}
          changeLabel="new this month"
          icon={<Users className="h-6 w-6" />}
          color="purple"
        />
        <MetricCard
          title="Properties"
          value={stats?.platform.totalProperties || 0}
          icon={<Building2 className="h-6 w-6" />}
          color="blue"
        />
        <MetricCard
          title="Applications"
          value={stats?.platform.totalApplications || 0}
          icon={<FileText className="h-6 w-6" />}
          color="green"
        />
        <MetricCard
          title="Active Subscriptions"
          value={stats?.subscriptions.active || 0}
          icon={<Crown className="h-6 w-6" />}
          color="yellow"
        />
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by Role */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Users by Role</h2>
          <div className="space-y-4">
            <StatRow 
              label="Landlords" 
              value={stats?.users.landlords || 0} 
              total={stats?.users.total || 1}
              color="bg-blue-500"
            />
            <StatRow 
              label="Tenants" 
              value={stats?.users.tenants || 0} 
              total={stats?.users.total || 1}
              color="bg-green-500"
            />
            <StatRow 
              label="Service Pros" 
              value={stats?.users.pros || 0} 
              total={stats?.users.total || 1}
              color="bg-orange-500"
            />
          </div>
        </div>

        {/* Subscriptions by Tier */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Subscriptions by Tier</h2>
          <div className="space-y-4">
            <StatRow 
              label="Free" 
              value={stats?.subscriptions.free || 0} 
              total={stats?.users.total || 1}
              color="bg-gray-500"
            />
            <StatRow 
              label="Pro" 
              value={stats?.subscriptions.pro || 0} 
              total={stats?.users.total || 1}
              color="bg-blue-500"
            />
            <StatRow 
              label="Enterprise" 
              value={stats?.subscriptions.enterprise || 0} 
              total={stats?.users.total || 1}
              color="bg-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction href="/admin/users" label="Manage Users" icon={<Users className="h-5 w-5" />} />
          <QuickAction href="/admin/features" label="Feature Flags" icon={<TrendingUp className="h-5 w-5" />} />
          <QuickAction href="/admin/subscriptions" label="Subscriptions" icon={<Crown className="h-5 w-5" />} />
          <QuickAction href="/admin/logs" label="Audit Logs" icon={<FileText className="h-5 w-5" />} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  change, 
  changeLabel, 
  icon, 
  color 
}: { 
  title: string; 
  value: number; 
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode; 
  color: string;
}) {
  const colors: Record<string, { bg: string; text: string; iconBg: string }> = {
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', iconBg: 'bg-purple-500/20' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', iconBg: 'bg-blue-500/20' },
    green: { bg: 'bg-green-500/10', text: 'text-green-400', iconBg: 'bg-green-500/20' },
    yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', iconBg: 'bg-yellow-500/20' },
  };

  const c = colors[color] || colors.purple;

  return (
    <div className={`${c.bg} rounded-xl border border-gray-800 p-6`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400 text-sm font-medium">{title}</span>
        <div className={`${c.iconBg} ${c.text} p-2 rounded-lg`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value.toLocaleString()}</p>
      {change !== undefined && (
        <p className="text-sm text-gray-500">
          <span className="text-green-400">+{change}</span> {changeLabel}
        </p>
      )}
    </div>
  );
}

function StatRow({ 
  label, 
  value, 
  total, 
  color 
}: { 
  label: string; 
  value: number; 
  total: number; 
  color: string;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{label}</span>
        <span className="text-white font-medium">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function QuickAction({ 
  href, 
  label, 
  icon 
}: { 
  href: string; 
  label: string; 
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-4 py-3 bg-gray-800 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-all"
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </a>
  );
}
