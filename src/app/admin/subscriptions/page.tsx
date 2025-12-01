'use client';

import { useEffect, useState } from 'react';
import { Crown, Users, TrendingUp, Loader2 } from 'lucide-react';

interface SubscriptionStats {
  total: number;
  active: number;
  free: number;
  pro: number;
  enterprise: number;
}

export default function SubscriptionsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats({
          total: data.stats.users.total,
          active: data.stats.subscriptions.active,
          free: data.stats.subscriptions.free,
          pro: data.stats.subscriptions.pro,
          enterprise: data.stats.subscriptions.enterprise,
        });
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Subscriptions</h1>
        <p className="text-gray-400">Subscription tiers and revenue overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Users" value={stats?.total || 0} icon={<Users className="h-6 w-6" />} color="purple" />
        <StatCard title="Active Subscriptions" value={stats?.active || 0} icon={<Crown className="h-6 w-6" />} color="green" />
        <StatCard title="Pro Subscribers" value={stats?.pro || 0} icon={<TrendingUp className="h-6 w-6" />} color="blue" />
        <StatCard title="Enterprise" value={stats?.enterprise || 0} icon={<Crown className="h-6 w-6" />} color="yellow" />
      </div>

      {/* Tier Breakdown */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-6">Subscription Breakdown</h2>
        <div className="space-y-6">
          <TierRow label="Free" count={stats?.free || 0} total={stats?.total || 1} color="bg-gray-500" />
          <TierRow label="Pro" count={stats?.pro || 0} total={stats?.total || 1} color="bg-blue-500" price="$29/mo" />
          <TierRow label="Enterprise" count={stats?.enterprise || 0} total={stats?.total || 1} color="bg-purple-500" price="$99/mo" />
        </div>
      </div>

      {/* Pricing Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PricingCard
          tier="FREE"
          price="$0"
          features={['2 Properties', '10 Documents', 'Basic Dashboard', 'Tenant Applications']}
        />
        <PricingCard
          tier="PRO"
          price="$29"
          featured
          features={['25 Properties', '100 Documents', 'AI Property Analysis', 'Lender Directory', 'Pro Marketplace', 'Plaid Integration']}
        />
        <PricingCard
          tier="ENTERPRISE"
          price="$99"
          features={['Unlimited Properties', 'Unlimited Documents', 'All Pro Features', 'QuickBooks Sync', 'Priority Support', 'Custom Integrations']}
        />
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon, 
  color 
}: { 
  title: string; 
  value: number; 
  icon: React.ReactNode; 
  color: string;
}) {
  const colors: Record<string, string> = {
    purple: 'bg-purple-500/10 text-purple-400',
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400 text-sm">{title}</span>
        <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
      </div>
      <p className="text-3xl font-bold text-white">{value.toLocaleString()}</p>
    </div>
  );
}

function TierRow({ 
  label, 
  count, 
  total, 
  color, 
  price 
}: { 
  label: string; 
  count: number; 
  total: number; 
  color: string;
  price?: string;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-white font-medium">{label}</span>
          {price && <span className="text-gray-500 text-sm">{price}</span>}
        </div>
        <div className="text-right">
          <span className="text-white font-medium">{count.toLocaleString()}</span>
          <span className="text-gray-500 ml-2">({percentage}%)</span>
        </div>
      </div>
      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function PricingCard({ 
  tier, 
  price, 
  features, 
  featured 
}: { 
  tier: string; 
  price: string; 
  features: string[];
  featured?: boolean;
}) {
  return (
    <div className={`bg-gray-900 rounded-xl border p-6 ${featured ? 'border-purple-500' : 'border-gray-800'}`}>
      {featured && (
        <div className="text-xs font-medium text-purple-400 mb-2">MOST POPULAR</div>
      )}
      <h3 className="text-xl font-bold text-white mb-1">{tier}</h3>
      <p className="text-3xl font-bold text-white mb-1">
        {price}
        <span className="text-sm font-normal text-gray-500">/mo</span>
      </p>
      <ul className="mt-6 space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
